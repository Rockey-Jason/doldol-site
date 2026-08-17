import { supabase } from "./supabase.js";

/**
 * EXP 시스템
 *
 * 레벨 기준:
 * Lv.1 = 0 EXP
 * Lv.2 = 100 EXP
 * Lv.3 = 300 EXP
 * Lv.4 = 600 EXP
 * Lv.5 = 1000 EXP
 *
 * 필요 EXP:
 * 레벨 * 100
 */

export function getRequiredExp(level) {
    return level * 100;
}


/**
 * 현재 EXP를 기준으로 레벨 계산
 */
export function calculateLevel(exp) {
    let level = 1;
    let requiredExp = getRequiredExp(level);

    while (exp >= requiredExp) {
        exp -= requiredExp;
        level++;
        requiredExp = getRequiredExp(level);
    }

    return level;
}


/**
 * 현재 레벨에서 다음 레벨까지 필요한 EXP 정보
 */
export function getLevelInfo(exp) {
    let level = 1;
    let remainingExp = exp;

    while (remainingExp >= getRequiredExp(level)) {
        remainingExp -= getRequiredExp(level);
        level++;
    }

    const requiredExp = getRequiredExp(level);

    const progress = Math.min(
        (remainingExp / requiredExp) * 100,
        100
    );

    return {
        level,
        currentExp: remainingExp,
        requiredExp,
        progress,
        totalExp: exp
    };
}


/**
 * 현재 로그인한 사용자에게 EXP 지급
 */
export async function addExp(amount) {
    if (!amount || amount <= 0) {
        return {
            success: false,
            error: "EXP는 0보다 커야 합니다."
        };
    }

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            success: false,
            error: "로그인한 사용자가 없습니다."
        };
    }

    // 현재 EXP 가져오기
    const { data, error: fetchError } = await supabase
        .from("users")
        .select("exp")
        .eq("id", user.id)
        .single();

    if (fetchError) {
        console.error("EXP 조회 실패:", fetchError);

        return {
            success: false,
            error: fetchError
        };
    }

    const oldExp = data.exp ?? 0;
    const oldLevel = calculateLevel(oldExp);

    const newExp = oldExp + amount;
    const newLevel = calculateLevel(newExp);

    // DB 업데이트
    const { error: updateError } = await supabase
        .from("users")
        .update({
            exp: newExp
        })
        .eq("id", user.id);

    if (updateError) {
        console.error("EXP 저장 실패:", updateError);

        return {
            success: false,
            error: updateError
        };
    }

    return {
        success: true,
        oldExp,
        newExp,
        gainedExp: amount,
        oldLevel,
        newLevel,
        levelUp: newLevel > oldLevel
    };
}


/**
 * 현재 사용자의 EXP 정보 가져오기
 */
export async function getMyExp() {
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data, error } = await supabase
        .from("users")
        .select("exp")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("EXP 정보 조회 실패:", error);
        return null;
    }

    return getLevelInfo(data.exp ?? 0);
}
