(() => {
"use strict";
if(window.__ROCKEY_CALENDAR_MENTION_ALERTS__)return;
window.__ROCKEY_CALENDAR_MENTION_ALERTS__=true;
const SUPABASE_URL="https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
let client=null,userId=null,channel=null,poll=null,root=null,current=null,refreshing=false;
const dismissed=new Set();
const $=id=>root?.querySelector("#"+id);
function styles(){
 if(document.getElementById("rockey-mention-alert-style"))return;
 const style=document.createElement("style");style.id="rockey-mention-alert-style";
 style.textContent=`
 #rockey-mention-alert-root{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:16px;pointer-events:none;font-family:HancomMalrangmalrang,sans-serif}
 #rockey-mention-alert-card{width:min(440px,100%);padding:21px;border:1px solid rgba(229,200,121,.28);border-radius:21px;color:#eff6fb;background:radial-gradient(circle at 100% 0,rgba(97,143,184,.18),transparent 42%),linear-gradient(145deg,#102943,#071526 82%);box-shadow:0 26px 85px rgba(0,0,0,.58);pointer-events:auto;opacity:0;transform:translateY(12px) scale(.985);transition:opacity .24s,transform .3s cubic-bezier(.22,1,.36,1)}
 #rockey-mention-alert-card.open{opacity:1;transform:translateY(0) scale(1)}
 .rma-eyebrow{color:#d8bf80;font:700 8px Arial,sans-serif;letter-spacing:.18em}
 .rma-head{display:flex;align-items:center;gap:11px;margin:9px 0 12px}
 .rma-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border:1px solid rgba(229,200,121,.28);border-radius:13px;color:#e8d28f;background:rgba(128,100,47,.15);font-size:19px}
 .rma-title{color:#f3f7fb;font-size:17px;font-weight:400;line-height:1.4}
 .rma-count{margin-left:auto;color:#9fb4c8;font-size:8px;white-space:nowrap}
 .rma-body{padding:12px;border:1px solid rgba(145,179,211,.13);border-radius:11px;color:#b9ccdc;background:rgba(3,14,26,.38);font-size:10px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
 .rma-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:14px}
 .rma-actions button{min-height:37px;padding:8px 12px;border:1px solid rgba(145,179,211,.18);border-radius:10px;color:#c9dae8;background:rgba(255,255,255,.035);font:inherit;font-size:10px;cursor:pointer}
 .rma-actions .rma-open{border-color:rgba(229,200,121,.4);color:#f1dfa9;background:linear-gradient(120deg,rgba(132,101,39,.35),rgba(74,58,28,.24))}
 .rma-actions button:disabled{opacity:.55;cursor:wait}
 @media(max-width:540px){#rockey-mention-alert-root{align-items:flex-end;padding:12px 10px calc(15px + env(safe-area-inset-bottom))}.rma-title{font-size:15px}}
 @media(prefers-reduced-motion:reduce){#rockey-mention-alert-card{transition:none}}
 `;
 document.head.append(style);
}
function ensureRoot(){
 if(root)return root;styles();
 root=document.createElement("div");root.id="rockey-mention-alert-root";
 root.innerHTML='<section id="rockey-mention-alert-card" role="dialog" aria-live="polite" aria-labelledby="rma-title"><div class="rma-eyebrow">ROCKEY SHARED CALENDAR · MENTION</div><div class="rma-head"><div class="rma-icon" aria-hidden="true">@</div><div class="rma-title" id="rma-title">댓글에서 회원님을 태그했어요</div><div class="rma-count" id="rma-count"></div></div><div class="rma-body" id="rma-body"></div><div class="rma-actions"><button type="button" id="rma-later">나중에</button><button type="button" class="rma-open" id="rma-open">댓글 확인하기 ↗</button></div></section>';
 document.body.append(root);
 $("rma-later").addEventListener("click",()=>{if(current)dismissed.add(current.id);hide();});
 $("rma-open").addEventListener("click",openCurrent);
 return root;
}
function show(row,count){
 current=row;ensureRoot();$("rma-title").textContent=row.title||"공유 캘린더 댓글에서 태그됐어요";
 $("rma-body").textContent=row.body||"공유 캘린더 댓글에서 회원님을 태그했어요.";
 $("rma-count").textContent=count>1?"미확인 "+count+"개":"새 알림";
 const card=$("rockey-mention-alert-card");card.classList.add("open");
}
function hide(){if(root)$("rockey-mention-alert-card").classList.remove("open");}
async function markRead(id){
 if(!client||!userId)return;
 const {error}=await client.from("dori_notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
 if(error)throw error;
}
function navigate(raw){
 try{
  const target=String(raw||"./rockey-calendar.html");
  const url=new URL(target,window.location.href);
  if(url.origin!==window.location.origin||/^[a-z][a-z0-9+.-]*:/i.test(target))throw new Error("external");
  window.location.assign(url.href);
 }catch(_){window.location.assign("./rockey-calendar.html");}
}
async function openCurrent(){
 if(!current)return;const row=current,button=$("rma-open");button.disabled=true;
 try{await markRead(row.id);dismissed.add(row.id);hide();current=null;navigate(row.target_url);}
 catch(error){console.warn("[ROCKEY Calendar Mention]",error);button.disabled=false;$("rma-body").textContent="알림을 처리하지 못했어요. 네트워크 연결을 확인해 주세요.";}
}
async function refresh(){
 if(!client||!userId||refreshing)return;refreshing=true;
 try{
  const {data,error}=await client.from("dori_notifications")
   .select("id,title,body,target_url,created_at,metadata")
   .eq("user_id",userId).is("read_at",null)
   .contains("metadata",{kind:"calendar_day_comment_mention"})
   .order("created_at",{ascending:false}).limit(12);
  if(error)throw error;
  const rows=(data||[]).filter(row=>!dismissed.has(row.id));
  if(rows.length){
   const latest=rows[0];
   if(!current||current.id!==latest.id)show(latest,rows.length);
   else if($("rockey-mention-alert-card"))$("rma-count").textContent=rows.length>1?"미확인 "+rows.length+"개":"새 알림";
  }else if(!current)hide();
 }catch(error){console.warn("[ROCKEY Calendar Mention] 알림 확인 실패:",error.message||error);}
 finally{refreshing=false;}
}
async function activate(uid){
 if(uid===userId){await refresh();return;}
 deactivate();userId=uid;void refresh();
 channel=client.channel("rockey-calendar-mention-alerts-"+uid)
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"dori_notifications",filter:"user_id=eq."+uid},()=>{void refresh();})
  .subscribe();
 poll=window.setInterval(()=>{if(!document.hidden)void refresh();},30000);
}
function deactivate(){
 if(channel&&client)client.removeChannel(channel);channel=null;
 if(poll)clearInterval(poll);poll=null;userId=null;current=null;hide();
}
async function connect(){
 try{
  for(let i=0;i<45&&!window.doriSupabase?.auth;i++)await new Promise(resolve=>setTimeout(resolve,100));
  if(window.doriSupabase?.auth)client=window.doriSupabase;
  else if(window.supabase?.createClient){
   client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"sb-scttowfhygcpdirrekqm-auth-token"}});
   window.doriSupabase=client;
  }
  if(!client)return;
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  if(session?.user?.id)await activate(session.user.id);
  client.auth.onAuthStateChange((_event,next)=>window.setTimeout(()=>{if(next?.user?.id)void activate(next.user.id);else deactivate();},0));
  window.addEventListener("focus",()=>{if(!document.hidden)void refresh();});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refresh();});
 }catch(error){console.warn("[ROCKEY Calendar Mention] 초기화 실패:",error);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connect,{once:true});else void connect();
})();