import { createClient }
from "@supabase/supabase-js";

import { Resend }
from "resend";

const supabase =
createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
);

const resend =
new Resend(
process.env.RESEND_API_KEY
);

console.log("연결 성공");
