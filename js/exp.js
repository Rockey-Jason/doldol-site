import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    "https://scttowfhygcpdirrekqm.supabase.co",
    "여기에 현재 사용중인 anon key"
);


// ================================
// 레벨별 필요 EXP
// ================================

export const 레벨필요경험치 = {
    1: 0,
    2: 100,
    3: 300,
    4: 600,
    5: 1000,
    6: 1500,
    7: 2100,
    8: 2800,
    9: 3600,
    10: 4500
};


// ================================
// 레벨 이름
// ================================

export const 레벨이름 = {

    1: "일반",
    2: "프리미엄",
    3: "돌프리미엄",
    4: "돌돌프리미엄",
    5: "돌돌돌프리미엄",
    6: "돌돌돌돌프리미엄",
    7: "돌돌돌돌돌프리미엄",
    8: "유사돌이",
    9: "돌이",
    10: "관리자"

};


// ================================
// EXP → 레벨
// ================================

export function 경험치로레벨계산(exp) {

    let level = 1;

    for (let i = 10; i >= 1; i--) {

        if (exp >= 레벨필요경험치[i]) {

            level = i;

            break;
        }
    }

    return level;
}


// ================================
// 내 EXP 가져오기
// ================================

export async function getMyExp() {

    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser();


    if (authError || !user) {

        console.error("로그인 사용자 확인 실패");

        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from("users")

        .select("exp, user_level")

        .eq("user_id", user.id)

        .single();


    if (error) {

        console.error("EXP 조회 오류:", error);

        return null;
    }


    const exp = data.exp ?? 0;


    // 실제 EXP 기준으로 레벨 계산
    const level = 경험치로레벨계산(exp);


    // 현재 레벨 시작 EXP
    const 현재레벨시작EXP =
        레벨필요경험치[level];


    // 다음 레벨
    const 다음레벨 = level + 1;


    // 최고 레벨
    if (level >= 10) {

        return {

            exp,

            level: 10,

            currentExp: exp,

            requiredExp: 레벨필요경험치[10],

            progress: 100,

            nextExp: null

        };
    }


    const 다음레벨EXP =
        레벨필요경험치[다음레벨];


    // 현재 레벨에서 얻은 EXP
    const 현재구간EXP =
        exp - 현재레벨시작EXP;


    // 현재 레벨에서 다음 레벨까지 필요한 EXP
    const 구간필요EXP =
        다음레벨EXP - 현재레벨시작EXP;


    let progress =
        (현재구간EXP / 구간필요EXP) * 100;


    progress =
        Math.max(0, Math.min(100, progress));


    return {

        exp,

        level,

        currentExp: 현재구간EXP,

        requiredExp: 구간필요EXP,

        progress,

        nextExp: 다음레벨EXP

    };
}


// ================================
// EXP 지급
// ================================

export async function addExp(amount) {

    if (!amount || amount <= 0) {
        return null;
    }


    const {
        data: { user }
    } = await supabase.auth.getUser();


    if (!user) {
        return null;
    }


    const {
        data,
        error
    } = await supabase

        .from("users")

        .select("exp, user_level")

        .eq("user_id", user.id)

        .single();


    if (error) {

        console.error(error);

        return null;
    }


    const 기존EXP =
        data.exp ?? 0;


    const 기존레벨 =
        data.user_level ?? 1;


    const 새로운EXP =
        기존EXP + amount;


    const 새로운레벨 =
        경험치로레벨계산(새로운EXP);


    const {
        error: updateError
    } = await supabase

        .from("users")

        .update({

            exp: 새로운EXP,

            user_level: 새로운레벨

        })

        .eq("user_id", user.id);


    if (updateError) {

        console.error(
            "EXP 저장 오류:",
            updateError
        );

        return null;
    }


    return {

        oldExp: 기존EXP,

        newExp: 새로운EXP,

        oldLevel: 기존레벨,

        newLevel: 새로운레벨,

        levelUp:
            새로운레벨 > 기존레벨

    };
}
