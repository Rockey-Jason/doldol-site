import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BPU3bUhYuN_Qih2Hd-8KRoi-aQV6Pjy1Y9-570zUS-5cbIG15jZbMPAgttpAnjqv-4Apa25j74axPTq9T--hIkc";
const SITE_ORIGIN = "https://rockey-jason.github.io";
const SITE_BASE = "/doldol-site/";
const VAPID_SUBJECT = "https://rockey-jason.github.io/doldol-site/";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://rockey-jason.github.io",
  "Access-Control-Allow-Headers": "content-type, x-dori-bank-push-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function getServiceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const mapText = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (mapText) {
    try {
      const map = JSON.parse(mapText);
      if (typeof map.default === "string") return map.default;
      const first = Object.values(map).find((value) => typeof value === "string");
      if (typeof first === "string") return first;
    } catch {
      // Handled by the required-key check below.
    }
  }
  throw new Error("Supabase server key is unavailable.");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("Supabase URL is unavailable.");
    const admin = createClient(supabaseUrl, getServiceKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // The database trigger holds the matching token in Supabase Vault.
    // This endpoint intentionally does not trust any transfer amount/name sent by a caller.
    const suppliedToken = request.headers.get("x-dori-bank-push-token") || "";
    if (suppliedToken.length < 32) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: config, error: configError } = await admin.rpc("dori_bank_get_push_config");
    if (configError || !config?.trigger_token || !config?.vapid_private_key) {
      console.error("Could not load secure Dori Bank push configuration:", configError?.message);
      return json({ ok: false, error: "Push configuration unavailable" }, 500);
    }
    if (suppliedToken !== config.trigger_token) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    let incoming: { transfer_ref?: unknown };
    try {
      incoming = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const transferRef = typeof incoming.transfer_ref === "string" ? incoming.transfer_ref : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transferRef)) {
      return json({ ok: false, error: "Invalid transfer reference" }, 400);
    }

    // Fetch the committed recipient-side transaction from the database.
    // Never use sender name or amount values from the incoming HTTP request.
    let transaction: {
      transaction_ref: string;
      transfer_ref: string;
      account_number: string;
      amount: string | number;
      counterparty_name: string | null;
      created_at: string;
    } | null = null;
    let lastReadError: string | null = null;
    for (let attempt = 0; attempt < 4 && !transaction; attempt++) {
      const result = await admin
        .from("dori_bank_transactions")
        .select("transaction_ref,transfer_ref,account_number,amount,counterparty_name,created_at")
        .eq("transfer_ref", transferRef)
        .eq("tx_type", "transfer_in")
        .eq("direction", "credit")
        .maybeSingle();
      if (result.error) lastReadError = result.error.message;
      if (result.data) transaction = result.data;
      if (!transaction && attempt < 3) await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
    if (lastReadError && !transaction) {
      console.error("Incoming transfer query failed:", lastReadError);
      return json({ ok: false, error: "Unable to verify transfer" }, 500);
    }
    if (!transaction) return json({ ok: false, error: "Incoming transfer not found" }, 404);

    const { data: account, error: accountError } = await admin
      .from("dori_bank_accounts")
      .select("auth_user_id")
      .eq("account_number", transaction.account_number)
      .eq("status", "active")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account?.auth_user_id) return json({ ok: true, sent: 0, reason: "recipient_account_unavailable" });

    const { data: subscriptions, error: subscriptionError } = await admin
      .from("dori_bank_push_subscriptions")
      .select("endpoint,p256dh,auth_key")
      .eq("auth_user_id", account.auth_user_id);
    if (subscriptionError) throw subscriptionError;
    if (!subscriptions?.length) return json({ ok: true, sent: 0, reason: "recipient_has_no_push_subscription" });

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, config.vapid_private_key);
    const senderName = (transaction.counterparty_name || "돌이사이트 사용자").trim().slice(0, 80) || "돌이사이트 사용자";
    const amount = BigInt(String(transaction.amount));
    const amountText = new Intl.NumberFormat("ko-KR").format(amount);
    const targetUrl = new URL(
      `${SITE_BASE}dori-bank.html?transaction=${encodeURIComponent(transaction.transaction_ref)}#transactions`,
      SITE_ORIGIN,
    ).toString();
    const notificationPayload = JSON.stringify({
      title: "돌이 은행 · 송금 도착",
      body: `${senderName}님이 ${amountText} 돌돌코인을 보냈어요.`,
      icon: `${SITE_ORIGIN}${SITE_BASE}rockeysite-icon-3.png`,
      badge: `${SITE_ORIGIN}${SITE_BASE}rockeysite-icon-3.png`,
      tag: `dori-bank-transfer-${transaction.transfer_ref}`,
      renotify: true,
      data: { url: targetUrl, transactionRef: transaction.transaction_ref, transferRef: transaction.transfer_ref },
    });

    let sent = 0;
    let failed = 0;
    let expired = 0;
    await Promise.all(subscriptions.map(async (subscription: { endpoint: string; p256dh: string; auth_key: string }) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      };
      try {
        await webpush.sendNotification(pushSubscription, notificationPayload, { TTL: 60 * 60 * 24 });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          expired += 1;
          await admin.from("dori_bank_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        }
        console.warn("Dori Bank push delivery failed:", statusCode || "unknown", String((error as Error)?.message || error).slice(0, 180));
      }
    }));

    return json({ ok: true, sent, failed, expired });
  } catch (error) {
    console.error("Dori Bank push delivery error:", (error as Error)?.message || error);
    return json({ ok: false, error: "Push delivery failed" }, 500);
  }
});
