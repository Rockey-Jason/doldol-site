/* DORI CLOUD SYNC — account-scoped server storage for every Dori Site page.
   localStorage is a device cache; Supabase is the source of truth.
   Supabase Auth tokens and session-only storage are never synchronized. */
(() => {
  "use strict";
  if (window.__DORI_CLOUD_SYNC__) return;
  window.__DORI_CLOUD_SYNC__ = true;

  const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
  const TABLE = "dori_cloud_storage";
  const OWNER_KEY = "__dori_cloud_sync_owner_v1";
  const META_PREFIX = "__dori_cloud_sync_meta_v1:";
  const MAX_VALUE_BYTES = 1024 * 1024;
  const native = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key
  };
  let client = null;
  let currentUserId = null;
  let applyingRemote = false;
  let syncing = false;
  let syncAgain = false;
  let syncTimer = null;
  let statusNode = null;
  let meta = { dirty: [], managed: [], initialized: false };
  const pending = new Map();

  const eligible = key => {
    const k = String(key || "");
    if (!k || k.length > 512) return false;
    if (k === OWNER_KEY || k.startsWith(META_PREFIX) || k.startsWith("__dori_cloud_sync")) return false;
    if (/^(sb-|supabase\.)/i.test(k) || /auth-token|access_token|refresh_token/i.test(k)) return false;
    return true;
  };
  const getMetaKey = uid => META_PREFIX + uid;
  const readMeta = uid => {
    try {
      const raw = native.get.call(localStorage, getMetaKey(uid));
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object"
        ? { dirty: Array.isArray(parsed.dirty) ? parsed.dirty : [], managed: Array.isArray(parsed.managed) ? parsed.managed : [], initialized: parsed.initialized === true }
        : { dirty: [], managed: [], initialized: false };
    } catch (_) { return { dirty: [], managed: [], initialized: false }; }
  };
  const writeMeta = () => {
    if (!currentUserId) return;
    try { native.set.call(localStorage, getMetaKey(currentUserId), JSON.stringify(meta)); } catch (_) {}
  };
  const showStatus = (message, state) => {
    if (!document.documentElement) return;
    if (!statusNode) {
      statusNode = document.createElement("div");
      statusNode.id = "dori-cloud-sync-status";
      statusNode.setAttribute("role", "status");
      statusNode.setAttribute("aria-live", "polite");
      statusNode.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2147483646;padding:8px 12px;border:1px solid rgba(226,190,105,.24);border-radius:999px;background:rgba(5,13,31,.92);color:#e9d39a;font:12px/1.3 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.24);backdrop-filter:blur(12px);pointer-events:none;opacity:0;transition:opacity .2s";
      (document.body || document.documentElement).appendChild(statusNode);
    }
    statusNode.textContent = message;
    statusNode.style.color = state === "error" ? "#ffaaaa" : state === "ok" ? "#9de7c1" : "#e9d39a";
    statusNode.style.opacity = "1";
    if (state === "ok") setTimeout(() => { if (statusNode) statusNode.style.opacity = "0"; }, 2200);
  };
  const listLocalKeys = () => {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = native.key.call(localStorage, i);
        if (eligible(key)) keys.push(key);
      }
    } catch (_) {}
    return keys;
  };
  const markDirty = (key, value, deleted) => {
    if (applyingRemote || !eligible(key)) return;
    pending.set(String(key), { value: deleted ? null : String(value), deleted: !!deleted });
    if (currentUserId) {
      if (!meta.dirty.includes(String(key))) meta.dirty.push(String(key));
      if (!meta.managed.includes(String(key))) meta.managed.push(String(key));
      writeMeta();
      scheduleSync();
    }
  };

  // Intercept the normal Web Storage API used by existing pages. Auth tokens are excluded.
  Storage.prototype.setItem = function(key, value) {
    native.set.call(this, key, value);
    if (this === window.localStorage) markDirty(key, value, false);
  };
  Storage.prototype.removeItem = function(key) {
    if (this === window.localStorage) markDirty(key, null, true);
    return native.remove.call(this, key);
  };
  Storage.prototype.clear = function() {
    if (this === window.localStorage) {
      for (const key of listLocalKeys()) markDirty(key, null, true);
    }
    return native.clear.call(this);
  };

  const scheduleSync = () => {
    if (!currentUserId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void syncNow(); }, 900);
  };
  const fetchAll = async uid => {
    const all = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client.from(TABLE)
        .select("storage_key,storage_value,is_deleted,updated_at")
        .eq("user_id", uid)
        .order("storage_key", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return all;
  };
  const toRow = (uid, key, entry) => ({
    user_id: uid,
    storage_key: key,
    storage_value: entry.deleted ? null : entry.value,
    is_deleted: !!entry.deleted
  });
  const uploadEntries = async (uid, entries) => {
    const items = [...entries.entries()];
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100).map(([key, value]) => toRow(uid, key, value));
      const { error } = await client.from(TABLE).upsert(chunk, { onConflict: "user_id,storage_key" });
      if (error) throw error;
      for (const [key, value] of items.slice(i, i + 100)) {
        const latest = pending.get(key);
        if (latest && latest.deleted === value.deleted && latest.value === value.value) pending.delete(key);
        meta.dirty = meta.dirty.filter(item => item !== key);
        if (!meta.managed.includes(key)) meta.managed.push(key);
      }
    }
    writeMeta();
  };
  const applyRemoteRow = row => {
    applyingRemote = true;
    try {
      if (row.is_deleted) native.remove.call(localStorage, row.storage_key);
      else if (typeof row.storage_value === "string") native.set.call(localStorage, row.storage_key, row.storage_value);
      if (!meta.managed.includes(row.storage_key)) meta.managed.push(row.storage_key);
    } finally { applyingRemote = false; }
  };
  const switchAccount = async uid => {
    if (uid === currentUserId) return;
    const previous = currentUserId || native.get.call(localStorage, OWNER_KEY);
    if (previous && previous !== uid) {
      const oldMeta = readMeta(previous);
      applyingRemote = true;
      try { oldMeta.managed.forEach(key => { if (eligible(key)) native.remove.call(localStorage, key); }); }
      finally { applyingRemote = false; }
    }
    currentUserId = uid || null;
    if (!uid) {
      if (previous) {
        const oldMeta = readMeta(previous);
        applyingRemote = true;
        try { oldMeta.managed.forEach(key => { if (eligible(key)) native.remove.call(localStorage, key); }); }
        finally { applyingRemote = false; }
      }
      try { native.remove.call(localStorage, OWNER_KEY); } catch (_) {}
      meta = { dirty: [], managed: [], initialized: false };
      return;
    }
    meta = readMeta(uid);
    // Preserve writes made by page scripts before the first auth lookup completed.
    for (const key of pending.keys()) {
      if (!meta.dirty.includes(key)) meta.dirty.push(key);
      if (!meta.managed.includes(key)) meta.managed.push(key);
    }
    writeMeta();
    try { native.set.call(localStorage, OWNER_KEY, uid); } catch (_) {}
    await syncNow(true);
  };

  async function syncNow(force) {
    if (!currentUserId || !client) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    try {
      showStatus("계정 데이터 동기화 중…", "busy");
      const uid = currentUserId;
      const remoteRows = await fetchAll(uid);
      const remoteMap = new Map(remoteRows.map(row => [row.storage_key, row]));
      const dirty = new Set(meta.dirty);
      const outgoing = new Map();

      // First login for this account: preserve this browser's legacy data once.
      if (!meta.initialized && remoteRows.length === 0) {
        for (const key of listLocalKeys()) {
          const value = native.get.call(localStorage, key);
          if (value !== null && new Blob([value]).size <= MAX_VALUE_BYTES) outgoing.set(key, { value, deleted: false });
        }
      } else {
        // Server wins for clean keys; unsynced local edits win for dirty keys.
        for (const row of remoteRows) {
          if (dirty.has(row.storage_key)) {
            const value = pending.get(row.storage_key) || (native.get.call(localStorage, row.storage_key) === null
              ? { value: null, deleted: true }
              : { value: native.get.call(localStorage, row.storage_key), deleted: false });
            outgoing.set(row.storage_key, value);
          } else {
            applyRemoteRow(row);
          }
        }
        for (const key of listLocalKeys()) {
          if (!remoteMap.has(key)) {
            const value = native.get.call(localStorage, key);
            if (value !== null && new Blob([value]).size <= MAX_VALUE_BYTES) outgoing.set(key, { value, deleted: false });
          }
        }
        for (const key of dirty) {
          if (!outgoing.has(key)) {
            const value = pending.get(key);
            outgoing.set(key, value || (native.get.call(localStorage, key) === null
              ? { value: null, deleted: true }
              : { value: native.get.call(localStorage, key), deleted: false }));
          }
        }
      }
      for (const [key, value] of outgoing) {
        if (!eligible(key) || (!value.deleted && value.value !== null && new Blob([value.value]).size > MAX_VALUE_BYTES)) outgoing.delete(key);
      }
      if (outgoing.size) await uploadEntries(uid, outgoing);
      meta.initialized = true;
      meta.managed = [...new Set([...meta.managed, ...remoteRows.map(row => row.storage_key), ...outgoing.keys()])];
      writeMeta();
      showStatus("모든 기기와 데이터 동기화 완료", "ok");
    } catch (error) {
      console.warn("[Dori Cloud Sync]", error);
      showStatus("클라우드 동기화 대기 중 · 연결을 확인해 주세요", "error");
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; scheduleSync(); }
    }
  }

  async function initialize() {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("Supabase client library is not available");
      }
      client = window.doriSupabase || window.supabaseClient || window.sb ||
        window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      window.doriSupabase = client;
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      if (session?.user?.id) await switchAccount(session.user.id);
      client.auth.onAuthStateChange((event, sessionNow) => {
        queueMicrotask(() => { void switchAccount(sessionNow?.user?.id || null); });
      });
      window.addEventListener("focus", () => { if (currentUserId) void syncNow(); });
      window.addEventListener("online", () => { if (currentUserId) void syncNow(); });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && currentUserId) void syncNow();
      });
      window.addEventListener("pagehide", () => { if (currentUserId) void syncNow(); });
      setInterval(() => { if (currentUserId && document.visibilityState === "visible") void syncNow(); }, 60000);
      window.doriCloudSync = {
        ready: true,
        sync: () => syncNow(true),
        get userId() { return currentUserId; }
      };
      window.dispatchEvent(new CustomEvent("dori:cloud-sync-ready", { detail: { userId: currentUserId } }));
    } catch (error) {
      console.warn("[Dori Cloud Sync] initialization failed:", error);
      showStatus("클라우드 저장을 시작하지 못했어요", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { void initialize(); }, { once: true });
  } else {
    void initialize();
  }
})();