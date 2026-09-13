import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// Gmail
// =====================================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// =====================================================
// 신문 읽기 페이지
// =====================================================
//
// ⚠️ 실제 신문 읽기 페이지 파일명으로 변경
//

const NEWS_PAGE_URL =
  "https://rockey-jason.github.io/doldol-site/rockeynews.html";


// =====================================================
// 회원 등급별 이메일 발송 주기
// =====================================================

const delayMap = {
  1: 7,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
  9: 1,
  10: 1
};


// =====================================================
// 이메일을 보낼 시기인지 확인
// =====================================================

function shouldSend(lastDate, level) {

  const now = new Date();

  // 처음 보내는 경우
  if (!lastDate) {
    return true;
  }

  const last = new Date(lastDate);

  const diff = Math.floor(
    (now - last) /
    (1000 * 60 * 60 * 24)
  );

  const delay =
    delayMap[level] ?? 7;

  return diff >= delay;
}


// =====================================================
// HTML 특수문자 처리
// =====================================================

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// 이메일 보내기
// =====================================================

async function sendEmail(
  to,
  level,
  newsNumber
) {

  // -----------------------------------------------
  // 이 사용자가 읽을 수 있는 신문 번호
  // -----------------------------------------------

  const safeNewsNumber =
    Number(newsNumber);

  // -----------------------------------------------
  // 신문 읽기 페이지
  // -----------------------------------------------

  const newsUrl =
    `${NEWS_PAGE_URL}?news_number=${encodeURIComponent(
      safeNewsNumber
    )}`;


  // -----------------------------------------------
  // 이메일
  // -----------------------------------------------

  await transporter.sendMail({

    from:
      `"돌이사이트" <${process.env.GMAIL_USER}>`,

    to,

    subject:
      `📢 제 ${safeNewsNumber}회 돌이신문이 발행되었습니다!`,

    html: `

<!DOCTYPE html>

<html lang="ko">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

</head>


<body
style="
margin:0;
padding:0;
background:#05051a;
font-family:Arial,'Malgun Gothic',sans-serif;
">


<div
style="
max-width:620px;
margin:0 auto;
padding:30px 20px;
">


<!-- 카드 -->

<div
style="
background:linear-gradient(
145deg,
#11113a,
#07071d
);

border:1px solid rgba(255,255,255,0.12);

border-radius:20px;

padding:35px 28px;

color:white;

box-shadow:
0 20px 50px rgba(0,0,0,0.45);
"
>


<!-- 제목 -->

<h1
style="
margin:0 0 15px;

text-align:center;

font-size:28px;

color:#ffffff;
"
>

📢 돌이신문 발행 알림

</h1>


<!-- 설명 -->

<p
style="
text-align:center;

color:#c8c8df;

font-size:15px;

line-height:1.7;
"
>

새로운 돌이신문을 읽을 수 있습니다!

</p>


<!-- 신문 정보 -->

<div
style="
margin:28px 0;

padding:22px;

border-radius:14px;

background:rgba(255,255,255,0.06);

border:
1px solid
rgba(255,255,255,0.08);
"
>


<div
style="
color:#8e8eaa;

font-size:13px;

margin-bottom:8px;
"
>

이번에 읽을 수 있는 신문

</div>


<div
style="
font-size:27px;

font-weight:bold;

color:#ffffff;

margin-bottom:8px;
"
>

📰 돌이신문
${escapeHtml(safeNewsNumber)}호

</div>


<div
style="
color:#aaaac2;

font-size:13px;
"
>

돌이사이트에서 바로 읽어보세요.

</div>


</div>


<!-- 버튼 -->

<div
style="
text-align:center;

margin-top:30px;
"
>


<a
href="${newsUrl}"

style="
display:inline-block;

padding:15px 30px;

background:
linear-gradient(
135deg,
#4CAF50,
#2E8B57
);

color:white;

text-decoration:none;

border-radius:12px;

font-size:16px;

font-weight:bold;

box-shadow:
0 8px 20px
rgba(76,175,80,0.25);
"
>

📰 ${escapeHtml(safeNewsNumber)}호
신문 보러가기 →

</a>


</div>


<!-- 등급 -->

<div
style="
margin-top:30px;

padding-top:20px;

border-top:
1px solid
rgba(255,255,255,0.08);

text-align:center;

color:#777793;

font-size:12px;
"
>

돌이사이트 회원 Lv.${escapeHtml(level)}

<br>

새로운 돌이신문을 놓치지 마세요! 🐶

</div>


</div>


<!-- Footer -->

<div
style="
text-align:center;

padding:20px;

color:#66667f;

font-size:11px;
"
>

© 돌이사이트

</div>


</div>

</body>

</html>

`
  });
}


// =====================================================
// 메인
// =====================================================

async function run() {

  console.log(
    "🚀 돌이신문 이메일 시스템 시작"
  );


  // ===================================================
  // 사용자 가져오기
  // ===================================================

  const {
    data: users,
    error
  } = await supabase

    .from("users")

    .select(`
      user_id,
      email,
      user_level,
      read_dori_news,
      last_news_sent,
      quiz_right,
      quiz_news_number,
      quiz_answered,
      doldolcoin
    `);


  if (error || !users) {

    console.error(
      "❌ 사용자 조회 실패:",
      error
    );

    return;
  }


  console.log(
    `👥 ${users.length}명의 사용자를 확인했습니다.`
  );


  // ===================================================
  // 사용자별 이메일 발송
  // ===================================================

  for (const user of users) {

    // -----------------------------------------------
    // 이메일이 없는 경우
    // -----------------------------------------------

    if (!user.email) {

      console.log(
        "⚠️ 이메일이 없는 사용자:",
        user.user_id
      );

      continue;
    }


    // -----------------------------------------------
    // 읽을 수 있는 신문 번호가 없는 경우
    // -----------------------------------------------

    if (
      user.read_dori_news === null ||
      user.read_dori_news === undefined
    ) {

      console.log(
        "⚠️ 읽을 수 있는 신문이 없음:",
        user.email
      );

      continue;
    }


    // -----------------------------------------------
    // 회원 등급
    // -----------------------------------------------

    const level =
      Number(user.user_level) || 1;


    // -----------------------------------------------
    // 발송 주기 확인
    // -----------------------------------------------

    if (
      !shouldSend(
        user.last_news_sent,
        level
      )
    ) {

      console.log(
        "⏭️ 아직 발송 시기가 아님:",
        user.email
      );

      continue;
    }


    // -----------------------------------------------
    // 이 사용자가 읽을 수 있는 신문
    // -----------------------------------------------

    const newsNumber =
      Number(user.read_dori_news);


    // -----------------------------------------------
    // 이메일 발송
    // -----------------------------------------------

    try {

      await sendEmail(
        user.email,
        level,
        newsNumber
      );


      // ---------------------------------------------
      // 발송 시간만 기록
      // ---------------------------------------------

      const {
        error: updateError
      } = await supabase

        .from("users")

        .update({

          last_news_sent:
            new Date().toISOString()

        })

        .eq(
          "user_id",
          user.user_id
        );


      if (updateError) {

        console.error(
          "❌ 발송 기록 저장 실패:",
          user.email,
          updateError
        );

        continue;
      }


      console.log(
        `✅ ${user.email} → ${newsNumber}호 발송`
      );

    } catch (emailError) {

      console.error(
        "❌ 이메일 발송 실패:",
        user.email,
        emailError
      );

    }

  }


  // ===================================================
  // 퀴즈 정답자 보상
  // ===================================================

  console.log(
    "🎁 퀴즈 보상 처리 시작"
  );


  for (const user of users) {

    if (user.quiz_right !== true) {
      continue;
    }


    const newCoin =
      (user.doldolcoin || 0) + 5000;


    const {
      error: rewardError
    } = await supabase

      .from("users")

      .update({

        doldolcoin:
          newCoin,

        quiz_right:
          null,

        quiz_news_number:
          null,

        quiz_answered:
          false

      })

      .eq(
        "user_id",
        user.user_id
      );


    if (rewardError) {

      console.error(
        "❌ 퀴즈 보상 지급 실패:",
        user.email,
        rewardError
      );

      continue;
    }


    console.log(
      `🎁 ${user.email} → +5000 돌돌코인`
    );

  }


  console.log(
    "🏁 돌이신문 이메일 시스템 종료"
  );
}


// =====================================================
// 실행
// =====================================================

run().catch((error) => {

  console.error(
    "🔥 치명적인 오류:",
    error
  );

});
