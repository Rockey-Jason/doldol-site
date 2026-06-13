<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY"
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
