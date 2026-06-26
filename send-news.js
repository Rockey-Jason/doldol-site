import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 이메일 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const delayMap = {
  1: 7,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
  9: 1
10: 1
};

function shouldSend(lastDate, level) {
  const now = new Date();

  if (!lastDate) return true;

  const diff = Math.floor(
    (now - new Date(lastDate)) / (1000 * 60 * 60 * 24)
  );

const delay = delayMap[level] ?? 7;
return diff >= delay;

  return diff >= delayMap[level];
}

async function sendEmail(to, level) {
  await transporter.sendMail({
    from: `"돌이사이트" <${process.env.GMAIL_USER}>`,
    to,
    subject: "📢 돌이신문 발행 알림",
    html: `
      <h2>돌이신문이 발행되었습니다!</h2>
      <p>아래 버튼을 눌러 확인하세요.</p>

      <a href="https://rockey-jason.github.io/doldol-site/"
         style="
           display:inline-block;
           padding:12px 24px;
           background:#4CAF50;
           color:white;
           text-decoration:none;
           border-radius:8px;
         ">
         돌이신문 보러가기
      </a>
    `
  });
}

async function run() {
const { data: users, error } = await supabase.from("users").select("*");

if (error || !users) {
  console.log(error);
  return;
}

  for (const user of users) {
    if (!shouldSend(user.last_news_sent, user.user_level)) continue;

    await sendEmail(user.email, user.user_level);

    await supabase
      .from("users")
      .update({
        read_dori_news: (user.read_dori_news || 0) + 1,
        last_news_sent: new Date().toISOString()
      })
      .eq("user_id", user.user_id);

    console.log("sent:", user.email);
  }
}

run();
