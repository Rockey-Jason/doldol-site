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

    container.innerHTML = missions
      .map((mission) => {
        const row = map.get(mission.mission_key);
        const completed = !!row?.completed_at;
        const claimed = !!row?.reward_claimed;

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
          "</div>" +
          '<div class="reward">+' +
          Number(mission.reward_coins || 0).toLocaleString() +
          ' 🪙 <span class="check">' +
          (claimed ? "✓" : "") +
          "</span></div>" +
          "</article>"
        );
      })
      .join("");
  } catch (error) {
    console.error("일일 미션 불러오기 오류:", error);
  }
}

completeVisitMissionImmediately();

if (document.getElementById("missions")) {
  load();
}
