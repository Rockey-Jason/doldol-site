import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";

const supabasePromise = Promise.resolve(
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
);

const missionIcons = {
  visit_site: "🏠",
  play_chess: "♟️",
  play_card_war: "🃏",
  open_randombox: "🎁"
};

const missionDestinations = {
  visit_site: { href: "index.html", label: "메인 페이지로 이동" },
  play_chess: { href: "https://rockey-jason.github.io/rockey-chess/", label: "체스 하러 가기" },
  play_card_war: { href: "https://rockey-jason.github.io/rockeywar-card/", label: "돌이전쟁: 카드 열기" },
  open_randombox: { href: "Randombox.html", label: "랜덤 박스 열기" }
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

export async function completeDailyMission(key) {
  try {
    const supabase = await supabasePromise;
    const { data, error } = await supabase.rpc("complete_daily_mission", {
      p_mission_key: key
    });

    if (error) {
      console.error("일일 미션 완료 오류:", error);
      return null;
    }

    window.dispatchEvent(
      new CustomEvent("dori:daily-mission-completed", { detail: data })
    );
    return data;
  } catch (error) {
    console.error("일일 미션 완료 예외:", error);
    return null;
  }
}

export async function claimDailyMissionReward(key) {
  try {
    const supabase = await supabasePromise;
    const { data, error } = await supabase.rpc("claim_daily_mission_reward", {
      p_mission_key: key
    });

    if (error) {
      console.error("일일 미션 보상 수령 오류:", error);
      return null;
    }

    window.dispatchEvent(
      new CustomEvent("dori:daily-mission-reward-claimed", { detail: data })
    );
    return data;
  } catch (error) {
    console.error("일일 미션 보상 수령 예외:", error);
    return null;
  }
}

window.doriCompleteDailyMission = completeDailyMission;
window.doriClaimDailyMissionReward = claimDailyMissionReward;

async function completeVisitMissionImmediately() {
  try {
    const supabase = await supabasePromise;
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData?.session) {
      await completeDailyMission("visit_site");
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.setTimeout(() => {
          completeDailyMission("visit_site");
        }, 0);
      }
    });
  } catch (error) {
    console.error("접속 미션 자동 달성 오류:", error);
  }
}

async function load() {
  const container = document.getElementById("missions");
  if (!container) return;

  try {
    const supabase = await supabasePromise;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      container.innerHTML =
        '<div style="padding:45px;text-align:center;color:#aeb5cf">일일 미션은 로그인 후 이용할 수 있습니다.<br><br><a class="back" href="login.html">로그인하기</a></div>';
      return;
    }

    const { data: boostUser, error: boostError } = await supabase
      .from("users")
      .select("doldolcoin_multiplier, doldolcoin_multiplier_expires_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const boostExpiry = boostUser?.doldolcoin_multiplier_expires_at
      ? new Date(boostUser.doldolcoin_multiplier_expires_at)
      : null;
    const boostActive = !boostError && boostExpiry && boostExpiry.getTime() > Date.now();
    const activeMultiplier = boostActive
      ? Math.max(1, Number(boostUser.doldolcoin_multiplier) || 1)
      : 1;

    const { data: definitions, error: definitionsError } = await supabase
      .from("daily_mission_definitions")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    const { data: rows, error: rowsError } = await supabase
      .from("user_daily_missions")
      .select("mission_key, completed_at, reward_claimed")
      .eq("user_id", session.user.id)
      .eq("mission_date", today());

    if (definitionsError || rowsError) {
      console.error(definitionsError || rowsError);
      container.innerHTML = '<div class="mission-error" role="alert">오늘의 미션을 불러오지 못했어요.<br>연결 상태를 확인한 뒤 다시 시도해 주세요.<br><button type="button" class="mission-retry">다시 시도</button></div>';
      const retry = container.querySelector(".mission-retry");
      if (retry) retry.addEventListener("click", () => {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:#aeb5cf" role="status">미션을 다시 불러오는 중…</div>';
        load();
      }, { once: true });
      return;
    }

    const map = new Map((rows || []).map((row) => [row.mission_key, row]));
    const missions = (definitions || []).filter(
      (mission) => mission.mission_key !== "all_complete"
    );

    const completedCount = missions.filter(
      (mission) => map.get(mission.mission_key)?.completed_at
    ).length;

    const percent = missions.length
      ? Math.round((completedCount / missions.length) * 100)
      : 0;

    const progressText = document.getElementById("progressText");
    const percentText = document.getElementById("percent");
    const ring = document.getElementById("ring");

    if (progressText) {
      progressText.textContent =
        completedCount + " / " + missions.length + " 미션 완료";
    }

    if (percentText) percentText.textContent = percent + "%";
    if (ring) ring.style.setProperty("--p", percent);

    const boostBanner = activeMultiplier > 1
      ? '<div role="status" style="margin:0 0 16px;padding:14px 16px;border:1px solid rgba(94,221,255,.42);border-radius:16px;background:linear-gradient(120deg,rgba(20,96,145,.24),rgba(19,36,83,.65));color:#eafaff;box-shadow:0 0 24px rgba(45,190,255,.10)"><strong style="display:block;font-size:15px">⚡ 돌돌코인 ' + activeMultiplier + '배 버프 활성화</strong><span style="display:block;margin-top:5px;font-size:12px;color:#b8d7ef">일일 미션 보상도 ' + activeMultiplier + '배로 지급됩니다 · 종료: ' + boostExpiry.toLocaleString("ko-KR") + '</span></div>'
      : '';

    container.innerHTML = boostBanner + missions
      .map((mission) => {
        const row = map.get(mission.mission_key);
        const completed = !!row?.completed_at;
        const claimed = !!row?.reward_claimed;
        const destination = !completed && !claimed ? missionDestinations[mission.mission_key] : null;
        const shortcutHtml = destination
          ? '<a class="mission-shortcut" href="' + destination.href + '" aria-label="' + destination.label + '"><span>바로 가기</span><span aria-hidden="true">↗</span></a>'
          : '';

        return (
          '<article class="mission ' +
          (completed ? "done" : "") +
          '">' +
          '<div class="icon">' +
          (missionIcons[mission.mission_key] || "🎯") +
          "</div>" +
          "<div>" +
          '<div class="name">' +
          (mission.title || "일일 미션") +
          "</div>" +
          '<div class="desc">' +
          (mission.description || "") +
          "</div>" +
          '<span class="state">' +
          (claimed
            ? "보상 수령 완료"
            : completed
              ? "완료됨 · 보상 받기"
              : "오늘 아직 완료되지 않았습니다.") +
          "</span>" +
          shortcutHtml +
          "</div>" +
          '<div class="reward">+' +
          Math.floor(Number(mission.reward_coins || 0) * activeMultiplier).toLocaleString() +
          ' 🪙' +
          (activeMultiplier > 1 ? '<small style="display:block;margin-top:3px;color:#8ee9ff;font-size:11px;font-weight:800">⚡ 버프 추가 +' + Math.floor(Number(mission.reward_coins || 0) * (activeMultiplier - 1)).toLocaleString() + ' (' + activeMultiplier + '배)</small>' : '') +
          ' <span class="check">' +
          (claimed ? "✓" : "") +
          "</span></div>" +
          "</article>"
        );
      })
      .join("");
  } catch (error) {
    console.error("일일 미션 불러오기 오류:", error);
    container.innerHTML = '<div class="mission-error" role="alert">미션 정보를 불러오는 중 문제가 발생했어요.<br>잠시 후 다시 시도해 주세요.<br><button type="button" class="mission-retry">다시 시도</button></div>';
    const retry = container.querySelector(".mission-retry");
    if (retry) retry.addEventListener("click", () => {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:#aeb5cf" role="status">미션을 다시 불러오는 중…</div>';
      load();
    }, { once: true });
  }
}

completeVisitMissionImmediately();

if (document.getElementById("missions")) {
  load();
}
