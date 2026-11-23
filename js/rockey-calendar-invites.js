(() => {
"use strict";
if(window.__ROCKEY_CALENDAR_INVITES__)return;
window.__ROCKEY_CALENDAR_INVITES__=true;
const URL="https://scttowfhygcpdirrekqm.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
let client=null,userId=null,channel=null,poll=null,root=null,invites=[],busy=false,dismissed=false;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
function styles(){
 if(document.getElementById("rockey-calendar-invite-style"))return;
 const s=document.createElement("style");s.id="rockey-calendar-invite-style";s.textContent=`
 #rockey-invite-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(2,7,17,.78);backdrop-filter:blur(8px);opacity:0;visibility:hidden;transition:opacity .24s,visibility .24s;font-family:HancomMalrangmalrang,sans-serif}
 #rockey-invite-overlay.open{opacity:1;visibility:visible}
 #rockey-invite-panel{width:min(520px,100%);max-height:min(82vh,720px);overflow:auto;border:1px solid rgba(229,200,121,.25);border-radius:22px;color:#edf5ff;background:radial-gradient(circle at 100% 0,rgba(104,148,190,.15),transparent 42%),linear-gradient(145deg,#102741,#071526 80%);box-shadow:0 32px 100px rgba(0,0,0,.62);transform:translateY(14px) scale(.99);transition:transform .3s cubic-bezier(.22,1,.36,1)}
 #rockey-invite-overlay.open #rockey-invite-panel{transform:translateY(0) scale(1)}
 .rci-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 20px 15px;border-bottom:1px solid rgba(147,178,207,.13)}
 .rci-brand{display:flex;align-items:center;gap:10px}.rci-mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(229,200,121,.35);border-radius:12px;background:rgba(135,105,48,.14);color:#e8d18c;font:700 15px Arial}
 .rci-eyebrow{color:#d5bd7f;font:700 8px Arial;letter-spacing:.18em}.rci-title{margin-top:4px;color:#f4f7fc;font-size:17px}
 .rci-close{width:31px;height:31px;border:1px solid rgba(150,180,208,.18);border-radius:9px;color:#cbd9e6;background:rgba(255,255,255,.04);font-size:19px;cursor:pointer}
 .rci-intro{padding:13px 20px 5px;color:#9fb5ca;font-size:10px;line-height:1.7}
 .rci-list{display:grid;gap:9px;padding:10px 20px 20px}
 .rci-item{padding:14px;border:1px solid rgba(145,179,211,.15);border-radius:14px;background:rgba(4,16,29,.42);animation:rciIn .3s ease both}
 .rci-item-title{color:#f1f6fb;font-size:13px}.rci-item-desc{margin-top:6px;color:#9fb5ca;font-size:10px;line-height:1.7}
 .rci-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px;color:#7f9ab3;font-size:9px}
 .rci-actions{display:flex;gap:7px;margin-top:13px}.rci-actions button,.rci-open{min-height:36px;padding:8px 12px;border:1px solid rgba(145,179,211,.18);border-radius:10px;color:#dceaf6;background:rgba(255,255,255,.04);font:inherit;font-size:10px;cursor:pointer}
 .rci-actions .rci-accept{border-color:rgba(229,200,121,.4);color:#f1dfa9;background:linear-gradient(125deg,rgba(125,95,38,.46),rgba(69,54,27,.3))}
 .rci-actions button:disabled{opacity:.5;cursor:wait}
 .rci-empty{padding:24px 8px;text-align:center;color:#a7bfd4;font-size:11px;line-height:1.8}
 .rci-open{display:inline-flex;align-items:center;justify-content:center;margin-top:12px;border-color:rgba(229,200,121,.35);color:#f1dfa9;text-decoration:none}
 @keyframes rciIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
 @media(max-width:540px){#rockey-invite-overlay{padding:10px}.rci-head{padding:15px}.rci-intro{padding:12px 15px 4px}.rci-list{padding:9px 15px 15px}}
 @media(prefers-reduced-motion:reduce){#rockey-invite-overlay,#rockey-invite-panel,.rci-item{transition:none;animation:none}}
 `;
 document.head.append(s);
}
function ensureRoot(){
 if(root)return root;styles();
 root=el("div");root.id="rockey-invite-overlay";
 const panel=el("section");panel.id="rockey-invite-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","rci-dialog-title");
 const head=el("header","rci-head"),brand=el("div","rci-brand"),mark=el("div","rci-mark","R"),textWrap=el("div"),eyebrow=el("div","rci-eyebrow","ROCKEY SHARED CALENDAR"),title=el("div","rci-title","새로운 캘린더 초대");title.id="rci-dialog-title";textWrap.append(eyebrow,title);brand.append(mark,textWrap);
 const close=el("button","rci-close","×");close.type="button";close.setAttribute("aria-label","닫기");close.addEventListener("click",()=>{dismissed=true;root.classList.remove("open");});
 head.append(brand,close);
 const intro=el("div","rci-intro","돌이사이트 사용자가 당신을 비공개 공유 캘린더에 초대했어요. 참여하면 방의 구성원들과 일정, 메모, 댓글을 함께 사용할 수 있습니다.");
 const list=el("div","rci-list");list.id="rci-invites";
 panel.append(head,intro,list);root.append(panel);
 root.addEventListener("click",e=>{if(e.target===root){dismissed=true;root.classList.remove("open");}});
 document.body.append(root);
 return root;
}
function show(){if(!root)ensureRoot();if(!dismissed)root.classList.add("open");}
function hide(){if(root)root.classList.remove("open");}
function render(){
 const host=ensureRoot().querySelector("#rci-invites");host.replaceChildren();
 if(!invites.length){
  const empty=el("div","rci-empty","현재 대기 중인 초대가 없습니다.");
  const link=el("a","rci-open","공유 캘린더 열기 ↗");link.href="./rockey-calendar.html";host.append(empty,link);return;
 }
 invites.forEach(inv=>{
  const card=el("article","rci-item"),title=el("div","rci-item-title",inv.room_name),desc=el("div","rci-item-desc",inv.inviter_name+"님이 당신을 이 공유 캘린더에 초대했어요. 참여하면 다른 구성원과 일정을 함께 볼 수 있습니다.");
  const meta=el("div","rci-meta","초대 받은 방 · "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(inv.created_at)));
  const actions=el("div","rci-actions"),accept=el("button","rci-accept","참여하기"),decline=el("button","","거절하기");
  const respond=async value=>{
   accept.disabled=true;decline.disabled=true;
   try{
    const {error}=await client.rpc("rockey_calendar_respond_invite",{p_invite_id:inv.invite_id,p_accept:value});if(error)throw error;
    try{await client.from("dori_notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).contains("metadata",{invite_id:inv.invite_id});}catch(_){}
    await refresh(true);
    if(value){const p=el("div","rci-item-desc","캘린더 참여가 완료됐어요.");card.append(p);}
   }catch(e){
    const p=el("div","rci-item-desc",e.message||"초대 응답을 처리하지 못했어요.");p.style.color="#ffb6b6";card.append(p);accept.disabled=false;decline.disabled=false;
   }
  };
  accept.addEventListener("click",()=>respond(true));decline.addEventListener("click",()=>respond(false));
  actions.append(accept,decline);card.append(title,desc,meta,actions);host.append(card);
 });
}
async function refresh(openOnResult=false){
 if(!client||!userId||busy)return;busy=true;
 try{
  const {data,error}=await client.rpc("rockey_calendar_pending_invites");if(error)throw error;
  const previous=new Set(invites.map(x=>x.invite_id));invites=data||[];
  if(invites.some(x=>!previous.has(x.invite_id)))dismissed=false;
  render();
  if(invites.length&&openOnResult&&!dismissed)show();
  if(!invites.length&&root?.classList.contains("open")){root.classList.add("open");}
 }catch(e){console.warn("[ROCKEY Calendar Invites]",e);}
 finally{busy=false;}
}
async function connect(){
 try{
  // Prefer the page's established Supabase client to avoid competing auth refresh loops.
  for(let i=0;i<30&&!window.doriSupabase?.auth;i++)await new Promise(r=>setTimeout(r,100));
  if(window.doriSupabase?.auth)client=window.doriSupabase;
  else if(window.supabase?.createClient){client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"sb-scttowfhygcpdirrekqm-auth-token"}});window.doriSupabase=client;}

  if(!client)return;
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  if(session?.user?.id)activate(session.user.id);
  client.auth.onAuthStateChange((_event,next)=>{window.setTimeout(()=>{if(next?.user?.id)activate(next.user.id);else deactivate();},0);});
 }catch(e){console.warn("[ROCKEY Calendar Invites] 초기화 실패:",e);}
}
function activate(uid){
 if(uid===userId){void refresh(true);return;}
 deactivate();userId=uid;dismissed=false;void refresh(true);
 channel=client.channel("rockey-calendar-invites-"+uid)
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"rockey_calendar_invites",filter:"invitee_id=eq."+uid},()=>{dismissed=false;void refresh(true);})
  .subscribe();
 poll=window.setInterval(()=>{if(!document.hidden)void refresh(true);},45000);
}
function deactivate(){
 if(channel&&client)client.removeChannel(channel);channel=null;
 if(poll)clearInterval(poll);poll=null;userId=null;invites=[];dismissed=false;hide();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connect,{once:true});else void connect();
})();