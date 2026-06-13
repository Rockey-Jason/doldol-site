import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resend = new Resend(
  process.env.RESEND_API_KEY
);


<button onclick="신문발송()">
신문 발송
</button>
<script>
  async function 신문발송() {

  await supabase
    .from("settings")
    .update({
      run_now: true
    })
    .eq("id", 1);

}
  </script>



const 레벨주기 = {
  "일반": 7,
  "프리미엄": 6,
  "돌프리미엄": 5,
  "돌돌프리미엄": 4,
  "돌돌돌프리미엄": 3,
  "돌돌돌돌프리미엄": 2,
  "돌돌돌돌돌프리미엄": 1,
  "유사돌이": 1,
  "돌이": 1
};

const { data: users, error } =
await supabase
  .from("users")
  .select("*");

if (error) {
  console.error(error);
  process.exit(1);
}

const 지금 = new Date();

for (const user of users) {

  const 주기 =
    레벨주기[user.user_level];

  if (!주기) continue;

  let 발송해야함 = false;

  if (!user.last_news_sent) {
    발송해야함 = true;
  } else {

    const 마지막 =
      new Date(user.last_news_sent);

    const 경과일 =
      Math.floor(
        (지금 - 마지막)
        / (1000 * 60 * 60 * 24)
      );

    if (경과일 >= 주기) {
      발송해야함 = true;
    }
  }

  if (!발송해야함) continue;

  try {

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: user.email,
      subject: "돌이신문 발행",
      html: `
        <h1>돌이신문이 발행 되었습니다!</h1>
        <p>돌이 사이트에 방문해서 최신 신문을 확인하세요.</p>
      `
    });

    console.log(
      `${user.email} 발송 완료`
    );

    await supabase
      .from("users")
      .update({
        last_news_sent:
          new Date().toISOString()
      })
      .eq(
        "user_number",
        user.user_number
      );

  } catch (err) {

    console.error(
      `${user.email} 발송 실패`,
      err
    );

  }
}
