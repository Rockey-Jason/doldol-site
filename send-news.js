<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://scttowfhygcpdirrekqm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY"
);

window.신문발송 = async function () {
  const { error } = await supabase
    .from("settings")
    .update({ run_now: true })
    .eq("id", 1);

  if (error) {
    console.error("실패:", error);
  } else {
    console.log("트리거 성공");
  }
};
</script>

<button onclick="신문발송()">
신문 발송
</button>
