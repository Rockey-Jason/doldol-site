(() => {
"use strict";
const SUPABASE_URL="https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
const TABLES={rooms:"rockey_calendar_rooms",members:"rockey_calendar_members",events:"rockey_calendar_events",dayComments:"rockey_calendar_day_comments",dayMentions:"rockey_calendar_day_comment_mentions",dayReads:"rockey_calendar_day_comment_reads"};
const $=id=>document.getElementById(id);
const state={sb:null,user:null,rooms:[],room:null,members:[],events:[],memberMap:new Map(),selected:new Date(),month:new Date(new Date().getFullYear(),new Date().getMonth(),1),view:"month",channel:null,editing:null,detail:null,detailOccurrence:null,activeDay:null,dayComments:[],dayReads:[],pendingMentions:[],occurrences:[],selectedRoomUsers:[],searchTimers:{},searchTokens:{},loading:false};
const WEEKDAYS=["일","월","화","수","목","금","토"];
const CATEGORY={general:"일반",meeting:"회의",study:"공부",game:"게임",event:"행사",deadline:"마감",birthday:"생일",memo:"메모"};
const FREQUENCY={none:"일반 일정",daily:"매일",weekly:"매주",monthly:"매달",yearly:"매년",interval_days:"X일마다"};
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const dateDiff=(a,b)=>Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/86400000);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||""))?v:"#76B7E8";
function formatDate(d,options){return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",...options}).format(d);}
function formatTime(d){return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);}
function localInputValue(d){return dateKey(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());}
function parseInputDate(value){return new Date(value);}
function notice(message,isError=false){const node=$("notice");node.textContent=message;node.className="notice show"+(isError?" error":"");}
function clearNotice(){$("notice").className="notice";$("notice").textContent="";}
function showLoginRequired(){notice("로키 공유 캘린더를 사용하려면 돌이사이트에 로그인해 주세요.",true);$("loginLink").hidden=false;}
function getClient(){
 if(state.sb)return state.sb;
 if(window.doriSupabase?.auth){state.sb=window.doriSupabase;return state.sb;}
 if(!window.supabase?.createClient)throw new Error("Supabase 연결 도구를 불러오지 못했어요.");
 state.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"sb-scttowfhygcpdirrekqm-auth-token"}});
 window.doriSupabase=state.sb;return state.sb;
}
function userColor(userId){return state.memberMap.get(userId)?.member_color||"#76B7E8";}
function memberName(userId){return state.memberMap.get(userId)?.display_name||"참여자";}
function userCanManage(e){return !!state.user&&(e.creator_id===state.user.id||state.roomRole==="owner");}
async function loadRooms(preferredId){
 const {data,error}=await state.sb.from(TABLES.rooms).select("id,name,description,owner_id,created_at,updated_at").order("created_at",{ascending:false});
 if(error)throw error;
 state.rooms=data||[];
 renderRoomList();
 if(!state.rooms.length){state.room=null;state.events=[];state.members=[];state.memberMap.clear();$("workspace").hidden=true;$("emptyState").hidden=false;return;}
 $("emptyState").hidden=true;$("workspace").hidden=false;
 const next=state.rooms.find(r=>r.id===preferredId)||state.rooms.find(r=>r.id===state.room?.id)||state.rooms[0];
 await openRoom(next.id);
}
function renderRoomList(){
 const host=$("roomList");host.replaceChildren();
 if(!state.rooms.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="아직 참여 중인 캘린더가 없습니다. 새 캘린더를 만들거나 초대를 수락해 보세요.";host.append(empty);}
 state.rooms.forEach(room=>{
  const b=document.createElement("button");b.type="button";b.className="room-card"+(state.room?.id===room.id?" active":"");
  const icon=document.createElement("span");icon.className="room-card-mark";icon.textContent="▦";
  const copy=document.createElement("span");copy.className="room-card-copy";
  const title=document.createElement("strong");title.textContent=room.name;
  const meta=document.createElement("small");meta.textContent=(room.owner_id===state.user.id?"내가 만든 방":"초대받은 방");
  copy.append(title,meta);b.append(icon,copy);b.addEventListener("click",()=>openRoom(room.id));host.append(b);
 });
 const add=document.createElement("button");add.type="button";add.className="room-card room-add";add.textContent="＋ 새 캘린더 만들기";add.addEventListener("click",openCreateRoom);host.append(add);
}
async function openRoom(roomId){
 const room=state.rooms.find(r=>r.id===roomId);if(!room)return;
 state.room=room;state.events=[];state.members=[];state.memberMap.clear();state.selected=new Date();state.month=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);
 clearNotice();renderRoomList();$("workspace").hidden=false;$("emptyState").hidden=true;
 $("activeRoomName").textContent=room.name;$("activeRoomDescription").textContent=room.description||"초대된 참여자와 일정을 공유합니다.";
 try{
  const [membersResult,eventsResult]=await Promise.all([
   state.sb.rpc("rockey_calendar_room_members",{p_room_id:room.id}),
   state.sb.from(TABLES.events).select("*").eq("room_id",room.id).order("starts_at",{ascending:true})
  ]);
  if(membersResult.error)throw membersResult.error;if(eventsResult.error)throw eventsResult.error;
  state.members=membersResult.data||[];state.members.forEach(m=>state.memberMap.set(m.member_user_id,m));
  state.roomRole=state.members.find(m=>m.member_user_id===state.user.id)?.role||"member";
  state.events=eventsResult.data||[];
  renderRoomHeader();render();
  subscribeRoom(room.id);
 }catch(e){console.error("[ROCKEY Calendar]",e);notice("캘린더 데이터를 불러오지 못했어요. "+(e.message||"잠시 후 다시 시도해 주세요."),true);}
}
function renderRoomHeader(){
 const mini=$("memberMini");mini.replaceChildren();
 state.members.slice(0,8).forEach(m=>{const dot=document.createElement("span");dot.className="member-dot";dot.style.background=safeColor(m.member_color);dot.title=m.display_name;mini.append(dot);});
 const label=document.createElement("span");label.className="member-label";label.textContent=state.members.length+"명 참여";mini.append(label);
 $("memberCount").textContent=state.members.length+"명";
 $("roomInviteButton").hidden=state.roomRole!=="owner";$("lockedInviteButton").hidden=state.roomRole!=="owner";
 $("memberLock").hidden=state.members.length>=2;$("calendarSurface").hidden=state.members.length<2;
 $("addEventButton").hidden=state.members.length<2;
 renderMembers();
}
function renderMembers(){
 const host=$("memberList");host.replaceChildren();
 state.members.forEach(m=>{
  const row=document.createElement("div");row.className="member-row";row.style.setProperty("--member-color",safeColor(m.member_color));
  const avatar=document.createElement("span");avatar.className="member-avatar";avatar.textContent=(m.display_name||"U").slice(0,1);
  const copy=document.createElement("span");copy.style.minWidth="0";
  const name=document.createElement("span");name.className="member-name";name.textContent=m.display_name+(m.member_user_id===state.user.id?" (나)":"");
  const role=document.createElement("span");role.className="member-role";role.textContent=m.role==="owner"?"방 소유자":"참여자";
  copy.append(name,role);const color=document.createElement("span");color.className="member-color-label";
  row.append(avatar,copy,color);host.append(row);
 });
}
function currentRange(){
 if(state.view==="month"){
  const first=new Date(state.month.getFullYear(),state.month.getMonth(),1);
  const from=new Date(first);from.setDate(first.getDate()-first.getDay());
  const to=new Date(from);to.setDate(to.getDate()+42);return {from,to};
 }
 if(state.view==="week"){
  const from=dayStart(state.selected);from.setDate(from.getDate()-from.getDay());
  const to=new Date(from);to.setDate(to.getDate()+7);return {from,to};
 }
 const from=dayStart(state.selected),to=new Date(from);to.setDate(to.getDate()+1);return {from,to};
}
function occursOn(e,day,baseStart,baseDay){
 const freq=e.recurrence_frequency||"none",diff=dateDiff(day,baseDay);
 if(diff<0)return false;
 if(freq==="none")return diff===0;
 const interval=Math.max(1,Number(e.recurrence_interval)||1);
 if(freq==="daily")return diff%interval===0;
 if(freq==="interval_days")return diff%interval===0;
 if(freq==="weekly"){
  const anchorSunday=new Date(baseDay);anchorSunday.setDate(anchorSunday.getDate()-anchorSunday.getDay());
  const currentSunday=new Date(day);currentSunday.setDate(currentSunday.getDate()-currentSunday.getDay());
  const weekDiff=Math.floor(dateDiff(currentSunday,anchorSunday)/7);
  const days=Array.isArray(e.recurrence_weekdays)&&e.recurrence_weekdays.length?e.recurrence_weekdays:[baseDay.getDay()];
  return weekDiff>=0&&weekDiff%interval===0&&days.includes(day.getDay());
 }
 if(freq==="monthly"){
  const monthDiff=(day.getFullYear()-baseDay.getFullYear())*12+(day.getMonth()-baseDay.getMonth());
  const target=Number(e.recurrence_month_day)||baseDay.getDate();
  return monthDiff>=0&&monthDiff%interval===0&&day.getDate()===target;
 }
 if(freq==="yearly"){
  const yearDiff=day.getFullYear()-baseDay.getFullYear();
  const targetMonth=(Number(e.recurrence_month)||baseDay.getMonth()+1)-1;
  const targetDay=Number(e.recurrence_month_day)||baseDay.getDate();
  return yearDiff>=0&&yearDiff%interval===0&&day.getMonth()===targetMonth&&day.getDate()===targetDay;
 }
 return false;
}
function occurrencesBetween(from,to){
 const items=[];
 state.events.forEach(e=>{
  const baseStart=new Date(e.starts_at),baseEnd=new Date(e.ends_at),baseDay=dayStart(baseStart);
  const duration=Math.max(60000,baseEnd-baseStart);
  const until=e.recurrence_until?String(e.recurrence_until):null;
  for(let cursor=dayStart(from);cursor<to;cursor.setDate(cursor.getDate()+1)){
   const key=dateKey(cursor);
   if(until&&key>until)continue;
   if(!occursOn(e,cursor,baseStart,baseDay))continue;
   const start=new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate(),baseStart.getHours(),baseStart.getMinutes(),baseStart.getSeconds());
   const end=new Date(start.getTime()+duration);
   const occurrence={...e,occurrenceDate:key,occurrenceStart:start,occurrenceEnd:end,creatorName:memberName(e.creator_id),creatorColor:userColor(e.creator_id)};
   items.push(occurrence);
  }
 });
 return items.sort((a,b)=>a.occurrenceStart-b.occurrenceStart);
}
function occurrenceKey(o){return o.id+"::"+o.occurrenceDate;}
function render(){
 if(!state.room)return;
 const range=currentRange();state.occurrences=occurrencesBetween(range.from,range.to);
 if(state.members.length>=2){
  if(state.view==="month")renderMonth(range);else renderTimeGrid(range);
 }
 renderAgenda();renderPeriodTitle();
 document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
}
function renderPeriodTitle(){
 if(state.view==="month"){$("periodTitle").textContent=new Intl.DateTimeFormat("ko-KR",{month:"long"}).format(state.month);$("periodCaption").textContent=state.month.getFullYear()+"년 · 월간 보기";}
 else if(state.view==="week"){
  const range=currentRange(),end=new Date(range.to);end.setDate(end.getDate()-1);
  $("periodTitle").textContent=formatDate(range.from,{month:"numeric",day:"numeric"})+" – "+formatDate(end,{month:"numeric",day:"numeric"});
  $("periodCaption").textContent=state.selected.getFullYear()+"년 · 주간 보기";
 }else{$("periodTitle").textContent=formatDate(state.selected,{month:"long",day:"numeric",weekday:"long"});$("periodCaption").textContent=state.selected.getFullYear()+"년 · 일간 보기";}
}
function renderMonth(range){
 const host=$("calendarSurface");host.replaceChildren();
 const weekdays=document.createElement("div");weekdays.className="weekday-row";WEEKDAYS.forEach(day=>{const s=document.createElement("span");s.textContent=day;weekdays.append(s);});host.append(weekdays);
 const grid=document.createElement("div");grid.className="month-grid";const today=dateKey(new Date());
 for(let i=0;i<42;i++){
  const d=new Date(range.from);d.setDate(d.getDate()+i);const key=dateKey(d);
  const cell=document.createElement("button");cell.type="button";cell.className="month-day"+(d.getMonth()!==state.month.getMonth()?" outside":"")+(key===today?" today":"")+(key===dateKey(state.selected)?" selected":"");
  cell.setAttribute("aria-label",formatDate(d,{year:"numeric",month:"long",day:"numeric"}));
  const num=document.createElement("span");num.className="day-number";num.textContent=d.getDate();cell.append(num);
  const dayEvents=state.occurrences.filter(o=>o.occurrenceDate===key);
  const list=document.createElement("div");list.className="day-events";
  dayEvents.slice(0,3).forEach(o=>{const chip=document.createElement("span");chip.className="event-chip";chip.style.setProperty("--event-color",safeColor(o.creatorColor));const time=document.createElement("span");time.className="chip-time";time.textContent=o.all_day?"종일":formatTime(o.occurrenceStart);const title=document.createElement("span");title.className="chip-title";title.textContent=o.title;chip.append(time,title);chip.title=o.creatorName+" · "+o.title;chip.addEventListener("click",ev=>{ev.stopPropagation();openDayView(d);});list.append(chip);});
  if(dayEvents.length>3){const more=document.createElement("span");more.className="more-events";more.textContent="+"+(dayEvents.length-3)+"개 더";list.append(more);}
  cell.append(list);cell.addEventListener("click",()=>openDayView(d));grid.append(cell);
 }
 host.append(grid);
}
function renderTimeGrid(range){
 const host=$("calendarSurface");host.replaceChildren();const days=[];
 for(let d=new Date(range.from);d<range.to;d.setDate(d.getDate()+1))days.push(new Date(d));
 const wrap=document.createElement("div");wrap.className="time-grid-wrap";
 const grid=document.createElement("div");grid.className="time-grid";grid.style.setProperty("--day-count",days.length);
 const blank=document.createElement("div");blank.className="time-head";grid.append(blank);
 days.forEach(d=>{const h=document.createElement("div");h.className="time-head time-head-cell"+(dateKey(d)===dateKey(state.selected)?" selected":"");const strong=document.createElement("strong");strong.textContent=WEEKDAYS[d.getDay()]+" "+d.getDate();const small=document.createElement("small");small.textContent=formatDate(d,{month:"numeric",day:"numeric"});h.append(strong,small);h.style.cursor="pointer";h.addEventListener("click",()=>openDayView(d));grid.append(h);});
 for(let hour=0;hour<24;hour++){
  const gutter=document.createElement("div");gutter.className="time-gutter";gutter.style.paddingTop="7px";gutter.textContent=pad(hour)+":00";grid.append(gutter);
  days.forEach(d=>{
   const cell=document.createElement("div");cell.className="time-cell";const key=dateKey(d);
   cell.addEventListener("click",ev=>{if(ev.target===cell){state.selected=d;openNewAtHour(d,hour);}});
   state.occurrences.filter(o=>o.occurrenceDate===key&&o.occurrenceStart.getHours()===hour).forEach(o=>{
    const b=document.createElement("button");b.type="button";b.className="time-event";b.style.setProperty("--event-color",safeColor(o.creatorColor));b.textContent=o.title;
    const sm=document.createElement("small");sm.textContent=(o.all_day?"종일":formatTime(o.occurrenceStart)+"–"+formatTime(o.occurrenceEnd))+" · "+o.creatorName;b.append(sm);b.addEventListener("click",ev=>{ev.stopPropagation();openDayView(new Date(o.occurrenceDate+"T12:00:00"));});cell.append(b);
   });
   grid.append(cell);
  });
 }
 wrap.append(grid);host.append(wrap);
}
function renderAgenda(){
 const host=$("agendaList");host.replaceChildren();
 const dayKey=dateKey(state.selected);$("selectedDateLabel").textContent=formatDate(state.selected,{year:"numeric",month:"long",day:"numeric",weekday:"long"});
 const rows=state.occurrences.filter(o=>o.occurrenceDate===dayKey);
 if(!rows.length){const e=document.createElement("div");e.className="empty-state";e.textContent="이 날짜에는 아직 등록된 일정이 없어요.";host.append(e);return;}
 const groups=new Map();rows.forEach(o=>{if(!groups.has(o.creator_id))groups.set(o.creator_id,[]);groups.get(o.creator_id).push(o);});
 groups.forEach((items,userId)=>{
  const group=document.createElement("section");group.className="agenda-group";
  const head=document.createElement("div");head.className="agenda-owner";
  const dot=document.createElement("span");dot.className="agenda-color";dot.style.background=userColor(userId);
  const name=document.createElement("span");name.textContent=memberName(userId)+(userId===state.user.id?" (나)":"");
  head.append(dot,name);group.append(head);
  items.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="agenda-event";const time=document.createElement("span");time.className="agenda-time";time.textContent=o.all_day?"종일":formatTime(o.occurrenceStart)+"–"+formatTime(o.occurrenceEnd);const copy=document.createElement("span");copy.className="agenda-copy";const title=document.createElement("strong");title.textContent=o.title;const notes=document.createElement("small");notes.textContent=(CATEGORY[o.category]||"일반")+(o.notes?" · "+o.notes.slice(0,95):"");copy.append(title,notes);b.append(time,copy);b.addEventListener("click",()=>openDayView(state.selected));group.append(b);});
  host.append(group);
 });
}
function setView(view){state.view=view;render();}
function changePeriod(delta){
 if(state.view==="month")state.month=new Date(state.month.getFullYear(),state.month.getMonth()+delta,1),state.selected=new Date(state.month.getFullYear(),state.month.getMonth(),Math.min(state.selected.getDate(),new Date(state.month.getFullYear(),state.month.getMonth()+1,0).getDate()));
 else if(state.view==="week")state.selected.setDate(state.selected.getDate()+delta*7),state.month=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);
 else state.selected.setDate(state.selected.getDate()+delta),state.month=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);
 render();
}
function openCreateRoom(){
 state.selectedRoomUsers=[];$("roomForm").reset();$("roomSearchResults").replaceChildren();renderSelectedRoomUsers();$("roomDialog").showModal();$("roomName").focus();
}
function renderSelectedRoomUsers(){
 const host=$("roomSelectedUsers");host.replaceChildren();
 state.selectedRoomUsers.forEach(user=>{const pill=document.createElement("span");pill.className="user-pill";const label=document.createElement("span");label.textContent=user.display_name;const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.setAttribute("aria-label",user.display_name+" 선택 해제");remove.addEventListener("click",()=>{state.selectedRoomUsers=state.selectedRoomUsers.filter(x=>x.found_user_id!==user.found_user_id);renderSelectedRoomUsers();});pill.append(label,remove);host.append(pill);});
}
function scheduleSearch(inputId,resultsId,mode){
 const input=$(inputId);const key=mode;
 clearTimeout(state.searchTimers[key]);const query=input.value.trim();const token=(state.searchTokens[key]||0)+1;state.searchTokens[key]=token;
 if(query.length<2){$(resultsId).replaceChildren();return;}
 state.searchTimers[key]=setTimeout(async()=>{
  try{
   const {data,error}=await state.sb.rpc("rockey_calendar_search_users",{p_query:query});if(error)throw error;
   if(state.searchTokens[key]!==token)return;
   const host=$(resultsId);host.replaceChildren();
   const found=(data||[]).filter(u=>mode!=="create"||!state.selectedRoomUsers.some(x=>x.found_user_id===u.found_user_id));
   if(!found.length){const p=document.createElement("div");p.className="field-hint";p.textContent="검색 결과가 없거나 이미 선택한 사용자입니다.";host.append(p);return;}
   found.forEach(user=>{
    const b=document.createElement("button");b.type="button";b.className="search-result";
    if(user.profile_image){const img=document.createElement("img");img.src=user.profile_image;img.alt="";img.referrerPolicy="no-referrer";b.append(img);}else{const avatar=document.createElement("span");avatar.className="user-avatar";avatar.textContent=(user.display_name||"U").slice(0,1);b.append(avatar);}
    const copy=document.createElement("span");const strong=document.createElement("strong");strong.textContent=user.display_name;const small=document.createElement("small");small.textContent="돌이사이트 사용자";copy.append(strong,small);b.append(copy);
    b.addEventListener("click",()=>{if(mode==="create"){state.selectedRoomUsers.push(user);renderSelectedRoomUsers();input.value="";host.replaceChildren();}else void sendRoomInvite(user);});
    host.append(b);
   });
  }catch(e){console.error(e);$(resultsId).textContent="사용자를 검색하지 못했어요. 다시 시도해 주세요.";}
 },240);
}
async function sendRoomInvite(user){
 if(!state.room||state.roomRole!=="owner")return;
 try{
  const {error}=await state.sb.rpc("rockey_calendar_invite_user",{p_room_id:state.room.id,p_target_user_id:user.found_user_id});if(error)throw error;
  $("inviteUserSearch").value="";$("inviteSearchResults").replaceChildren();notice(user.display_name+"님에게 초대를 보냈어요. 상대방에게 사이트 알림이 전달됩니다.");
 }catch(e){notice(e.message||"초대하지 못했어요.",true);}
}
async function createRoom(ev){
 ev.preventDefault();const name=$("roomName").value.trim(),description=$("roomDescription").value.trim();if(name.length<2)return;
 const btn=$("createRoomSubmit");btn.disabled=true;
 try{
  const {data,error}=await state.sb.rpc("rockey_calendar_create_room",{p_name:name,p_description:description});if(error)throw error;
  const roomId=data;let sent=0,failed=[];
  for(const user of state.selectedRoomUsers){const res=await state.sb.rpc("rockey_calendar_invite_user",{p_room_id:roomId,p_target_user_id:user.found_user_id});if(res.error)failed.push(user.display_name);else sent++;}
  $("roomDialog").close();await loadRooms(roomId);
  if(failed.length)notice("캘린더를 만들었지만 일부 초대에 실패했어요: "+failed.join(", "),true);
  else notice("공유 캘린더를 만들었어요."+(sent?" "+sent+"명에게 초대 알림을 보냈습니다.":" 초대할 사용자를 추가해 주세요."));
 }catch(e){notice(e.message||"캘린더를 만들지 못했어요.",true);}
 finally{btn.disabled=false;}
}
function openInviteDialog(){if(state.roomRole!=="owner")return;$("inviteUserSearch").value="";$("inviteSearchResults").replaceChildren();$("inviteDialog").showModal();$("inviteUserSearch").focus();}
function openNewAtHour(day,hour){if(state.members.length<2)return;state.selected=day;openEventEditor(null,new Date(day.getFullYear(),day.getMonth(),day.getDate(),hour,0));}
function openEventEditor(event=null,atDate=null){
 if(state.members.length<2){notice("두 명 이상이 참여해야 일정을 등록할 수 있어요.",true);return;}
 state.editing=event||null;$("eventForm").reset();$("eventDialogTitle").textContent=event?"일정 수정":"새 일정 추가";
 const start=event?new Date(event.starts_at):(atDate||new Date(state.selected.getFullYear(),state.selected.getMonth(),state.selected.getDate(),9,0));
 const end=event?new Date(event.ends_at):new Date(start.getTime()+60*60*1000);
 $("eventStart").value=localInputValue(start);$("eventEnd").value=localInputValue(end);
 $("eventTitle").value=event?.title||"";$("eventNotes").value=event?.notes||"";$("eventCategory").value=event?.category||"general";$("allDay").checked=!!event?.all_day;
 $("recurrenceFrequency").value=event?.recurrence_frequency||"none";$("recurrenceInterval").value=event?.recurrence_interval||2;$("recurrenceUntil").value=event?.recurrence_until||"";
 const day=event?.recurrence_month_day||start.getDate();$("recurrenceMonthDay").value=String(day);$("recurrenceYearDay").value=String(day);$("recurrenceMonth").value=String(event?.recurrence_month||start.getMonth()+1);
 document.querySelectorAll("#weekdayOptions input").forEach(box=>{const days=event?.recurrence_weekdays?.length?event.recurrence_weekdays:[start.getDay()];box.checked=days.includes(Number(box.value));});
 $("eventColorPreview").textContent=memberName(state.user.id)+"님의 일정 색상";$("eventColorPreview").style.borderColor=safeColor(userColor(state.user.id));$("eventColorPreview").style.borderLeft="4px solid "+safeColor(userColor(state.user.id));
 $("deleteEventButton").hidden=!event||!userCanManage(event);
 ["eventTitle","eventStart","eventEnd","eventNotes","eventCategory","allDay","recurrenceFrequency","recurrenceInterval","recurrenceUntil","recurrenceMonthDay","recurrenceMonth","recurrenceYearDay"].forEach(id=>$(id).disabled=!!event&&!userCanManage(event));
 document.querySelectorAll("#weekdayOptions input").forEach(box=>box.disabled=!!event&&!userCanManage(event));
 setRecurrenceUI();$("eventDialog").showModal();
}
function setRecurrenceUI(){
 const f=$("recurrenceFrequency").value;
 $("weekdayOptions").hidden=f!=="weekly";
 $("recurrenceIntervalOptions").hidden=f!=="interval_days";
 $("recurrenceMonthOptions").hidden=f!=="monthly";
 $("recurrenceYearOptions").hidden=f!=="yearly";
 $("recurrenceUntilOptions").hidden=f==="none";
 const summary={none:"한 번만 표시되는 일정입니다.",daily:"매일 같은 시간에 반복됩니다.",weekly:"선택한 요일마다 반복됩니다.",monthly:"매달 지정한 날짜에 반복됩니다.",yearly:"매년 지정한 월과 날짜에 반복됩니다.",interval_days:"입력한 일수 간격으로 반복됩니다."};
 $("recurrenceSummary").textContent=summary[f]||"";
}
function buildRecurrencePayload(){
 const f=$("recurrenceFrequency").value;let weekdays=[],monthDay=null,month=null,interval=1;
 if(f==="weekly"){weekdays=[...document.querySelectorAll("#weekdayOptions input:checked")].map(x=>Number(x.value));if(!weekdays.length)weekdays=[parseInputDate($("eventStart").value).getDay()];}
 if(f==="monthly")monthDay=Number($("recurrenceMonthDay").value);
 if(f==="yearly"){month=Number($("recurrenceMonth").value);monthDay=Number($("recurrenceYearDay").value);}
 if(f==="interval_days")interval=Math.max(1,Math.min(365,Number($("recurrenceInterval").value)||1));
 const until=f==="none"||!$("recurrenceUntil").value?null:$("recurrenceUntil").value;
 return {recurrence_frequency:f,recurrence_interval:interval,recurrence_weekdays:weekdays,recurrence_month_day:monthDay,recurrence_month:month,recurrence_until:until};
}
async function saveEvent(ev){
 ev.preventDefault();if(!state.room||state.members.length<2)return;
 const title=$("eventTitle").value.trim(),start=parseInputDate($("eventStart").value),end=parseInputDate($("eventEnd").value);
 if(!title||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){notice("제목과 시작·종료 시간을 확인해 주세요.",true);return;}
 const recurrence=buildRecurrencePayload();if(recurrence.recurrence_until&&recurrence.recurrence_until<dateKey(start)){notice("반복 종료일은 첫 일정 날짜보다 빠를 수 없어요.",true);return;}
 const payload={room_id:state.room.id,creator_id:state.editing?.creator_id||state.user.id,title,notes:$("eventNotes").value.trim(),starts_at:start.toISOString(),ends_at:end.toISOString(),all_day:$("allDay").checked,category:$("eventCategory").value,...recurrence};
 const btn=$("saveEventButton");btn.disabled=true;
 try{
  const result=state.editing?await state.sb.from(TABLES.events).update(payload).eq("id",state.editing.id).select().single():await state.sb.from(TABLES.events).insert(payload).select().single();
  if(result.error)throw result.error;
  $("eventDialog").close();state.selected=start;state.month=new Date(start.getFullYear(),start.getMonth(),1);await loadRoomData();
  notice(state.editing?"반복 일정을 포함해 일정 내용을 수정했어요.":"일정을 공유 캘린더에 추가했어요.");
 }catch(e){console.error(e);notice("일정을 저장하지 못했어요. "+(e.message||"권한과 네트워크를 확인해 주세요."),true);}
 finally{btn.disabled=false;state.editing=null;}
}
async function deleteEvent(){
 const e=state.editing;if(!e||!userCanManage(e))return;
 if(!confirm("이 일정을 삭제할까요? 반복 일정이라면 반복되는 전체 일정이 삭제됩니다."))return;
 try{const {error}=await state.sb.from(TABLES.events).delete().eq("id",e.id);if(error)throw error;$("eventDialog").close();state.editing=null;await loadRoomData();notice("일정을 삭제했어요.");}
 catch(err){notice("일정을 삭제하지 못했어요. "+(err.message||""),true);}
}
function recurrenceDescription(e){
 const f=e.recurrence_frequency||"none";if(f==="none")return "반복 없음";
 if(f==="daily")return "매일 반복";
 if(f==="weekly")return "매주 "+(e.recurrence_weekdays||[]).map(n=>WEEKDAYS[n]).join("·")+"요일";
 if(f==="monthly")return "매달 "+(e.recurrence_month_day||new Date(e.starts_at).getDate())+"일";
 if(f==="yearly")return "매년 "+(e.recurrence_month||new Date(e.starts_at).getMonth()+1)+"월 "+(e.recurrence_month_day||new Date(e.starts_at).getDate())+"일";
 if(f==="interval_days")return (e.recurrence_interval||1)+"일마다 반복";
 return "반복 일정";
}
function addDetailTag(text){const s=document.createElement("span");s.className="detail-tag";s.textContent=text;$("detailMeta").append(s);}
async function openDetail(occurrence){
 state.detail=occurrence;state.detailOccurrence=occurrence;$("detailTitle").textContent=occurrence.title;$("detailMeta").replaceChildren();
 addDetailTag(formatDate(occurrence.occurrenceStart,{year:"numeric",month:"long",day:"numeric",weekday:"long"}));
 addDetailTag(occurrence.all_day?"종일":formatTime(occurrence.occurrenceStart)+" – "+formatTime(occurrence.occurrenceEnd));
 addDetailTag(CATEGORY[occurrence.category]||"일반");addDetailTag(occurrence.creatorName);
 if(occurrence.recurrence_frequency!=="none")addDetailTag(recurrenceDescription(occurrence));
 $("detailNotes").textContent=occurrence.notes||"등록된 메모가 없습니다.";
 $("editEventButton").hidden=!userCanManage(occurrence);$("detailDialog").showModal();
}
function openDayView(date){
 const selected=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0);
 state.selected=selected;state.month=new Date(selected.getFullYear(),selected.getMonth(),1);state.activeDay=dateKey(selected);
 render();
 $("dayViewDate").textContent=formatDate(selected,{year:"numeric",month:"long",day:"numeric",weekday:"long"});
 $("dayCommentForm").reset();state.pendingMentions=[];renderPendingMentions();$("tagSuggestions").hidden=true;
 renderDaySchedules();
 $("dayViewDialog").showModal();
 void loadDayComments();
}
function renderDaySchedules(){
 const host=$("dayScheduleGroups");host.replaceChildren();
 const day=state.selected,until=new Date(dayStart(day));until.setDate(until.getDate()+1);
 const rows=occurrencesBetween(dayStart(day),until);
 $("dayScheduleCount").textContent=rows.length+"개";
 state.members.forEach(member=>{
  const items=rows.filter(o=>o.creator_id===member.member_user_id);
  const group=document.createElement("section");group.className="day-schedule-group";
  const head=document.createElement("div");head.className="day-schedule-owner";
  const dot=document.createElement("span");dot.className="agenda-color";dot.style.background=safeColor(member.member_color);
  const name=document.createElement("span");name.textContent=member.display_name+(member.member_user_id===state.user.id?" (나)":"");
  head.append(dot,name);group.append(head);
  if(!items.length){
   const empty=document.createElement("div");empty.className="empty-state";empty.textContent="이 날짜에 등록한 일정이 없습니다.";group.append(empty);
  }
  items.forEach(o=>{
   const card=document.createElement("article");card.className="day-schedule-card";
   const time=document.createElement("div");time.className="day-schedule-time";
   time.textContent=o.all_day?"종일":formatTime(o.occurrenceStart)+" – "+formatTime(o.occurrenceEnd);
   const copy=document.createElement("div");copy.className="day-schedule-copy";
   const title=document.createElement("strong");title.textContent=o.title;
   const notes=document.createElement("p");notes.textContent=o.notes||"별도 메모가 없습니다.";
   const tags=document.createElement("div");tags.className="day-schedule-tags";
   [CATEGORY[o.category]||"일반",o.recurrence_frequency!=="none"?recurrenceDescription(o):"반복 없음"].forEach(value=>{const tag=document.createElement("span");tag.textContent=value;tags.append(tag);});
   copy.append(title,notes,tags);card.append(time,copy);
   if(userCanManage(o)){
    const edit=document.createElement("button");edit.type="button";edit.className="day-schedule-edit";edit.textContent="수정";
    edit.addEventListener("click",()=>{$("dayViewDialog").close();const base=state.events.find(e=>e.id===o.id)||o;openEventEditor(base);});
    card.append(edit);
   }
   group.append(card);
  });
  host.append(group);
 });
}
async function loadDayComments(){
 if(!state.room||!state.activeDay||!state.user)return;
 const host=$("dayCommentList");host.innerHTML='<div class="empty-state">하루 공유 댓글을 불러오는 중이에요.</div>';
 try{
  const {data:comments,error}=await state.sb.from(TABLES.dayComments)
   .select("id,room_id,comment_date,author_id,body,created_at")
   .eq("room_id",state.room.id).eq("comment_date",state.activeDay).order("created_at",{ascending:true});
  if(error)throw error;
  state.dayComments=comments||[];
  if(state.dayComments.length){
   const ownReads=state.dayComments.filter(comment=>comment.author_id!==state.user.id)
    .map(comment=>({comment_id:comment.id,room_id:state.room.id,reader_id:state.user.id}));
   if(ownReads.length){
    const readResult=await state.sb.from(TABLES.dayReads).upsert(ownReads,{onConflict:"comment_id,reader_id",ignoreDuplicates:true});
    if(readResult.error)console.warn("[ROCKEY Calendar] 읽음 기록 저장 실패:",readResult.error.message);
   }
   const ids=state.dayComments.map(comment=>comment.id);
   const {data:reads,error:readError}=await state.sb.from(TABLES.dayReads)
    .select("comment_id,reader_id,read_at").eq("room_id",state.room.id).in("comment_id",ids);
   if(readError)throw readError;
   state.dayReads=reads||[];
  }else state.dayReads=[];
  renderDayComments();
 }catch(error){
  console.error("[ROCKEY Calendar] 하루 댓글 조회 실패:",error);
  host.innerHTML='<div class="empty-state">공유 댓글을 불러오지 못했어요. 연결을 확인해 주세요.</div>';
 }
}
function renderDayComments(){
 const host=$("dayCommentList");host.replaceChildren();
 const comments=state.dayComments||[];$("dayCommentCount").textContent=comments.length+"개";
 if(!comments.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="이 날짜의 첫 댓글을 남겨 보세요. 이 댓글창은 모든 참여자가 함께 사용합니다.";host.append(empty);return;}
 comments.forEach(comment=>{
  const row=document.createElement("article");row.className="day-comment-item";row.style.setProperty("--comment-color",userColor(comment.author_id));
  const head=document.createElement("div");head.className="day-comment-head";
  const avatar=document.createElement("span");avatar.className="day-comment-avatar";avatar.textContent=memberName(comment.author_id).slice(0,1);
  const author=document.createElement("strong");author.className="day-comment-author";author.textContent=memberName(comment.author_id)+(comment.author_id===state.user.id?" (나)":"");
  const time=document.createElement("time");time.className="day-comment-time";time.textContent=formatDate(new Date(comment.created_at),{month:"numeric",day:"numeric"})+" "+formatTime(new Date(comment.created_at));
  head.append(avatar,author,time);
  const body=document.createElement("div");body.className="day-comment-body";body.textContent=comment.body;
  const receipts=state.dayReads.filter(read=>read.comment_id===comment.id);
  const readerNames=receipts.map(read=>memberName(read.reader_id));
  const eligibleReaders=Math.max(0,state.members.length-(comment.author_id===state.user.id?1:1));
  const readLine=document.createElement("div");readLine.className="day-comment-readers";
  const summary=document.createElement("strong");summary.textContent="읽음 "+receipts.length+"/"+eligibleReaders+"명";
  const names=document.createElement("span");names.textContent=readerNames.length?" · "+readerNames.join(", "):" · 아직 읽은 사람이 없습니다.";
  readLine.append(summary,names);
  row.append(head,body,readLine);host.append(row);
 });
}
function renderPendingMentions(){
 const host=$("pendingMentions");host.replaceChildren();
 state.pendingMentions.forEach(user=>{
  const pill=document.createElement("span");pill.className="mention-pill";
  const label=document.createElement("span");label.textContent="@"+user.display_name;
  const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.setAttribute("aria-label",user.display_name+" 태그 제거");
  remove.addEventListener("click",()=>{
   const textarea=$("dayCommentBody");const token="@"+user.display_name;
   const index=textarea.value.indexOf(token);if(index>=0)textarea.setRangeText("",index,index+token.length,"end");
   state.pendingMentions=state.pendingMentions.filter(item=>item.member_user_id!==user.member_user_id);renderPendingMentions();updateTagSuggestions();
  });
  pill.append(label,remove);host.append(pill);
 });
}
function updateTagSuggestions(){
 const textarea=$("dayCommentBody"),host=$("tagSuggestions"),caret=textarea.selectionStart||0,before=textarea.value.slice(0,caret);
 const match=before.match(/(^|\\s)@([^\\s@]*)$/u);
 if(!match){host.hidden=true;host.replaceChildren();return;}
 const query=match[2].toLocaleLowerCase("ko-KR");
 const matches=state.members.filter(member=>member.member_user_id!==state.user.id&&
  member.display_name.toLocaleLowerCase("ko-KR").includes(query)&&
  !state.pendingMentions.some(selected=>selected.member_user_id===member.member_user_id)).slice(0,8);
 host.replaceChildren();
 if(!matches.length){host.hidden=true;return;}
 matches.forEach(member=>{
  const button=document.createElement("button");button.type="button";button.className="tag-option";
  const avatar=document.createElement("span");avatar.className="member-avatar";avatar.style.setProperty("--member-color",safeColor(member.member_color));avatar.textContent=member.display_name.slice(0,1);
  const label=document.createElement("span");label.textContent="@"+member.display_name;
  button.append(avatar,label);
  button.addEventListener("mousedown",event=>event.preventDefault());
  button.addEventListener("click",()=>insertMention(member));
  host.append(button);
 });
 host.hidden=false;
}
function insertMention(member){
 const textarea=$("dayCommentBody"),caret=textarea.selectionStart||0,before=textarea.value.slice(0,caret),at=before.lastIndexOf("@");
 if(at<0)return;
 textarea.setRangeText("@"+member.display_name+" ",at,caret,"end");
 if(!state.pendingMentions.some(item=>item.member_user_id===member.member_user_id))state.pendingMentions.push(member);
 renderPendingMentions();updateTagSuggestions();textarea.focus();
}
async function postDayComment(event){
 event.preventDefault();const body=$("dayCommentBody").value.trim();
 if(!body||!state.room||!state.activeDay)return;
 const mentioned=state.pendingMentions.filter(member=>body.includes("@"+member.display_name)).map(member=>member.member_user_id);
 const button=$("postDayComment");button.disabled=true;
 try{
  const {error}=await state.sb.rpc("rockey_calendar_post_day_comment",{
   p_room_id:state.room.id,p_comment_date:state.activeDay,p_body:body,p_mentioned_user_ids:mentioned
  });
  if(error)throw error;
  $("dayCommentBody").value="";state.pendingMentions=[];renderPendingMentions();$("tagSuggestions").hidden=true;
  await loadDayComments();
 }catch(error){
  console.error("[ROCKEY Calendar] 댓글 작성 실패:",error);
  const message=document.createElement("div");message.className="empty-state";message.style.color="#ffb7bd";message.textContent="댓글을 등록하지 못했어요. "+(error.message||"다시 시도해 주세요.");
  $("dayCommentList").prepend(message);
 }finally{button.disabled=false;}
}
async function loadRoomData(){
 if(!state.room)return;
 const [mr,er]=await Promise.all([
  state.sb.rpc("rockey_calendar_room_members",{p_room_id:state.room.id}),
  state.sb.from(TABLES.events).select("*").eq("room_id",state.room.id).order("starts_at",{ascending:true})
 ]);
 if(mr.error)throw mr.error;if(er.error)throw er.error;
 state.members=mr.data||[];state.memberMap=new Map(state.members.map(m=>[m.member_user_id,m]));state.roomRole=state.members.find(m=>m.member_user_id===state.user.id)?.role||"member";state.events=er.data||[];
 renderRoomHeader();render();
}
function subscribeRoom(roomId){
 if(state.channel)state.sb.removeChannel(state.channel);
 state.channel=state.sb.channel("rockey-calendar-room-"+roomId)
  .on("postgres_changes",{event:"*",schema:"public",table:TABLES.events,filter:"room_id=eq."+roomId},()=>{loadRoomData().catch(console.error);})
  .on("postgres_changes",{event:"*",schema:"public",table:TABLES.members,filter:"room_id=eq."+roomId},()=>{loadRoomData().catch(console.error);})
  .on("postgres_changes",{event:"*",schema:"public",table:TABLES.dayComments,filter:"room_id=eq."+roomId},()=>{if($("dayViewDialog").open)loadDayComments();})
  .on("postgres_changes",{event:"*",schema:"public",table:TABLES.dayReads,filter:"room_id=eq."+roomId},()=>{if($("dayViewDialog").open)loadDayComments();})
  .subscribe(status=>{$("liveState").textContent=status==="SUBSCRIBED"?"실시간 연결":"연결 중";});
}
function fillRecurrenceSelectors(){
 const monthDay=$("recurrenceMonthDay"),yearDay=$("recurrenceYearDay"),month=$("recurrenceMonth");
 for(let d=1;d<=31;d++){const a=document.createElement("option");a.value=String(d);a.textContent=d+"일";monthDay.append(a.cloneNode(true));yearDay.append(a);}
 for(let m=1;m<=12;m++){const o=document.createElement("option");o.value=String(m);o.textContent=m+"월";month.append(o);}
}
function wire(){
 $("createRoomButton").addEventListener("click",openCreateRoom);$("createRoomSubmit").addEventListener("click",()=>{});
 $("roomForm").addEventListener("submit",createRoom);$("roomUserSearch").addEventListener("input",()=>scheduleSearch("roomUserSearch","roomSearchResults","create"));
 $("inviteUserSearch").addEventListener("input",()=>scheduleSearch("inviteUserSearch","inviteSearchResults","invite"));
 $("roomInviteButton").addEventListener("click",openInviteDialog);$("lockedInviteButton").addEventListener("click",openInviteDialog);
 $("addEventButton").addEventListener("click",()=>openEventEditor());$("eventForm").addEventListener("submit",saveEvent);$("deleteEventButton").addEventListener("click",deleteEvent);
 $("dayCommentForm").addEventListener("submit",postDayComment);$("dayCommentBody").addEventListener("input",updateTagSuggestions);$("dayCommentBody").addEventListener("click",updateTagSuggestions);$("dayCommentBody").addEventListener("keyup",updateTagSuggestions);$("editEventButton").addEventListener("click",()=>{const e=state.detailOccurrence;$("detailDialog").close();openEventEditor(e);});
 $("recurrenceFrequency").addEventListener("change",setRecurrenceUI);
 $("prevPeriod").addEventListener("click",()=>changePeriod(-1));$("nextPeriod").addEventListener("click",()=>changePeriod(1));
 $("goToday").addEventListener("click",()=>{state.selected=new Date();state.month=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);render();});
 document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
 document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
 ["roomDialog","inviteDialog","eventDialog","detailDialog","dayViewDialog"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target===$(id))$(id).close();}));
 $("allDay").addEventListener("change",()=>{if($("allDay").checked){const s=$("eventStart").value.slice(0,10),e=$("eventEnd").value.slice(0,10);$("eventStart").value=s+"T00:00";$("eventEnd").value=e+"T23:59";}});
}
async function init(){
 try{
  fillRecurrenceSelectors();wire();const sb=getClient();const {data:{session},error}=await sb.auth.getSession();if(error)throw error;
  if(!session?.user){$("loginLink").hidden=false;showLoginRequired();$("roomList").innerHTML='<div class="empty-state">로그인한 뒤 내 공유 캘린더와 초대를 확인할 수 있어요.</div>';return;}
  state.user=session.user;$("loginLink").hidden=true;
  await loadRooms(new URLSearchParams(location.search).get("room"));
  if(new URLSearchParams(location.search).get("joined")==="1")notice("공유 캘린더 참여가 완료됐어요.");
  sb.auth.onAuthStateChange((_event,next)=>{if(!next?.user){location.href="./login.html";}});
  window.addEventListener("focus",()=>{if(state.room)loadRoomData().catch(console.error);});
 }catch(e){console.error("[ROCKEY Calendar]",e);notice("공유 캘린더를 초기화하지 못했어요. "+(e.message||"연결 상태를 확인해 주세요."),true);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else void init();
})();