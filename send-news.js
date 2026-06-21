<!DOCTYPE html>
<html>
<head>
<title>돌이 사이트-돌이신문 작성</title>

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
    
const { data, error } = await supabase
.from("users")
.insert([
  {
rockey_news:
  }
]);
    
  }
};
</script>

<input id="신문"
placeholder="신문내용을 입력하세요"
style="
position: absolute;
top: 280px;
left: 50px;
width: 400px;
height: 700px;
">
  
  <style>
body {
  background: linear-gradient(to right, #000033, #000010);
  margin: 0;
}
</style>

  
</head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link href="https://fonts.googleapis.com/css2?family=Jua&family=Black+Han+Sans&display=swap" rel="stylesheet">
<body>

<a href="https://rockey-jason.github.io/doldol-site/" style="text-decoration:none;">
<button style="
position:absolute;
top:0;
left:0;
background:none;
border:none;
color:#f5f5f5;
font-family:'Black Han Sans';
font-size:100px;
cursor:pointer;
">
돌이 사이트
</button>
</a>

<p style="
font-size:20px;
color:#f5f5f5;
font-family:jua;
margin-top:120px;
margin-left:20px;
">
돌이에 대한 여러 정보와 돌이신문, 돌돌코인 수급 등을 이용해보세요!
</p>

  

<button onclick="신문발송()">
신문 발송
</button>
