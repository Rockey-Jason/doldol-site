(() => {
"use strict";
const URL="https://scttowfhygcpdirrekqm.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
let db=null,clientPromise=null,authBound=false;
function sharedClient(){return window.doriSupabase||window.supabaseClient||window.sb||null}
async function getClient(){
 if(db)return db;
 if(!clientPromise)clientPromise=(async()=>{
  for(let i=0;i<120;i++){
   const shared=sharedClient();
   if(shared){db=shared;return db}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  let createClient=window.supabase&&window.supabase.createClient;
  if(!createClient){
   const module=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
   createClient=module.createClient;
  }
  const latest=sharedClient();
  const client=latest||createClient(URL,KEY);
  if(!window.doriSupabase)window.doriSupabase=client;
  db=sharedClient()||client;
  return db;
 })();
 return clientPromise;
}
const $=id=>document.getElementById(id);
const items=[
{id:"vip_marble_corgi_statue",name:"화이트 마블 돌이 조각상"},
{id:"vip_royal_crown_collectible",name:"로열 골드 왕관 오브제"},
{id:"vip_aurora_crystal_collectible",name:"오로라 크리스탈 장식"}
];
const levels={1:"일반",2:"프리미엄",3:"돌프리미엄",4:"돌돌프리미엄",5:"돌돌돌프리미엄",6:"돌돌돌돌프리미엄",7:"돌돌돌돌돌프리미엄",8:"유사돌이",9:"돌이",10:"관리자"};
const BOOKS=window.DoriLoungeBooks||[];
let user=null,profile=null,owned=new Set(),prefs={theme:"marble",ambient:true,draft:"",favorites:[],visit:null};
let storeKey="dori-lounge:guest",bookStoreKey="dori-lounge-books:guest",toastTimer=0;
let bookState={progress:{},favorites:[],bookmarks:{},fontScale:1};
let activeBook=null,activeChapter=0,savedReaderScroll=0,readerScrollTimer=0;
const format=n=>Number(n||0).toLocaleString("ko-KR");
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(prefs))}catch(e){toast("브라우저 저장 공간을 확인해 주세요.")}}
function read(){
 try{const v=JSON.parse(localStorage.getItem(storeKey)||"null");if(v&&typeof v==="object")prefs={...prefs,...v}}catch(e){}
 if(!["marble","midnight","rose"].includes(prefs.theme))prefs.theme="marble";
 if(!Array.isArray(prefs.favorites))prefs.favorites=[];
 delete prefs.note;
 document.body.dataset.theme=prefs.theme;
 document.body.classList.toggle("ambient-on",prefs.ambient!==false);
 $("supportDraft").value=prefs.draft||"";
 paintPrefs();counter();save();
}
function paintPrefs(){
 document.body.dataset.theme=prefs.theme;
 document.body.classList.toggle("ambient-on",prefs.ambient!==false);
 document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("selected",b.dataset.themeChoice===prefs.theme));
 $("ambientToggle").setAttribute("aria-checked",String(prefs.ambient!==false));
 document.querySelectorAll("[data-favorite]").forEach(b=>{const yes=prefs.favorites.includes(b.dataset.favorite);b.setAttribute("aria-pressed",String(yes));b.textContent=yes?"♥":"♡"});
}
function counter(){$("draftCount").textContent=$("supportDraft").value.length+" / 1,500"}
function showLock(title,desc){$("lockTitle").textContent=title;$("lockDescription").textContent=desc;$("lockPanel").classList.add("show");$("loungeApp").classList.remove("show")}
function nav(name){
 const panel=document.querySelector('[data-view-panel="'+name+'"]');if(!panel)return;
 document.querySelectorAll("[data-view-panel]").forEach(p=>p.classList.toggle("active",p===panel));
 document.querySelectorAll(".room-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 try{history.replaceState(null,"","#"+name)}catch(e){}
 if(name==="shop")paintShop();
 if(name==="library")renderBooks();
 window.scrollTo({top:document.querySelector(".room-nav").offsetTop-10,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function greeting(){
 const h=new Date().getHours();
 $("greeting").textContent=h<6?"고요한 밤, 라운지에서 쉬어가세요.":h<12?"좋은 아침이에요.":h<18?"오늘도 특별한 오후를 보내세요.":"편안한 저녁, 라운지에 오신 것을 환영해요.";
 $("todayLabel").textContent=new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date());
 const quotes=["천천히 둘러보세요. 이 공간은 당신의 속도에 맞춰 열려 있습니다.","작은 휴식이 하루의 리듬을 바꿔줄 수 있어요.","좋아하는 것을 모으고 새로운 생각을 발견하는 하루가 되길.","잠시 멈춰도 괜찮아요. 나만의 속도로 다시 시작하면 됩니다."];
 $("dailyQuote").textContent=quotes[Math.floor(new Date().getDate()/2)%quotes.length];
}
function updateVisit(){
 const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const today=date(new Date()),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const old=prefs.visit||{};let count=Number(old.count||0),streak=Number(old.streak||0);
 if(old.last!==today){count++;streak=old.last===date(yesterday)?streak+1:1;prefs.visit={last:today,count,streak};save()}
 $("visitSummary").textContent="이 브라우저에서 "+count+"번째 방문 · 연속 "+streak+"일";
}
function member(profileData,session){
 const level=Number(profileData.user_level||1);
 $("memberName").textContent=profileData.name||session.user.email||"돌이 월드 회원";
 $("memberSub").textContent=profileData.equipped_title?"칭호 · "+profileData.equipped_title:"로열 라운지 회원";
 $("memberLevel").textContent=profileData.is_admin===true?"관리자":(levels[level]||"레벨 "+level);
 $("memberNumber").textContent="회원 번호 "+(profileData.user_number==null?"—":format(profileData.user_number));
 $("memberCoins").textContent=format(profileData.doldolcoin)+" C";
 $("memberAvatar").textContent="♛";
 const src=String(profileData.profile_image||"");
 if(/^https?:\/\//i.test(src)){const img=document.createElement("img");img.src=src;img.alt="";img.referrerPolicy="no-referrer";img.onerror=()=>{img.remove();$("memberAvatar").textContent="♛"};$("memberAvatar").replaceChildren(img)}
 profile=profileData;
}
function paintOwned(){
 $("ownedCount").textContent=owned.size+" / "+items.length;
 document.querySelectorAll("[data-collection-item]").forEach(card=>{const yes=owned.has(card.dataset.collectionItem),label=card.querySelector("[data-owned-label]");label.textContent=yes?"✓ 보유 중":"미보유";label.className=yes?"owned-label":"not-owned"});
}
function paintShop(){
 const q=$("shopSearch").value.trim().toLowerCase();let count=0;
 document.querySelectorAll(".shop-card").forEach(card=>{
  const show=!q||card.dataset.name.toLowerCase().includes(q);card.classList.toggle("hidden",!show);if(show)count++;
  const button=card.querySelector("[data-buy]"),isOwned=owned.has(card.dataset.item);
  button.disabled=isOwned||button.dataset.loading==="true";
  if(button.dataset.loading!=="true")button.textContent=isOwned?"✓ 보유 중":"구매하기";
  button.onclick=()=>buy(card.dataset.item,button);
 });
 $("shopCount").textContent="검색 결과 "+count+"종";
}

function loadBookState(){
 try{
  const saved=JSON.parse(localStorage.getItem(bookStoreKey)||"null");
  bookState={progress:{},favorites:[],bookmarks:{},fontScale:1,...(saved||{})};
 }catch(e){bookState={progress:{},favorites:[],bookmarks:{},fontScale:1}}
 if(!bookState.progress||typeof bookState.progress!=="object")bookState.progress={};
 if(!Array.isArray(bookState.favorites))bookState.favorites=[];
 if(!bookState.bookmarks||typeof bookState.bookmarks!=="object")bookState.bookmarks={};
 bookState.fontScale=Math.max(.85,Math.min(1.4,Number(bookState.fontScale)||1));
 renderBooks();
}
function saveBookState(){
 try{localStorage.setItem(bookStoreKey,JSON.stringify(bookState))}
 catch(e){toast("독서 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.")}
}
function bookProgress(book){return bookState.progress[book.id]||null}
function bookmarkList(bookId){return Array.isArray(bookState.bookmarks[bookId])?bookState.bookmarks[bookId]:[]}
function renderBooks(){
 const grid=$("bookshelfGrid");if(!grid)return;
 const query=String($("bookSearch").value||"").trim().toLocaleLowerCase("ko-KR");
 const activeFilter=document.querySelector("[data-book-filter].active");
 const filter=activeFilter?activeFilter.dataset.bookFilter:"all";
 const visible=BOOKS.filter(book=>{
  const progress=bookProgress(book);
  const bookmarks=bookmarkList(book.id);
  const haystack=[book.title,book.subtitle,book.part,book.genre,book.description,book.author].join(" ").toLocaleLowerCase("ko-KR");
  if(query&&!haystack.includes(query))return false;
  if(filter==="continue"&&!progress)return false;
  if(filter==="favorites"&&!bookState.favorites.includes(book.id))return false;
  if(filter==="bookmarks"&&!bookmarks.length)return false;
  return true;
 });
 grid.replaceChildren();
 visible.forEach(book=>{
  const progress=bookProgress(book);
  const chapterIndex=progress?Math.min(Number(progress.chapter)||0,book.chapters.length-1):0;
  const scroll=progress&&progress.chapter===chapterIndex?Math.max(0,Math.min(1,Number(progress.scroll)||0)):0;
  const completed=Boolean(progress&&progress.completed);
  const percent=completed?100:Math.max(0,Math.min(99,Math.round(((chapterIndex+scroll)/book.chapters.length)*100)));
  const favorite=bookState.favorites.includes(book.id);
  const card=document.createElement("article");card.className="book-card";
  const cover=document.createElement("div");cover.className="book-cover "+(book.cover||"");
  const coverTop=document.createElement("div");coverTop.className="book-cover-top";coverTop.textContent="DORI WORLD LIBRARY";
  const symbol=document.createElement("div");symbol.className="book-cover-symbol";symbol.textContent=book.cover==="virus"?"◎":"✧";
  const coverTitle=document.createElement("div");coverTitle.className="book-cover-title";coverTitle.textContent=book.title;
  const coverBottom=document.createElement("div");coverBottom.className="book-cover-bottom";coverBottom.textContent=book.volume;
  cover.append(coverTop,symbol,coverTitle,coverBottom);
  const content=document.createElement("div");content.className="book-card-content";
  const meta=document.createElement("div");meta.className="book-card-meta";
  const genre=document.createElement("span");genre.className="book-tag";genre.textContent=book.genre;
  const volume=document.createElement("span");volume.textContent=book.volume;
  meta.append(genre,volume);
  const title=document.createElement("h3");title.textContent=book.title;
  const subtitle=document.createElement("p");subtitle.className="book-card-subtitle";subtitle.textContent=book.subtitle;
  const desc=document.createElement("p");desc.className="book-card-description";desc.textContent=book.description;
  const progressBlock=document.createElement("div");progressBlock.className="book-progress-block";
  const label=document.createElement("div");label.className="book-progress-label";
  const status=document.createElement("span");status.textContent=completed?"완독":progress?"독서 진행 중":"아직 읽지 않음";
  const progressText=document.createElement("span");progressText.textContent=percent+"%";
  label.append(status,progressText);
  const track=document.createElement("div");track.className="book-progress-track";
  const fill=document.createElement("span");fill.style.width=percent+"%";track.append(fill);
  progressBlock.append(label,track);
  const actions=document.createElement("div");actions.className="book-card-actions";
  const readButton=document.createElement("button");readButton.type="button";readButton.className="book-read-btn";readButton.textContent=progress?"이어서 읽기":"첫 장 읽기";
  readButton.addEventListener("click",()=>openBook(book.id,progress?chapterIndex:0));
  const favoriteButton=document.createElement("button");favoriteButton.type="button";favoriteButton.className="book-favorite";favoriteButton.setAttribute("aria-pressed",String(favorite));favoriteButton.setAttribute("aria-label",favorite?"즐겨찾기에서 제거":"즐겨찾기에 추가");favoriteButton.textContent=favorite?"♥":"♡";
  favoriteButton.addEventListener("click",()=>{
   bookState.favorites=favorite?bookState.favorites.filter(id=>id!==book.id):[...bookState.favorites,book.id];
   saveBookState();renderBooks();toast(favorite?"즐겨찾기에서 제거했어요.":"즐겨찾기에 추가했어요.");
  });
  actions.append(readButton,favoriteButton);
  const cardStatus=document.createElement("div");cardStatus.className="book-card-status";
  const marked=bookmarkList(book.id).length;
  cardStatus.textContent=book.chapters.length+"개 장 · 책갈피 "+marked+"개";
  content.append(meta,title,subtitle,desc,progressBlock,actions,cardStatus);
  card.append(cover,content);grid.append(card);
 });
 $("bookshelfEmpty").classList.toggle("hidden",visible.length>0);
 $("bookShelfCount").textContent="등록 도서 "+BOOKS.length+"권 · 검색 결과 "+visible.length+"권";
 const completed=BOOKS.filter(book=>bookProgress(book)&&bookProgress(book).completed).length;
 const totalBookmarks=BOOKS.reduce((sum,book)=>sum+bookmarkList(book.id).length,0);
 $("bookShelfProgress").textContent="완독 "+completed+"권 · 책갈피 "+totalBookmarks+"개";
}
function updateReaderProgress(){
 if(!activeBook)return;
 const body=$("bookReaderBody");
 const max=Math.max(0,body.scrollHeight-body.clientHeight);
 const ratio=max>0?Math.max(0,Math.min(1,body.scrollTop/max)):0;
 const percent=Math.min(100,Math.round(((activeChapter+ratio)/activeBook.chapters.length)*100));
 $("bookReaderProgressBar").style.width=percent+"%";
 $("bookReaderPercent").textContent=percent+"%";
}
function saveReaderProgress(){
 if(!activeBook)return;
 const body=$("bookReaderBody");
 const max=Math.max(0,body.scrollHeight-body.clientHeight);
 const ratio=max>0?Math.max(0,Math.min(1,body.scrollTop/max)):0;
 const complete=activeChapter===activeBook.chapters.length-1&&ratio>=.96;
 bookState.progress[activeBook.id]={chapter:activeChapter,scroll:ratio,completed:complete,updatedAt:new Date().toISOString()};
 saveBookState();updateReaderProgress();renderBooks();
}
function renderReader(){
 if(!activeBook)return;
 const chapter=activeBook.chapters[activeChapter];
 $("bookReaderMeta").textContent=activeBook.part+" · "+activeBook.volume+" · "+activeBook.author;
 $("bookReaderTitle").textContent=activeBook.title;
 $("bookReaderSubtitle").textContent=activeBook.subtitle;
 $("readerChapterKicker").textContent="CHAPTER "+String(activeChapter+1).padStart(2,"0")+" / "+String(activeBook.chapters.length).padStart(2,"0");
 $("readerChapterTitle").textContent=chapter.title;
 const select=$("readerChapterSelect");select.replaceChildren();
 activeBook.chapters.forEach((item,index)=>{const option=document.createElement("option");option.value=String(index);option.textContent=item.title;select.append(option)});
 select.value=String(activeChapter);
 const body=$("bookReaderBody");body.replaceChildren();
 String(chapter.content||"").split(/\n\s*\n/).filter(Boolean).forEach(text=>{
  const p=document.createElement("p");p.textContent=text;body.append(p);
 });
 const endmark=document.createElement("div");endmark.className="reader-endmark";endmark.textContent="❦";body.append(endmark);
 const progress=bookProgress(activeBook);
 savedReaderScroll=progress&&progress.chapter===activeChapter?Math.max(0,Math.min(1,Number(progress.scroll)||0)):0;
 document.querySelector(".book-reader-dialog").style.setProperty("--reader-font-scale",String(bookState.fontScale));
 $("readerBookmark").setAttribute("aria-pressed",String(bookmarkList(activeBook.id).includes(activeChapter)));
 $("readerBookmark").textContent=bookmarkList(activeBook.id).includes(activeChapter)?"♥ 책갈피 저장됨":"♡ 이 장 책갈피";
 $("readerPrev").disabled=activeChapter===0;
 $("readerNext").disabled=activeChapter===activeBook.chapters.length-1;
 $("readerNext").textContent=activeChapter===activeBook.chapters.length-1?"마지막 장":"다음 장 →";
 requestAnimationFrame(()=>{
  const max=Math.max(0,body.scrollHeight-body.clientHeight);
  body.scrollTop=max*savedReaderScroll;
  updateReaderProgress();
 });
}
function openBook(bookId,chapterIndex){
 const book=BOOKS.find(item=>item.id===bookId);if(!book)return;
 activeBook=book;
 const progress=bookProgress(book);
 activeChapter=Math.max(0,Math.min(book.chapters.length-1,Number(chapterIndex!=null?chapterIndex:progress&&progress.chapter)||0));
 $("bookReader").classList.add("open");$("bookReader").setAttribute("aria-hidden","false");
 document.body.style.overflow="hidden";
 renderReader();
 if(!progress){bookState.progress[book.id]={chapter:activeChapter,scroll:0,completed:false,updatedAt:new Date().toISOString()};saveBookState();renderBooks()}
}
function closeBookReader(){
 if(readerScrollTimer){clearTimeout(readerScrollTimer);readerScrollTimer=0}
 if(activeBook)saveReaderProgress();
 $("bookReader").classList.remove("open");$("bookReader").setAttribute("aria-hidden","true");
 document.body.style.overflow="";
 activeBook=null;
}
function changeReaderChapter(next){
 if(!activeBook)return;
 const target=Math.max(0,Math.min(activeBook.chapters.length-1,next));
 if(target===activeChapter)return;
 saveReaderProgress();activeChapter=target;renderReader();
 const progress=bookProgress(activeBook);
 if(progress){progress.chapter=activeChapter;progress.scroll=0;progress.completed=false;progress.updatedAt=new Date().toISOString();saveBookState()}
}
function wireBookReader(){
 document.querySelectorAll("[data-book-filter]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-book-filter]").forEach(item=>item.classList.toggle("active",item===button));
  renderBooks();
 }));
 $("bookSearch").addEventListener("input",renderBooks);
 $("bookReaderClose").addEventListener("click",closeBookReader);
 $("bookReader").addEventListener("click",event=>{if(event.target===$("bookReader"))closeBookReader()});
 $("readerPrev").addEventListener("click",()=>changeReaderChapter(activeChapter-1));
 $("readerNext").addEventListener("click",()=>changeReaderChapter(activeChapter+1));
 $("readerChapterSelect").addEventListener("change",event=>changeReaderChapter(Number(event.target.value)));
 $("readerBookmark").addEventListener("click",()=>{
  if(!activeBook)return;
  const list=bookmarkList(activeBook.id);
  bookState.bookmarks[activeBook.id]=list.includes(activeChapter)?list.filter(index=>index!==activeChapter):[...list,activeChapter].sort((a,b)=>a-b);
  saveBookState();renderReader();renderBooks();
  toast(bookmarkList(activeBook.id).includes(activeChapter)?"이 장을 책갈피에 저장했어요.":"책갈피를 해제했어요.");
 });
 $("readerFontDown").addEventListener("click",()=>{
  bookState.fontScale=Math.max(.85,Math.round((bookState.fontScale-.05)*100)/100);
  document.querySelector(".book-reader-dialog").style.setProperty("--reader-font-scale",String(bookState.fontScale));
  saveBookState();
 });
 $("readerFontUp").addEventListener("click",()=>{
  bookState.fontScale=Math.min(1.4,Math.round((bookState.fontScale+.05)*100)/100);
  document.querySelector(".book-reader-dialog").style.setProperty("--reader-font-scale",String(bookState.fontScale));
  saveBookState();
 });
 $("bookReaderBody").addEventListener("scroll",()=>{
  updateReaderProgress();
  if(readerScrollTimer)clearTimeout(readerScrollTimer);
  readerScrollTimer=setTimeout(()=>{readerScrollTimer=0;saveReaderProgress()},220);
 },{passive:true});
 document.addEventListener("keydown",event=>{
  if(!$("bookReader").classList.contains("open"))return;
  if(event.key==="Escape"){closeBookReader();return}
  if(event.target.closest("input,select,textarea,button"))return;
  if(event.key==="ArrowLeft"&&activeChapter>0)changeReaderChapter(activeChapter-1);
  if(event.key==="ArrowRight"&&activeBook&&activeChapter<activeBook.chapters.length-1)changeReaderChapter(activeChapter+1);
 });
}
async function load(){
 let stage="인증 모듈 초기화";
 try{
  const client=await getClient();
  if(!client)throw new Error("Supabase client unavailable");
  if(!authBound){
   authBound=true;
   client.auth.onAuthStateChange(event=>{
    if(["SIGNED_IN","SIGNED_OUT","TOKEN_REFRESHED","USER_UPDATED"].includes(event))setTimeout(()=>void load(),0);
   });
  }
  stage="로그인 세션 확인";
  const {data:{session},error:authError}=await client.auth.getSession();
  if(authError)throw authError;
  if(!session){
   user=null;
   $("memberName").textContent="로그인이 필요합니다";
   $("memberSub").textContent="메인 사이트에서 로그인해 주세요.";
   $("memberLevel").textContent="비회원";
   $("memberNumber").textContent="회원 번호 —";
   $("memberCoins").textContent="—";
   $("ownedCount").textContent="—";
   setLock("먼저 로그인해 주세요","돌이사이트 메인에서 로그인한 뒤 이 페이지를 다시 방문해 주세요.");
   return;
  }
  user=session.user;
  storeKey="dori-lounge:v2:"+user.id;
  bookStoreKey="dori-lounge-books:v1:"+user.id;
  read();
  loadBookState();

  stage="회원 프로필 조회";
  let profileResult=await client.from("users")
   .select("name,user_number,user_level,is_admin,doldolcoin,equipped_title,profile_image")
   .eq("user_id",user.id).maybeSingle();
  if(profileResult.error && (Number(profileResult.error.status)===401 || /invalid jwt|jwt expired|token expired/i.test(String(profileResult.error.message||"")))){
   const refreshed=await client.auth.refreshSession();
   if(!refreshed.error&&refreshed.data&&refreshed.data.session){
    profileResult=await client.from("users")
     .select("name,user_number,user_level,is_admin,doldolcoin,equipped_title,profile_image")
     .eq("user_id",user.id).maybeSingle();
   }
  }
  if(profileResult.error)throw profileResult.error;
  const p=profileResult.data;
  if(!p){
   setLock("회원 프로필을 찾을 수 없습니다","로그인은 확인됐지만 현재 로그인 ID와 일치하는 users 회원 정보가 없습니다. 회원 프로필 연결이 필요합니다. 이 화면의 오류 코드는 PROFILE_NOT_FOUND 입니다.");
   console.error("Dori Lounge profile missing for authenticated user",user.id);
   return;
  }

  member(p,session);
  const level=Number(p.user_level||1);
  if(p.is_admin!==true&&level<2){
   setLock("VIP 멤버십이 필요합니다","현재 등급은 "+(levels[level]||"일반")+"입니다. 프리미엄 등급 이상부터 라운지를 이용할 수 있습니다.");
   return;
  }

  $("lockPanel").classList.remove("show");
  $("loungeApp").classList.add("show");

  stage="수집품 인벤토리 조회";
  const inventoryResult=await client.from("user_inventory")
   .select("item_id,purchased_at").eq("user_id",user.id).in("item_id",items.map(x=>x.id));
  if(inventoryResult.error){
   console.error("Dori Lounge inventory lookup failed",inventoryResult.error);
   owned=new Set();
   paintOwned();
   toast("회원 정보는 확인됐지만 수집품 보유 여부를 불러오지 못했습니다.");
  }else{
   owned=new Set((inventoryResult.data||[]).map(x=>x.item_id));
   paintOwned();
  }
  paintShop();
  renderBooks();
  updateVisit();
  greeting();
 }catch(e){
  console.error("Dori Lounge account load failed at: "+stage,e);
  const code=String(e&&e.code||e&&e.status||"UNKNOWN");
  let desc="단계: "+stage+" · 오류 코드: "+code+". 로그인 상태를 다시 확인하고 새로고침해 주세요.";
  if(/permission|policy|row.level|rls/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · 회원 데이터 조회 권한이 거부되었습니다. 로그인 계정의 RLS 접근 정책을 확인해야 합니다. 오류 코드: "+code;
  else if(/network|fetch|timeout/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · Supabase 서버에 연결하지 못했습니다. 네트워크 연결 후 다시 시도해 주세요.";
  else if(/column|schema cache|does not exist/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · 요청한 데이터 필드가 DB 구조와 일치하지 않습니다. 오류 코드: "+code;
  setLock("회원 정보 연결 오류",desc);
 }
}
async function buy(id,button){
 if(!db||!user){toast("로그인 상태를 확인해 주세요.");return}
 if(owned.has(id)){toast("이미 보유한 상품입니다.");return}
 button.disabled=true;button.dataset.loading="true";button.textContent="구매 처리 중…";
 try{
  const {data,error}=await db.rpc("purchase_vip_lounge_item",{p_item_id:id});if(error)throw error;
  const result=Array.isArray(data)?data[0]:data;if(!result||result.success!==true)throw new Error("Purchase not completed");
  $("memberCoins").textContent=format(result.doldolcoin)+" C";owned.add(id);paintOwned();paintShop();toast((result.item_name||"VIP 상품")+" 구매 완료!");
  if(window.DoriSound)window.DoriSound.play("success");
 }catch(e){
  const msg=String(e.message||"");
  if(/돌돌코인|부족/.test(msg))toast("돌돌코인이 부족합니다.");
  else if(/이미 보유|duplicate|23505/i.test(msg))toast("이미 보유한 상품입니다.");
  else if(/로그인|JWT|42501/i.test(msg))toast("로그인 또는 VIP 회원 권한을 확인해 주세요.");
  else toast("구매에 실패했습니다. 잠시 후 다시 시도해 주세요.");
 }finally{button.dataset.loading="false";paintShop()}
}
async function copy(value,message){
 try{
  if(navigator.clipboard&&isSecureContext)await navigator.clipboard.writeText(value);
  else{const el=document.createElement("textarea");el.value=value;el.style.position="fixed";el.style.opacity="0";document.body.appendChild(el);el.select();const ok=document.execCommand("copy");el.remove();if(!ok)throw new Error("copy")}
  toast(message);
 }catch(e){toast("복사하지 못했습니다. 내용을 직접 선택해 주세요.")}
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.view)));
document.querySelectorAll("[data-open-view]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.openView)));
document.querySelectorAll("[data-theme-choice]").forEach(b=>b.addEventListener("click",()=>{prefs.theme=b.dataset.themeChoice;paintPrefs();save();toast("라운지 테마를 변경했어요.")}));
$("ambientToggle").addEventListener("click",()=>{prefs.ambient=!(prefs.ambient!==false);paintPrefs();save();toast(prefs.ambient?"장식 효과를 켰어요.":"장식 효과를 껐어요.")});
$("supportDraft").addEventListener("input",()=>{prefs.draft=$("supportDraft").value;save();counter();$("draftStatus").textContent="현재 기기에 저장됨"});
$("copyInquiry").addEventListener("click",()=>{if(!$("supportDraft").value.trim()){toast("문의 내용을 먼저 작성해 주세요.");return}copy("돌이 라운지 문의\n회원: "+(profile&&profile.name||"회원")+"\n내용:\n"+$("supportDraft").value,"문의 내용을 복사했어요. 공식 문의 경로에 직접 전달해 주세요.")});
$("clearDraft").addEventListener("click",()=>{$("supportDraft").value="";prefs.draft="";save();counter();toast("문의 초안을 비웠어요.")});
document.querySelectorAll("[data-favorite]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.favorite;prefs.favorites=prefs.favorites.includes(id)?prefs.favorites.filter(x=>x!==id):prefs.favorites.concat(id);paintPrefs();save();toast(prefs.favorites.includes(id)?"즐겨찾기에 추가했어요.":"즐겨찾기에서 제거했어요.")}));
$("collectionSearch").addEventListener("input",()=>{const q=$("collectionSearch").value.trim().toLowerCase();document.querySelectorAll("[data-collection-item]").forEach(c=>c.classList.toggle("hidden",!c.dataset.name.toLowerCase().includes(q)))});
$("copyCollection").addEventListener("click",()=>copy("돌이 라운지 컬렉션\n"+items.map(x=>x.name+" · "+(owned.has(x.id)?"보유":"미보유")+(prefs.favorites.includes(x.id)?" · 즐겨찾기":"")).join("\n"),"컬렉션 목록을 복사했어요."));
$("shopSearch").addEventListener("input",paintShop);
$("faqSearch").addEventListener("input",()=>{const q=$("faqSearch").value.trim().toLowerCase();document.querySelectorAll("#faqList details").forEach(d=>d.classList.toggle("hidden",!d.textContent.toLowerCase().includes(q)))});
const hash=location.hash.slice(1);if(["home","salon","library","gallery","concierge","shop"].includes(hash))nav(hash);
read();loadBookState();greeting();
$("retryAccount").addEventListener("click",async()=>{
 const button=$("retryAccount");
 button.disabled=true;button.textContent="다시 확인하는 중…";
 try{await load()}finally{button.disabled=false;button.textContent="다시 확인"}
});
wireBookReader();
void load();
window.addEventListener("pagehide",()=>{if(readerScrollTimer)clearTimeout(readerScrollTimer)},{once:true});
})();