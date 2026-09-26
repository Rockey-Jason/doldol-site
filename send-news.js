import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";


// =====================================================
// Supabase
// =====================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// =====================================================
// Gmail
// =====================================================

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GMAIL_USER", "GMAIL_APP_PASSWORD"];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error("필수 환경변수가 없습니다: " + name);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});


// =====================================================
// 돌이신문 읽기 페이지
// =====================================================

const NEWS_PAGE_URL =
  "https://rockey-jason.github.io/doldol-site/rockeynews.html";


// =====================================================
// 회원 등급별 이메일 발송 주기
// =====================================================
//
// Lv.1  → 7일
// Lv.2  → 6일
// Lv.3  → 5일
// Lv.4  → 4일
// Lv.5  → 3일
// Lv.6  → 2일
// Lv.7+ → 1일
//
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

function isLocalEightPM(timezone) {
  try {
    const hour = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Seoul",
      hour: "2-digit",
      hour12: false
    }).format(new Date()));
    return hour === 20;
  } catch {
    return false;
  }
}

function shouldSend(lastDate, level) {

  const now = new Date();


  // ---------------------------------------------------
  // 처음 보내는 경우
  // ---------------------------------------------------

  if (!lastDate) {

    return true;

  }


  // ---------------------------------------------------
  // 마지막 발송 시간
  // ---------------------------------------------------

  const last = new Date(lastDate);


  // ---------------------------------------------------
  // 날짜 차이 계산
  // ---------------------------------------------------

  const diff = Math.floor(
    (now - last) /
    (1000 * 60 * 60 * 24)
  );


  // ---------------------------------------------------
  // 회원 등급별 발송 주기
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // 신문 번호 안전하게 변환
  // ---------------------------------------------------

  const safeNewsNumber =
    Number(newsNumber);


  // ---------------------------------------------------
  // 신문 읽기 페이지 URL
  // ---------------------------------------------------

  const newsUrl =
    `${NEWS_PAGE_URL}?news_number=${encodeURIComponent(
      safeNewsNumber
    )}`;


  // ---------------------------------------------------
  // 이메일 발송
  // ---------------------------------------------------

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

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

</head>


<body
style="
margin:0;
padding:0;
background:#05051a;
font-family:Arial,'Malgun Gothic',sans-serif;
"
>


<div
style="
max-width:620px;
margin:0 auto;
padding:30px 20px;
"
>


<!-- =================================================
     메인 카드
================================================= -->

<div
style="
background:linear-gradient(
  145deg,
  #11113a,
  #07071d
);

border:1px solid
rgba(255,255,255,0.12);

border-radius:20px;

padding:35px 28px;

color:white;

box-shadow:
0 20px 50px
rgba(0,0,0,0.45);
"
>


<!-- =================================================
     제목
================================================= -->

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


<!-- =================================================
     설명
================================================= -->

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


<!-- =================================================
     신문 정보
================================================= -->

<div
style="
margin:28px 0;

padding:22px;

border-radius:14px;

background:
rgba(255,255,255,0.06);

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


<!-- =================================================
     신문 보러가기 버튼
================================================= -->

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


<!-- =================================================
     회원 등급
================================================= -->

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


<!-- =================================================
     Footer
================================================= -->

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
// 메인 실행
// =====================================================

async function run() {


  console.log(
    "🚀 돌이신문 이메일 시스템 시작"
  );

  console.log("🔐 Gmail SMTP 연결 확인 중...");
  await transporter.verify();
  console.log("✅ Gmail SMTP 인증/연결 성공");

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
      timezone
    `);


  // ===================================================
  // 사용자 조회 오류
  // ===================================================

  if (error || !users) {

    throw new Error(
      "사용자 조회 실패: " + (error?.message || "users 데이터가 없습니다.")
    );

  }


  console.log(
    `👥 ${users.length}명의 사용자를 확인했습니다.`
  );


  const testEmail = process.env.TEST_EMAIL?.trim();

  if (testEmail) {
    const { data: latestNews, error: latestNewsError } = await supabase
      .from("rockey_news")
      .select("news_number")
      .order("news_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestNewsError) throw new Error("최신 신문 조회 실패: " + latestNewsError.message);
    if (!latestNews?.news_number) throw new Error("발송할 돌이신문이 없습니다.");

    console.log("🧪 테스트 발송: " + testEmail + " → " + latestNews.news_number + "호");
    await sendEmail(testEmail, 10, latestNews.news_number);
    console.log("✅ 테스트 이메일 발송 완료");
    return;
  }

  let failedCount = 0;

  // ===================================================
  // 사용자별 이메일 발송
  // ===================================================

  for (const user of users) {


    // -------------------------------------------------
    // 이메일이 없는 경우
    // -------------------------------------------------

    if (!user.email) {

      console.log(
        "⚠️ 이메일이 없는 사용자:",
        user.user_id
      );

      continue;

    }


    // -------------------------------------------------
    // 읽을 수 있는 신문 번호가 없는 경우
    // -------------------------------------------------

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


    // -------------------------------------------------
    // 회원 등급
    // -------------------------------------------------

    const level =
      Number(user.user_level) || 1;


    // -------------------------------------------------
    // 사용자의 현지 시간 20:00인지 확인
    // -------------------------------------------------

    if (!isLocalEightPM(user.timezone)) {
      console.log(
        "⏭️ 현지 20:00이 아님:",
        user.email,
        user.timezone || "Asia/Seoul"
      );
      continue;
    }

    // -------------------------------------------------
    // 발송 주기 확인
    // -------------------------------------------------

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


    // -------------------------------------------------
    // 현재 읽을 수 있는 신문 번호
    // -------------------------------------------------

    const newsNumber =
      Number(user.read_dori_news);


    // -------------------------------------------------
    // 이메일 발송
    // -------------------------------------------------

    try {


      await sendEmail(
        user.email,
        level,
        newsNumber
      );


      // ------------------------------------------------
      // 이메일 발송 성공
      // 마지막 발송 시간 기록
      // ------------------------------------------------

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


      // ------------------------------------------------
      // 발송 기록 저장 실패
      // ------------------------------------------------

      if (updateError) {

        console.error(
          "❌ 발송 기록 저장 실패:",
          user.email,
          updateError
        );

        failedCount++;
        continue;

      }


      // ------------------------------------------------
      // 성공 로그
      // ------------------------------------------------

      console.log(
        `✅ ${user.email} → ${newsNumber}호 발송`
      );


    } catch (emailError) {


      // ------------------------------------------------
      // 이메일 발송 실패
      // ------------------------------------------------

      console.error(
        "❌ 이메일 발송 실패:",
        user.email,
        emailError
      );

      failedCount++;

    }

  }


  // ===================================================
  // 종료
  // ===================================================

  if (failedCount > 0) {
    throw new Error("이메일 처리 중 " + failedCount + "건의 실패가 발생했습니다.");
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

  process.exitCode = 1;

});
