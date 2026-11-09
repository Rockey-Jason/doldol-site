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
{id:"vip_marble_corgi_statue",name:"화이트 마블 돌이 조각상",price:50000},
{id:"vip_royal_crown_collectible",name:"로열 골드 왕관 오브제",price:120000},
{id:"vip_aurora_crystal_collectible",name:"오로라 크리스탈 장식",price:250000}
];
const musicCatalog=[
 {id:"lounge_music_royal_piano",name:"로열 피아노",mood:"C장조의 따뜻한 그랜드 피아노 선율이 길게 흐르고 현악 앙상블이 부드럽게 감싸는 클래식 호텔 로비",style:"SIGNATURE · FREE",price:0,free:true,icon:"♬"},
 {id:"lounge_music_velvet_jazz",name:"벨벳 재즈 라운지",mood:"F 도리안 재즈 색소폰이 긴 호흡으로 노래하고 로즈 피아노·콘트라베이스·브러시가 스윙을 만드는 벨벳 라운지",style:"VELVET JAZZ",price:18000,icon:"♫"},
 {id:"lounge_music_rainy_library",name:"비 내리는 로열 서재",mood:"D장조 플루트가 길게 이어지는 서정적인 선율을 맡고 로즈 피아노와 현악이 비를 바라보는 듯 포근하게 받쳐 주는 서재",style:"RAINY READING",price:14000,icon:"☂"},
 {id:"lounge_music_midnight_gold",name:"미드나이트 골드",mood:"E♭ 도리안 뮤트 트럼펫의 깊고 긴 재즈 프레이즈, 로즈 코드와 더블베이스가 어우러지는 심야 라운지",style:"MIDNIGHT",price:32000,icon:"✧"},
 {id:"lounge_music_crystal_atrium",name:"크리스탈 아트리움",mood:"F♯ 리디안의 긴 첼레스타 선율과 하프 아르페지오, 넓고 투명한 현악 앙상블이 펼쳐지는 크리스탈 아트리움",style:"CRYSTAL",price:28000,icon:"◇"},
 {id:"lounge_music_garden_terrace",name:"가든 테라스",mood:"E 믹솔리디안 플루트의 여유로운 긴 선율 위로 나일론 기타와 셰이커가 가볍게 흐르는 보사노바 테라스",style:"GARDEN",price:22000,icon:"❋"},
 {id:"lounge_music_christmas_hotel",name:"눈 내리는 크리스마스 호텔",mood:"B♭ 장조의 긴 오르골 테마와 은은한 썰매 방울, 포근한 스트링이 만드는 크리스마스 호텔",style:"WINTER SIGNATURE",price:36000,icon:"❄"}
];
const levels={1:"일반",2:"프리미엄",3:"돌프리미엄",4:"돌돌프리미엄",5:"돌돌돌프리미엄",6:"돌돌돌돌프리미엄",7:"돌돌돌돌돌프리미엄",8:"유사돌이",9:"돌이",10:"관리자"};
const BOOKS=window.DoriLoungeBooks||[];
const BOOK_DEFAULTS=BOOKS.map(book=>({...book,chapters:(book.chapters||[]).map(chapter=>({...chapter}))}));
let user=null,profile=null,owned=new Set(),ownedMusic=new Set(["lounge_music_royal_piano"]),prefs={theme:"marble",ambient:true,draft:"",favorites:[],visit:null,musicTrack:"lounge_music_royal_piano",musicVolume:0.62};
let storeKey="dori-lounge:guest",bookStoreKey="dori-lounge-books:guest",toastTimer=0;
let bookState={progress:{},favorites:[],bookmarks:{},fontScale:1};
let activeBook=null,activeChapter=0,editorDraft=null,readerPages=[],readerPageIndex=0,readerTouchStart=null;
const format=n=>{try{const value=String(n??0).trim();if(/^-?[0-9]+$/.test(value))return BigInt(value).toLocaleString("ko-KR")}catch(e){}return Number(n||0).toLocaleString("ko-KR")};
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(prefs))}catch(e){toast("브라우저 저장 공간을 확인해 주세요.")}}
function read(){
 try{const v=JSON.parse(localStorage.getItem(storeKey)||"null");if(v&&typeof v==="object")prefs={...prefs,...v}}catch(e){}
 if(!["marble","midnight","rose"].includes(prefs.theme))prefs.theme="marble";
 if(!Array.isArray(prefs.favorites))prefs.favorites=[];
 if(!musicCatalog.some(track=>track.id===prefs.musicTrack))prefs.musicTrack="lounge_music_royal_piano";
 prefs.musicVolume=Math.max(0,Math.min(1,Number(prefs.musicVolume??0.62)));
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
function showLock(title,desc){clearMusicIdleTimer();$("lockTitle").textContent=title;$("lockDescription").textContent=desc;$("lockPanel").classList.add("show");$("loungeApp").classList.remove("show");$("loungeMusicPlayer").hidden=true;document.body.classList.remove("lounge-music-expanded")}
const setLock=showLock;
function nav(name){
 const panel=document.querySelector('[data-view-panel="'+name+'"]');if(!panel)return;
 document.querySelectorAll("[data-view-panel]").forEach(p=>p.classList.toggle("active",p===panel));
 document.querySelectorAll(".room-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 try{history.replaceState(null,"","#"+name)}catch(e){}
 if(name==="shop"){paintShop();paintMusicShop()}
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
 paintMusicShop();
}

const MUSIC_IDLE_DELAY=20000;
let musicIdleTimer=0;
function clearMusicIdleTimer(){
 if(musicIdleTimer){clearTimeout(musicIdleTimer);musicIdleTimer=0}
}
function positionMusicMini(){
 const dock=$("loungeMusicPlayer");if(!dock)return;
 const small=window.innerWidth<=600,size=small?46:52;
 const right=small?14:18;
 dock.style.setProperty("--music-mini-size",size+"px");
 dock.style.setProperty("--music-mini-right",right+"px");
 dock.style.setProperty("--music-mini-bottom",(small?18:22)+"px");
 dock.style.setProperty("--music-mini-shift",(window.innerWidth/2-right-size/2)+"px");
}
function collapseMusicPlayer(){
 const dock=$("loungeMusicPlayer");if(!dock||dock.hidden)return;
 clearMusicIdleTimer();positionMusicMini();dock.classList.add("is-collapsed");
 document.body.classList.remove("lounge-music-expanded");
 const button=$("musicMiniExpand");
 if(button){
  button.tabIndex=0;button.setAttribute("aria-expanded","false");
  if(dock.contains(document.activeElement))button.focus({preventScroll:true});
 }
}
function expandMusicPlayer(){
 const dock=$("loungeMusicPlayer");if(!dock||dock.hidden)return;
 clearMusicIdleTimer();positionMusicMini();dock.classList.remove("is-collapsed");
 document.body.classList.add("lounge-music-expanded");
 const button=$("musicMiniExpand");
 if(button){button.tabIndex=-1;button.setAttribute("aria-expanded","true")}
 armMusicIdleTimer();
}
function armMusicIdleTimer(){
 clearMusicIdleTimer();
 const dock=$("loungeMusicPlayer");
 if(!dock||dock.hidden||dock.classList.contains("is-collapsed"))return;
 musicIdleTimer=setTimeout(()=>{musicIdleTimer=0;collapseMusicPlayer()},MUSIC_IDLE_DELAY);
}
function noteMusicActivity(){
 const dock=$("loungeMusicPlayer");
 if(!dock||dock.hidden||dock.classList.contains("is-collapsed"))return;
 armMusicIdleTimer();
}
function ownedMusicTracks(){return musicCatalog.filter(track=>ownedMusic.has(track.id))}
function selectedMusic(){return musicCatalog.find(track=>track.id===prefs.musicTrack)||musicCatalog[0]}
function formatMusicTime(seconds){
 const total=Math.max(0,Math.floor(Number(seconds)||0));
 return Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
}
function renderMusicProgress(stateOverride){
 const engine=window.DoriLoungeAudio;
 const state=stateOverride||(engine?engine.getState():{});
 const track=musicCatalog.find(item=>item.id===prefs.musicTrack)||musicCatalog[0];
 const matchesCurrent=Boolean(state.trackId&&state.trackId===track.id);
 const info=engine&&engine.getTrackInfo?engine.getTrackInfo(track.id):null;
 const duration=matchesCurrent?Number(state.duration||0):Number(info?.duration||0);
 const elapsed=matchesCurrent?Math.min(duration,Number(state.elapsed||0)):0;
 const progress=duration?Math.max(0,Math.min(1,elapsed/duration)):0;
 const remaining=Math.max(0,duration-elapsed);
 const bar=$("musicProgressTrack"),fill=$("musicProgressFill");
 if(bar){
  bar.setAttribute("aria-valuenow",String(Math.round(progress*100)));
  bar.setAttribute("aria-valuetext",formatMusicTime(elapsed)+" 경과, "+formatMusicTime(remaining)+" 남음");
 }
 if(fill)fill.style.transform="scaleX("+progress+")";
 if($("musicElapsed"))$("musicElapsed").textContent=formatMusicTime(elapsed);
 if($("musicRemaining"))$("musicRemaining").textContent=(state.finished&&matchesCurrent)?"재생 완료":"남음 "+formatMusicTime(remaining);
}
function renderMusicPlayer(){
 const select=$("musicTrackSelect");if(!select)return;
 const tracks=ownedMusicTracks();
 if(!tracks.some(track=>track.id===prefs.musicTrack))prefs.musicTrack=tracks[0]?.id||musicCatalog[0].id;
 select.replaceChildren();
 tracks.forEach(track=>{const option=document.createElement("option");option.value=track.id;option.textContent=track.name;select.append(option)});
 select.value=prefs.musicTrack;
 const state=window.DoriLoungeAudio?window.DoriLoungeAudio.getState():{trackId:null,playing:false,volume:prefs.musicVolume};
 const displayId=state.playing?state.trackId:prefs.musicTrack;
 const track=musicCatalog.find(item=>item.id===displayId)||selectedMusic();
 const isCurrent=state.trackId===displayId;
 $("musicNowTitle").textContent=track.name;
 $("musicNowMood").textContent=track.mood;
 $("musicPlayToggle").textContent=state.playing?"Ⅱ":"▶";
 $("musicPlayToggle").setAttribute("aria-label",state.playing?"음악 일시 정지":state.finished&&isCurrent?"음악 처음부터 재생":"음악 재생");
 $("musicPlayerStatus").textContent=state.playing&&isCurrent?"NOW PLAYING · ORIGINAL LOUNGE MUSIC":state.finished&&isCurrent?"FINISHED · PLAY TO RESTART":!state.playing&&isCurrent?"PAUSED · YOUR PLACE IS SAVED":"재생 버튼을 눌러 라운지 음악을 시작하세요.";
 $("loungeMusicPlayer").classList.toggle("is-playing",Boolean(state.playing));
 $("musicVolume").value=String(Math.round((prefs.musicVolume??0.62)*100));
 renderMusicProgress(state);
}
function paintMusicShop(){
 const grid=$("musicShopGrid");if(!grid)return;
 const query=String($("musicShopSearch").value||"").trim().toLocaleLowerCase("ko-KR");
 const tracks=musicCatalog.filter(track=>!query||[track.name,track.mood,track.style].join(" ").toLocaleLowerCase("ko-KR").includes(query));
 grid.replaceChildren();
 tracks.forEach(track=>{
  const isOwned=ownedMusic.has(track.id);
  const card=document.createElement("article");card.className="music-shop-card"+(isOwned?" owned":"");
  const art=document.createElement("div");art.className="music-shop-art music-art-"+track.id.replace("lounge_music_","");
  const symbol=document.createElement("span");symbol.textContent=track.icon;art.append(symbol);
  const content=document.createElement("div");content.className="music-shop-content";
  const style=document.createElement("div");style.className="music-shop-style";style.textContent=track.style;
  const title=document.createElement("h3");title.textContent=track.name;
  const mood=document.createElement("p");mood.textContent=track.mood;
  const footer=document.createElement("div");footer.className="music-shop-footer";
  const price=document.createElement("span");price.className="music-shop-price";price.textContent=track.free?"무료 기본 음악":format(track.price)+" 코인";
  const button=document.createElement("button");button.type="button";button.className="music-shop-action";
  if(isOwned){button.textContent=prefs.musicTrack===track.id?"선택됨 · 재생":"보유 중 · 재생";button.addEventListener("click",()=>void chooseAndPlayMusic(track.id))}
  else{button.textContent="구매하기";button.addEventListener("click",()=>void buyMusic(track.id,button))}
  footer.append(price,button);content.append(style,title,mood,footer);card.append(art,content);grid.append(card);
 });
 $("musicShopCount").textContent="음악 "+tracks.length+"종 · 보유 "+ownedMusic.size+"종";
}
async function chooseAndPlayMusic(trackId){
 expandMusicPlayer();
 if(!ownedMusic.has(trackId)){toast("구매한 음악만 재생할 수 있습니다.");return}
 prefs.musicTrack=trackId;save();renderMusicPlayer();paintMusicShop();
 try{await window.DoriLoungeAudio.play(trackId)}
 catch(error){console.error("Lounge music playback failed",error);toast("음악을 재생하지 못했습니다. 플레이어의 재생 버튼을 다시 눌러 주세요.")}
}
async function toggleLoungeMusic(){
 expandMusicPlayer();
 const engine=window.DoriLoungeAudio;if(!engine){toast("음악 엔진을 불러오지 못했습니다.");return}
 try{const state=engine.getState();if(state.playing){engine.pause();return}await engine.play(prefs.musicTrack||"lounge_music_royal_piano")}
 catch(error){console.error("Lounge music playback failed",error);toast("브라우저에서 음악을 시작하지 못했습니다. 다시 눌러 주세요.")}
}
function stepMusic(direction){
 const tracks=ownedMusicTracks();if(!tracks.length)return;
 let index=tracks.findIndex(track=>track.id===prefs.musicTrack);
 index=(index+direction+tracks.length)%tracks.length;
 const id=tracks[index].id;
 const playing=window.DoriLoungeAudio&&window.DoriLoungeAudio.getState().playing;
 if(playing)void chooseAndPlayMusic(id);
 else{prefs.musicTrack=id;save();renderMusicPlayer();paintMusicShop()}
}
async function buyMusic(id,button){
 if(!db||!user){toast("로그인 상태를 확인해 주세요.");return}
 const track=musicCatalog.find(item=>item.id===id);
 if(!track||track.free){toast("구매할 수 없는 음악입니다.");return}
 if(ownedMusic.has(id)){toast("이미 보유한 음악입니다.");return}
 button.disabled=true;button.textContent="구매 확인 중…";
 try{
  const confirmed=await window.DoriPurchaseConfirm?.ask({
   itemName:track.name,
   amount:track.price,
   currency:"돌돌코인",
   currentBalance:profile?.doldolcoin,
   detail:"구매가 확정되면 이 음악이 계정에 영구 보관됩니다."
  });
  if(!confirmed)return;
  button.textContent="구매 처리 중…";
  const {data,error}=await db.rpc("purchase_vip_lounge_music",{p_music_id:id});
  if(error)throw error;
  const result=Array.isArray(data)?data[0]:data;
  if(!result||result.success!==true)throw new Error("Purchase not completed");
  ownedMusic.add(id);prefs.musicTrack=id;save();
  $("memberCoins").textContent=format(result.doldolcoin)+" C";if(profile)profile.doldolcoin=result.doldolcoin;
  renderMusicPlayer();paintMusicShop();
  toast((result.item_name||track.name)+" 구매 완료! 아래 플레이어에서 재생할 수 있어요.");
  if(window.DoriSound)window.DoriSound.play("success");
 }catch(error){
  const message=String(error&&error.message||"");
  if(/돌돌코인|부족/.test(message))toast("돌돌코인이 부족합니다.");
  else if(/이미 보유|duplicate|23505/i.test(message))toast("이미 보유한 음악입니다.");
  else if(/로그인|JWT|42501|VIP/i.test(message))toast("로그인 또는 VIP 회원 권한을 확인해 주세요.");
  else toast("음악 구매에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  console.error("Lounge music purchase failed",error);
 }finally{button.disabled=false;paintMusicShop()}
}
function hasBookContent(book){
 return Boolean(book&&Array.isArray(book.chapters)&&book.chapters.some(chapter=>String(chapter.content||"").trim()));
}
function canEditLibrary(){
 return Boolean(profile&&profile.is_admin===true&&Number(profile.user_level||0)>=10);
}
function resetBookDefaults(){
 BOOKS.forEach(book=>{
  const original=BOOK_DEFAULTS.find(item=>item.id===book.id);
  if(!original)return;
  book.subtitle=original.subtitle||"";
  book.tableOfContents=original.tableOfContents||"";
   book.tableOfContents=original.tableOfContents||"";
  book.description=original.description||"";
  book.author=original.author||"";
  book.chapters=original.chapters.map(chapter=>({...chapter}));
 });
}
async function loadSharedBooks(client){
 const {data,error}=await client.from("dori_library_books").select("book_id,subtitle,chapters,updated_at");
 if(error)throw error;
 resetBookDefaults();
 (data||[]).forEach(row=>{
  const book=BOOKS.find(item=>item.id===row.book_id);
  if(!book)return;
  book.subtitle=String(row.subtitle||"");
   book.tableOfContents=String(row.chapters?.[0]?.tableOfContents||"");
  book.description="";
  if(Array.isArray(row.chapters)&&row.chapters.length){
   book.chapters=row.chapters.slice(0,200).map((chapter,index)=>({
    title:String(chapter&&chapter.title||("제"+(index+1)+"장")).slice(0,100),
    content:String(chapter&&chapter.content||"")
   }));
  }
 });
 renderBooks();
}
function loadBookState(){
 let saved=null,legacy=null;
 try{saved=JSON.parse(localStorage.getItem(bookStoreKey)||"null");legacy=JSON.parse(localStorage.getItem(bookStoreKey.replace(":v2:",":v1:"))||"null")}catch(e){}
 const source=saved&&typeof saved==="object"?saved:{};
 bookState={
  progress:{},
  favorites:Array.isArray(source.favorites)?source.favorites:(Array.isArray(legacy&&legacy.favorites)?legacy.favorites:[]),
  bookmarks:{},
  fontScale:Math.max(.85,Math.min(1.4,Number(source.fontScale||legacy&&legacy.fontScale)||1))
 };
 renderBooks();
}
function saveBookState(){
 try{localStorage.setItem(bookStoreKey,JSON.stringify(bookState));return true}
 catch(e){toast("저장 공간이 부족해 원고를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");return false}
}
function bookProgress(book){return bookState.progress[book.id]||null}
function bookmarkList(bookId){return Array.isArray(bookState.bookmarks[bookId])?bookState.bookmarks[bookId]:[]}
function renderBooks(){
 const grid=$("bookshelfGrid");if(!grid)return;
 const query=String($("bookSearch").value||"").trim().toLocaleLowerCase("ko-KR");
 const activeFilter=document.querySelector("[data-book-filter].active");
 const filter=activeFilter?activeFilter.dataset.bookFilter:"all";
 const visible=BOOKS.filter(book=>{
  const progress=hasBookContent(book)?bookProgress(book):null,marks=bookmarkList(book.id);
  const haystack=[book.title,book.subtitle,book.part,book.genre,book.volume].join(" ").toLocaleLowerCase("ko-KR");
  if(query&&!haystack.includes(query))return false;
  if(filter==="continue"&&!progress)return false;
  if(filter==="favorites"&&!bookState.favorites.includes(book.id))return false;
  if(filter==="bookmarks"&&!marks.length)return false;
  return true;
 });
 grid.replaceChildren();
 visible.forEach(book=>{
  const written=hasBookContent(book),progress=written?bookProgress(book):null;
  const count=Math.max(1,book.chapters.length),chapter=progress?Math.max(0,Math.min(Number(progress.chapter)||0,count-1)):0;
  const scroll=progress&&progress.chapter===chapter?Math.max(0,Math.min(1,Number(progress.scroll)||0)):0;
  const completed=Boolean(progress&&progress.completed),percent=completed?100:progress?Math.max(0,Math.min(99,Math.round(((chapter+scroll)/count)*100))):0;
  const favorite=bookState.favorites.includes(book.id);
  const card=document.createElement("article");card.className="book-card";
  const cover=document.createElement("div");cover.className="book-cover "+(book.cover||"");
  const top=document.createElement("div");top.className="book-cover-top";top.textContent="DORI WORLD LIBRARY";
  const symbol=document.createElement("div");symbol.className="book-cover-symbol";symbol.textContent=book.cover==="virus"?"◎":"✧";
  const coverTitle=document.createElement("div");coverTitle.className="book-cover-title";coverTitle.textContent=book.title;
  const bottom=document.createElement("div");bottom.className="book-cover-bottom";bottom.textContent=[book.part,book.volume].filter(Boolean).join(" · ");
  cover.append(top,symbol,coverTitle,bottom);
  const content=document.createElement("div");content.className="book-card-content";
  const meta=document.createElement("div");meta.className="book-card-meta";
  const genre=document.createElement("span");genre.className="book-tag";genre.textContent=book.genre||"직접 집필";
  const volume=document.createElement("span");volume.textContent=[book.part,book.volume].filter(Boolean).join(" · ");meta.append(genre,volume);
  const title=document.createElement("h3");title.textContent=book.title;
  const subtitle=document.createElement("p");subtitle.className="book-card-subtitle"+(book.subtitle?"":" book-empty-copy");subtitle.textContent=book.subtitle||"책 소개를 직접 작성할 수 있습니다.";
  const desc=document.createElement("p");desc.className="book-card-description"+(written?"":" book-empty-copy");desc.textContent=book.description||(written?"본문이 준비되었습니다.":canEditLibrary()?"아직 본문이 비어 있습니다. 편집하기를 눌러 직접 작성해 주세요.":"아직 관리자가 원고를 작성하지 않았습니다.");
  const progressBlock=document.createElement("div");progressBlock.className="book-progress-block";
  const label=document.createElement("div");label.className="book-progress-label";
  const status=document.createElement("span");status.textContent=!written?"원고 작성 대기":completed?"완독":progress?"독서 진행 중":"아직 읽지 않음";
  const percentText=document.createElement("span");percentText.textContent=percent+"%";label.append(status,percentText);
  const track=document.createElement("div");track.className="book-progress-track";track.hidden=!written;
  const fill=document.createElement("span");fill.style.width=percent+"%";track.append(fill);progressBlock.append(label,track);
  const actions=document.createElement("div");actions.className="book-card-actions";
  const read=document.createElement("button");read.type="button";read.className="book-read-btn";
  read.textContent=!written?(canEditLibrary()?"원고 작성하기":"원고 준비 중"):progress?"이어서 읽기":"읽기";
  read.disabled=!written&&!canEditLibrary();
  if(read.disabled)read.title="관리자가 원고를 등록하면 읽을 수 있습니다.";
  read.addEventListener("click",()=>openBook(book.id,progress?chapter:0));
  actions.append(read);
  if(canEditLibrary()){
   const edit=document.createElement("button");edit.type="button";edit.className="book-edit-btn";edit.textContent="편집";
   edit.addEventListener("click",()=>{openBook(book.id,progress?chapter:0);if(written)beginBookEdit()});
   actions.append(edit);
  }
  const fav=document.createElement("button");fav.type="button";fav.className="book-favorite";fav.setAttribute("aria-pressed",String(favorite));fav.setAttribute("aria-label",favorite?"즐겨찾기에서 제거":"즐겨찾기에 추가");fav.textContent=favorite?"♥":"♡";
  fav.addEventListener("click",()=>{bookState.favorites=favorite?bookState.favorites.filter(id=>id!==book.id):[...bookState.favorites,book.id];saveBookState();renderBooks();toast(favorite?"즐겨찾기에서 제거했어요.":"즐겨찾기에 추가했어요.")});
  actions.append(fav);
  const state=document.createElement("div");state.className="book-card-status";state.textContent=count+"개 장 · "+(written?"원고 작성됨":"원고 비어 있음")+" · 책갈피 "+bookmarkList(book.id).length+"개";
  content.append(meta,title,subtitle,desc,progressBlock,actions,state);card.append(cover,content);grid.append(card);
 });
 $("bookshelfEmpty").classList.toggle("hidden",visible.length>0);
 $("bookShelfCount").textContent="등록 도서 "+BOOKS.length+"권 · 검색 결과 "+visible.length+"권";
 const done=BOOKS.filter(book=>hasBookContent(book)&&bookProgress(book)&&bookProgress(book).completed).length;
 const written=BOOKS.filter(hasBookContent).length;
 const marks=BOOKS.reduce((sum,book)=>sum+bookmarkList(book.id).length,0);
 $("bookShelfProgress").textContent="원고 작성 "+written+"권 · 완독 "+done+"권 · 책갈피 "+marks+"개";
}
function readerPageFits(paragraphs,measure){
 measure.replaceChildren();
 paragraphs.forEach(text=>{const p=document.createElement("p");p.textContent=text;measure.append(p)});
 return measure.scrollHeight<=measure.clientHeight+1;
}
function paginateReaderChapter(content){
 const body=$("bookReaderBody"),dialog=document.querySelector(".book-reader-dialog");
 const rect=body.getBoundingClientRect(),style=getComputedStyle(body);
 const measure=body.cloneNode(false);
 measure.removeAttribute("id");measure.replaceChildren();
 measure.style.cssText=[
  "position:fixed","left:-12000px","top:0","visibility:hidden","pointer-events:none","z-index:-1",
  "display:block","box-sizing:border-box","margin:0",
  "width:"+rect.width+"px","height:"+rect.height+"px","min-height:0","max-height:"+rect.height+"px",
  "padding:"+style.paddingTop+" "+style.paddingRight+" "+style.paddingBottom+" "+style.paddingLeft,
  "border:0","overflow:hidden","font-family:"+style.fontFamily,"font-size:"+style.fontSize,
  "font-weight:"+style.fontWeight,"font-style:"+style.fontStyle,"line-height:"+style.lineHeight,
  "letter-spacing:"+style.letterSpacing,"text-indent:"+style.textIndent,"white-space:"+style.whiteSpace,
  "overflow-wrap:"+style.overflowWrap,"word-break:"+style.wordBreak
 ].join(";");
 dialog.append(measure);
 const source=String(content||"").split(/\r?\n\s*\r?\n/).map(value=>value.trim()).filter(Boolean);
 if(!source.length){measure.remove();return [[]]}
 const pages=[];let current=[];
 const fits=parts=>readerPageFits(parts,measure);
 const pushPage=()=>{if(current.length){pages.push(current);current=[]}};
 source.forEach(paragraph=>{
  const words=paragraph.split(/\s+/);let segment="";
  words.forEach(word=>{
   let candidate=segment?segment+" "+word:word;
   if(fits([...current,candidate])){segment=candidate;return}
   if(segment){current.push(segment);pushPage();segment="";candidate=word}
   if(fits([...current,candidate])){segment=candidate;return}
   let fragment="";
   for(const char of word){
    const next=fragment+char;
    if(fits([...current,next]))fragment=next;
    else{if(fragment){current.push(fragment);pushPage()}fragment=char}
   }
   segment=fragment;
  });
  if(segment)current.push(segment);
 });
 pushPage();measure.remove();
 return pages.length?pages:[[]];
}
function reflowReaderPages(){
 if(!activeBook)return;
 const keep=readerPageIndex;
 readerPages=paginateReaderChapter(activeBook.chapters[activeChapter].content||"");
 readerPageIndex=Math.min(keep,readerPages.length-1);
 renderReaderPage();
}
function renderReaderPage(){
 const body=$("bookReaderBody");body.replaceChildren();
 const page=readerPages[readerPageIndex]||[];
 if(!hasBookContent(activeBook)){
  const empty=document.createElement("p");empty.className="reader-empty-state";empty.textContent=canEditLibrary()?"아직 작성된 내용이 없습니다. 상단의 ‘원고 편집’을 눌러 직접 이야기를 작성해 주세요.":"아직 관리자가 원고를 등록하지 않았습니다. 원고가 준비되면 이곳에서 읽을 수 있습니다.";body.append(empty);
 }else{
  page.forEach(paragraph=>{const p=document.createElement("p");p.textContent=paragraph;body.append(p)});
  if(readerPageIndex===readerPages.length-1){const end=document.createElement("div");end.className="reader-endmark";end.textContent="❦";body.append(end)}
 }
 const total=readerPages.length||1;
 $("readerPageIndicator").textContent=(readerPageIndex+1)+" / "+total+" 페이지";
 $("readerPrev").disabled=activeChapter===0&&readerPageIndex===0;
 $("readerNext").disabled=activeChapter===activeBook.chapters.length-1&&readerPageIndex===total-1;
 $("readerNext").textContent=readerPageIndex===total-1&&activeChapter<activeBook.chapters.length-1?"다음 장 →":"다음 페이지 →";
 updateReaderProgress();
}
function updateReaderProgress(){
 if(!activeBook||!hasBookContent(activeBook)){$("bookReaderProgressBar").style.width="0%";$("bookReaderPercent").textContent="0%";return}
 const total=readerPages.length||1;
 const percent=Math.min(100,Math.round(((activeChapter+(readerPageIndex+1)/total)/activeBook.chapters.length)*100));
 $("bookReaderProgressBar").style.width=percent+"%";$("bookReaderPercent").textContent=percent+"%";
}
function saveReaderProgress(){
 if(!activeBook||!hasBookContent(activeBook)||document.querySelector(".book-reader-dialog").classList.contains("editing"))return;
 const complete=activeChapter===activeBook.chapters.length-1&&readerPageIndex>=readerPages.length-1;
 bookState.progress[activeBook.id]={chapter:activeChapter,page:readerPageIndex,scroll:0,completed:complete,updatedAt:new Date().toISOString()};
 saveBookState();updateReaderProgress();renderBooks();
}
function renderReader(){
 if(!activeBook)return;
 const chapters=activeBook.chapters&&activeBook.chapters.length?activeBook.chapters:[{title:"제1장",content:""}];
 activeBook.chapters=chapters;activeChapter=Math.max(0,Math.min(chapters.length-1,activeChapter));
 const chapter=chapters[activeChapter],dialog=document.querySelector(".book-reader-dialog");
 dialog.classList.remove("editing");$("bookEditorPanel").hidden=true;
 $("readerEditToggle").hidden=!canEditLibrary();$("readerFontDown").hidden=false;$("readerFontUp").hidden=false;
 $("bookReaderMeta").textContent=[activeBook.part,activeBook.volume,activeBook.author||"직접 집필"].filter(Boolean).join(" · ");
 $("bookReaderTitle").textContent=activeBook.title;$("bookReaderSubtitle").textContent=activeBook.subtitle||"";$("bookReaderSubtitle").hidden=!activeBook.subtitle;
 $("readerChapterKicker").textContent="CHAPTER "+String(activeChapter+1).padStart(2,"0")+" / "+String(chapters.length).padStart(2,"0");
 $("readerChapterTitle").textContent=chapter.title||("제"+(activeChapter+1)+"장");
 const select=$("readerChapterSelect");select.replaceChildren();
 chapters.forEach((item,index)=>{const option=document.createElement("option");option.value=String(index);option.textContent=item.title||("제"+(index+1)+"장");select.append(option)});
 select.value=String(activeChapter);select.disabled=!hasBookContent(activeBook);
 renderReaderToc();
 const body=$("bookReaderBody");body.replaceChildren();
 readerPages=paginateReaderChapter(chapter.content||"");
 const progress=bookProgress(activeBook);
 readerPageIndex=progress&&progress.chapter===activeChapter?Math.max(0,Math.min(readerPages.length-1,Number(progress.page)||0)):0;
 dialog.style.setProperty("--reader-font-scale",String(bookState.fontScale));
 $("readerBookmark").disabled=!hasBookContent(activeBook);$("readerBookmark").setAttribute("aria-pressed",String(bookmarkList(activeBook.id).includes(activeChapter)));
 $("readerBookmark").textContent=bookmarkList(activeBook.id).includes(activeChapter)?"♥ 책갈피 저장됨":"♡ 이 장 책갈피";
 renderReaderPage();
}
function renderReaderToc(){
 const panel=$("readerTocPanel"),list=$("readerTocList"),button=$("readerTocToggle");if(!panel||!list||!button||!activeBook)return;
 const custom=String(activeBook.tableOfContents||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const entries=custom.length?custom:(activeBook.chapters||[]).map(chapter=>chapter.title).filter(Boolean);
 list.replaceChildren();entries.forEach(entry=>{const li=document.createElement("li");li.textContent=entry;list.append(li)});
 panel.hidden=button.getAttribute("aria-expanded")!=="true";button.hidden=!entries.length;
}

function getEditorPageInputs(card){
 return Array.from(card.querySelectorAll(".book-editor-page-input"));
}
function getEditorChapterText(card){
 return getEditorPageInputs(card).map(input=>input.value||"").join("");
}
function paginateBookEditorText(content,template){
 const style=getComputedStyle(template),sheet=template.closest(".book-editor-page-sheet");
 const sheetStyle=getComputedStyle(sheet);
 const paddingTop=parseFloat(style.paddingTop)||0,paddingBottom=parseFloat(style.paddingBottom)||0;
 const borderTop=parseFloat(style.borderTopWidth)||0,borderBottom=parseFloat(style.borderBottomWidth)||0;
 const usableHeight=Math.max(120,template.clientHeight-paddingTop-paddingBottom-borderTop-borderBottom);
 const usableWidth=Math.max(80,template.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0));
 const measure=document.createElement("div");
 measure.style.cssText=[
  "position:fixed","left:-20000px","top:0","visibility:hidden","pointer-events:none",
  "box-sizing:border-box","display:block","margin:0","padding:0","border:0",
  "width:"+usableWidth+"px","height:auto","min-height:0","max-height:none",
  "overflow:visible","white-space:pre-wrap","overflow-wrap:anywhere","word-break:normal",
  "font-family:"+style.fontFamily,"font-size:"+style.fontSize,"font-weight:"+style.fontWeight,
  "font-style:"+style.fontStyle,"line-height:"+style.lineHeight,"letter-spacing:"+style.letterSpacing
 ].join(";");
 document.body.append(measure);
 const pages=[];let offset=0;
 while(offset<content.length){
  let low=1,high=content.length-offset,best=0;
  const fits=count=>{
   measure.textContent=content.slice(offset,offset+count)||"\u200b";
   return measure.getBoundingClientRect().height<=usableHeight+1;
  };
  if(fits(high))best=high;
  else{
   while(low<=high){
    const mid=Math.floor((low+high)/2);
    if(fits(mid)){best=mid;low=mid+1}else high=mid-1;
   }
  }
  best=Math.max(1,best);
  let cut=best;
  if(offset+best<content.length){
   const minBreak=Math.max(offset+1,offset+best-150);
   const limit=offset+best-1;
   const newline=content.lastIndexOf("\n",limit);
   const space=content.lastIndexOf(" ",limit);
   const tab=content.lastIndexOf("\t",limit);
   const boundary=Math.max(newline,space,tab);
   if(boundary>=minBreak)cut=boundary+1-offset;
  }
  pages.push(content.slice(offset,offset+cut));
  offset+=cut;
 }
 measure.remove();
 return pages.length?pages:[""];
}
function makeBookEditorPage(card,content,index,total){
 const sheet=document.createElement("section");sheet.className="book-editor-page-sheet";
 const top=document.createElement("div");top.className="book-editor-page-heading";
 const brand=document.createElement("span");brand.textContent="DORI ROYAL LIBRARY";
 const number=document.createElement("span");number.textContent="PAGE "+String(index+1).padStart(2,"0");
 top.append(brand,number);
 const input=document.createElement("textarea");input.className="book-editor-textarea book-editor-page-input";
 input.rows=10;input.value=content;input.placeholder="이곳에서 자유롭게 이어서 작성하세요. 페이지가 채워지면 다음 페이지로 자동 이동합니다.";
 input.setAttribute("aria-label","원고 "+(index+1)+"페이지");
 const bottom=document.createElement("div");bottom.className="book-editor-page-footer";
 const hint=document.createElement("span");hint.textContent="CONTINUOUS MANUSCRIPT";
 const pageNo=document.createElement("span");pageNo.textContent=(index+1)+" / "+total;
 bottom.append(hint,pageNo);
 input.addEventListener("input",event=>handleBookEditorPageInput(card,input,event));
 input.addEventListener("compositionend",event=>handleBookEditorPageInput(card,input,event));
 input.addEventListener("paste",event=>handleBookEditorPaste(event,card,input));
 sheet.append(top,input,bottom);return sheet;
}
function updateBookEditorPageMeta(card){
 const count=getEditorPageInputs(card).length;
 const meta=card.querySelector(".book-editor-page-meta");
 if(meta)meta.textContent=count+"페이지 · 자동 페이지 넘김 켜짐";
 card.querySelectorAll(".book-editor-page-footer span:last-child").forEach((el,index)=>{el.textContent=(index+1)+" / "+count});
 card.querySelectorAll(".book-editor-page-heading span:last-child").forEach((el,index)=>{el.textContent="PAGE "+String(index+1).padStart(2,"0")});
}
function renderBookEditorPages(card,segments,caret){
 const pages=card.querySelector(".book-editor-pages");
 pages.replaceChildren();
 segments.forEach((segment,index)=>pages.append(makeBookEditorPage(card,segment,index,segments.length)));
 updateBookEditorPageMeta(card);
 if(caret){
  let pageIndex=0,localStart=caret.start,localEnd=caret.end;
  while(pageIndex<segments.length-1&&(localStart>=segments[pageIndex].length)){
   localStart-=segments[pageIndex].length;localEnd=Math.max(0,localEnd-segments[pageIndex].length);pageIndex++;
  }
  localStart=Math.max(0,Math.min(segments[pageIndex].length,localStart));
  localEnd=Math.max(localStart,Math.min(segments[pageIndex].length,localEnd));
  const target=pages.querySelectorAll(".book-editor-page-input")[pageIndex];
  if(target){
   target.focus({preventScroll:true});target.setSelectionRange(localStart,localEnd);
   target.scrollIntoView({block:"center",behavior:"auto"});
  }
 }
}
function handleBookEditorPageInput(card,activeInput,event){
 if(event&&event.isComposing)return;
 const inputs=getEditorPageInputs(card),pageIndex=inputs.indexOf(activeInput);
 if(pageIndex<0)return;
 const cursorStart=activeInput.selectionStart??activeInput.value.length;
 const cursorEnd=activeInput.selectionEnd??cursorStart;
 const prefix=inputs.slice(0,pageIndex).reduce((sum,input)=>sum+input.value.length,0);
 const caret={start:prefix+cursorStart,end:prefix+cursorEnd};
 const content=inputs.map(input=>input.value||"").join("");
 const nextPages=paginateBookEditorText(content,activeInput);
 const currentPageLengths=inputs.map(input=>input.value.length);
 const samePageBreaks=nextPages.length===currentPageLengths.length&&nextPages.every((value,index)=>value.length===currentPageLengths[index]);
 if(samePageBreaks){
  updateBookEditorPageMeta(card);return;
 }
 renderBookEditorPages(card,nextPages,caret);
}
function handleBookEditorPaste(event,card,activeInput){
 const pasted=event.clipboardData&&event.clipboardData.getData("text/plain");
 if(typeof pasted!=="string"||!pasted.trim())return;
 const inputs=getEditorPageInputs(card),pageIndex=inputs.indexOf(activeInput);
 if(pageIndex<0)return;
 const prefix=inputs.slice(0,pageIndex).reduce((sum,input)=>sum+input.value.length,0);
 const localStart=activeInput.selectionStart??activeInput.value.length;
 const localEnd=activeInput.selectionEnd??localStart;
 const start=prefix+localStart,end=prefix+localEnd;
 const existing=inputs.map(input=>input.value||"").join("");
 const combined=existing.slice(0,start)+pasted+existing.slice(end);
 const lines=combined.replace(/\r\n?/g,"\n").split("\n");
 const headingPattern=/^\s*(?:(제\s*\d+\s*장|\d+\s*장|chapter\s+\d+)(?:\s*[:：.．)\]—–-]?\s*.*)?|(프롤로그|에필로그|서문|맺음말|부록))\s*$/i;
 const sections=[];let current=null,headingCount=0,prefixLines=[];
 lines.forEach(line=>{
  const match=line.match(headingPattern);
  if(match){headingCount++;if(current)sections.push(current);current={title:line.trim(),content:""}}
  else if(current)current.content+=(current.content?"\n":"")+line;
  else prefixLines.push(line);
 });
 if(current)sections.push(current);
 const firstHeading=lines.findIndex(line=>headingPattern.test(line));
 const headingAtStart=firstHeading>=0&&lines.slice(0,firstHeading).join("\n").trim()==="";
 if(headingCount<1||(!headingAtStart&&headingCount<2))return;
 event.preventDefault();
 syncBookEditorDraft();
 const chapterIndex=Array.from($("bookEditorChapters").querySelectorAll(".book-editor-chapter")).indexOf(card);
 if(chapterIndex<0)return;
 if(prefixLines.join("\n").trim())sections.unshift({title:editorDraft.chapters[chapterIndex].title,content:prefixLines.join("\n").trim()});
 editorDraft.chapters.splice(chapterIndex,1,...sections.map(section=>({title:section.title.slice(0,100),content:section.content})));
 renderBookEditor();
 const cards=$("bookEditorChapters").querySelectorAll(".book-editor-chapter");
 const focusIndex=Math.min(chapterIndex+sections.length-1,cards.length-1);
 const targetPages=cards[focusIndex]?.querySelectorAll(".book-editor-page-input");
 const target=targetPages&&targetPages[targetPages.length-1];
 if(target){target.focus();target.setSelectionRange(target.value.length,target.value.length)}
 toast(sections.length+"개 장으로 자동 분리했습니다.");
}
function renderBookEditor(){
 const list=$("bookEditorChapters");list.replaceChildren();
 editorDraft.chapters.forEach((chapter,index)=>{
  const card=document.createElement("section");card.className="book-editor-chapter";
  const head=document.createElement("div");head.className="book-editor-chapter-head";
  const label=document.createElement("span");label.textContent="CHAPTER "+String(index+1).padStart(2,"0");
  const remove=document.createElement("button");remove.type="button";remove.className="book-editor-remove";remove.textContent="장 삭제";remove.disabled=editorDraft.chapters.length<=1;
  remove.addEventListener("click",()=>{syncBookEditorDraft();editorDraft.chapters.splice(index,1);renderBookEditor()});head.append(label,remove);
  const titleLabel=document.createElement("label");titleLabel.className="book-editor-field";
  const titleCaption=document.createElement("span");titleCaption.textContent="장 제목";
  const titleInput=document.createElement("input");titleInput.type="text";titleInput.maxLength=100;titleInput.className="book-editor-input";titleInput.value=chapter.title||("제"+(index+1)+"장");titleInput.placeholder="예: 제1장. 첫 번째 이야기";titleInput.setAttribute("aria-label","제"+(index+1)+"장 제목");titleLabel.append(titleCaption,titleInput);
  const bodyLabel=document.createElement("div");bodyLabel.className="book-editor-field";
  const bodyCaption=document.createElement("span");bodyCaption.textContent="본문 · 연속 페이지 작성";
  const pages=document.createElement("div");pages.className="book-editor-pages";
  const pageMeta=document.createElement("div");pageMeta.className="book-editor-page-meta";pageMeta.setAttribute("aria-live","polite");
  bodyLabel.append(bodyCaption,pages,pageMeta);
  card.append(head,titleLabel,bodyLabel);list.append(card);
  const first=makeBookEditorPage(card,String(chapter.content||""),0,1);pages.append(first);
  const initialInput=first.querySelector(".book-editor-page-input");
  const segments=paginateBookEditorText(String(chapter.content||""),initialInput);
  renderBookEditorPages(card,segments,null);
 });
}
function syncBookEditorDraft(){
 if(!editorDraft)return;
 editorDraft.subtitle=String($("editorBookSubtitle").value||"");editorDraft.tableOfContents=String($("editorBookToc").value||"");
 editorDraft.chapters=Array.from($("bookEditorChapters").querySelectorAll(".book-editor-chapter")).map((card,index)=>({
  title:String(card.querySelector(".book-editor-input").value||"").trim().slice(0,100)||("제"+(index+1)+"장"),
  content:getEditorChapterText(card)
 }));
}
function beginBookEdit(){
 if(!canEditLibrary()){toast("책 원고 편집은 관리자 계정만 사용할 수 있습니다.");return}
 if(!activeBook)return;
 if(hasBookContent(activeBook))saveReaderProgress();
 editorDraft={subtitle:String(activeBook.subtitle||""),tableOfContents:String(activeBook.tableOfContents||""),chapters:(activeBook.chapters&&activeBook.chapters.length?activeBook.chapters:[{title:"제1장",content:""}]).map(chapter=>({title:String(chapter.title||""),content:String(chapter.content||"")}))};
 const dialog=document.querySelector(".book-reader-dialog");dialog.classList.add("editing");
 $("bookEditorPanel").hidden=false;
 $("editorBookSubtitle").value=editorDraft.subtitle;$("editorBookToc").value=editorDraft.tableOfContents;renderBookEditor();
 $("readerEditToggle").hidden=true;$("readerFontDown").hidden=true;$("readerFontUp").hidden=true;$("readerChapterSelect").disabled=true;
 $("editorBookSubtitle").focus({preventScroll:true});
}
function cancelBookEdit(){if(!activeBook)return;editorDraft=null;renderReader()}
async function saveBookEdit(){
 if(!canEditLibrary()){toast("관리자 계정만 원고를 저장할 수 있습니다.");return}
 if(!activeBook||!editorDraft)return;
 const chapters=Array.from($("bookEditorChapters").querySelectorAll(".book-editor-chapter")).map((card,index)=>({
  title:String(card.querySelector(".book-editor-input").value||"").trim().slice(0,100)||("제"+(index+1)+"장"),
  content:getEditorChapterText(card)
 }));
 if(!chapters.length)chapters.push({title:"제1장",content:""});
 const subtitle=String($("editorBookSubtitle").value||"").trim().slice(0,300);
  const tableOfContents=String($("editorBookToc").value||"").trim().slice(0,6000);chapters[0].tableOfContents=tableOfContents;
 const targetBook=activeBook;
 const button=$("saveBookEdit");button.disabled=true;button.textContent="저장 중…";
 try{
  const client=db||await getClient();
  const {error}=await client.from("dori_library_books").upsert({
   book_id:targetBook.id,
   subtitle,
   chapters,
   updated_by:user.id,
   updated_at:new Date().toISOString()
  },{onConflict:"book_id"});
  if(error)throw error;
  targetBook.subtitle=subtitle;targetBook.tableOfContents=tableOfContents;targetBook.chapters=chapters;
  delete bookState.progress[targetBook.id];delete bookState.bookmarks[targetBook.id];
  saveBookState();editorDraft=null;
  if(activeBook===targetBook)renderReader();
  renderBooks();
  toast("원고를 저장했습니다. 모든 회원에게 반영됩니다.");
 }catch(error){
  console.error("VIP Library manuscript save failed",error);
  toast(/row.level|policy|permission|403/i.test(String(error&&error.message||""))?
   "관리자 권한이 확인되지 않아 저장하지 못했습니다.":"원고 저장에 실패했습니다. 연결 상태를 확인하고 다시 시도해 주세요.");
 }finally{button.disabled=false;button.textContent="원고 저장"}
}
function openBook(bookId,chapterIndex){
 const book=BOOKS.find(item=>item.id===bookId);if(!book)return;
 activeBook=book;const progress=hasBookContent(book)?bookProgress(book):null;
 activeChapter=Math.max(0,Math.min(Math.max(0,book.chapters.length-1),Number(chapterIndex!=null?chapterIndex:progress&&progress.chapter)||0));
 $("bookReader").classList.add("open");$("bookReader").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
 renderReader();
 if(!hasBookContent(book)&&canEditLibrary()){beginBookEdit();return}
 if(!progress){bookState.progress[book.id]={chapter:activeChapter,scroll:0,completed:false,updatedAt:new Date().toISOString()};saveBookState();renderBooks()}
}
function closeBookReader(){
 if(readerScrollTimer){clearTimeout(readerScrollTimer);readerScrollTimer=0}
 if(activeBook&&!document.querySelector(".book-reader-dialog").classList.contains("editing"))saveReaderProgress();
 $("bookReader").classList.remove("open");$("bookReader").setAttribute("aria-hidden","true");document.body.style.overflow="";
 activeBook=null;editorDraft=null;
}
function changeReaderChapter(next){
 if(!activeBook||document.querySelector(".book-reader-dialog").classList.contains("editing"))return;
 const target=Math.max(0,Math.min(activeBook.chapters.length-1,next));if(target===activeChapter)return;
 saveReaderProgress();activeChapter=target;renderReader();
 const progress=bookProgress(activeBook);if(progress){progress.chapter=activeChapter;progress.page=0;progress.scroll=0;progress.completed=false;progress.updatedAt=new Date().toISOString();saveBookState()}
}
function changeReaderPage(direction){
 if(!activeBook||document.querySelector(".book-reader-dialog").classList.contains("editing"))return;
 const last=readerPages.length-1;
 if(direction>0){
  if(readerPageIndex<last){readerPageIndex++;renderReaderPage();saveReaderProgress();return}
  if(activeChapter<activeBook.chapters.length-1){changeReaderChapter(activeChapter+1);return}
 }else{
  if(readerPageIndex>0){readerPageIndex--;renderReaderPage();saveReaderProgress();return}
  if(activeChapter>0){changeReaderChapter(activeChapter-1);readerPageIndex=readerPages.length-1;renderReaderPage();saveReaderProgress()}
 }
}
function wireBookReader(){
 document.querySelectorAll("[data-book-filter]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-book-filter]").forEach(item=>item.classList.toggle("active",item===button));renderBooks()}));
 $("bookSearch").addEventListener("input",renderBooks);
 $("bookReaderClose").addEventListener("click",closeBookReader);
 $("bookReader").addEventListener("click",event=>{if(event.target===$("bookReader"))closeBookReader()});
 $("readerEditToggle").addEventListener("click",beginBookEdit);
 $("readerTocToggle").addEventListener("click",()=>{const button=$("readerTocToggle"),open=button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));renderReaderToc();requestAnimationFrame(reflowReaderPages)});
 $("addBookChapter").addEventListener("click",()=>{if(!editorDraft)return;syncBookEditorDraft();editorDraft.chapters.push({title:"제"+(editorDraft.chapters.length+1)+"장",content:""});renderBookEditor();const inputs=$("bookEditorChapters").querySelectorAll(".book-editor-input");if(inputs.length)inputs[inputs.length-1].focus()});
 $("cancelBookEdit").addEventListener("click",cancelBookEdit);$("saveBookEdit").addEventListener("click",saveBookEdit);
 $("readerPrev").addEventListener("click",()=>changeReaderPage(-1));$("readerNext").addEventListener("click",()=>changeReaderPage(1));
 $("bookReaderBody").addEventListener("touchstart",event=>{const touch=event.touches&&event.touches[0];if(touch)readerTouchStart={x:touch.clientX,y:touch.clientY}},{passive:true});
 $("bookReaderBody").addEventListener("touchend",event=>{if(!readerTouchStart)return;const touch=event.changedTouches&&event.changedTouches[0];if(touch){const dx=touch.clientX-readerTouchStart.x,dy=touch.clientY-readerTouchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)changeReaderPage(dx<0?1:-1)}readerTouchStart=null},{passive:true});
 $("readerChapterSelect").addEventListener("change",event=>changeReaderChapter(Number(event.target.value)));
 $("readerBookmark").addEventListener("click",()=>{
  if(!activeBook||!hasBookContent(activeBook))return;
  const list=bookmarkList(activeBook.id);bookState.bookmarks[activeBook.id]=list.includes(activeChapter)?list.filter(index=>index!==activeChapter):[...list,activeChapter].sort((a,b)=>a-b);
  saveBookState();renderReader();renderBooks();toast(bookmarkList(activeBook.id).includes(activeChapter)?"이 장을 책갈피에 저장했어요.":"책갈피를 해제했어요.");
 });
 $("readerFontDown").addEventListener("click",()=>{bookState.fontScale=Math.max(.85,Math.round((bookState.fontScale-.05)*100)/100);document.querySelector(".book-reader-dialog").style.setProperty("--reader-font-scale",String(bookState.fontScale));saveBookState();requestAnimationFrame(reflowReaderPages)});
 $("readerFontUp").addEventListener("click",()=>{bookState.fontScale=Math.min(1.4,Math.round((bookState.fontScale+.05)*100)/100);document.querySelector(".book-reader-dialog").style.setProperty("--reader-font-scale",String(bookState.fontScale));saveBookState();requestAnimationFrame(reflowReaderPages)});
  window.addEventListener("resize",()=>{if(!$("bookReader").classList.contains("open")||!activeBook||document.querySelector(".book-reader-dialog").classList.contains("editing"))return;requestAnimationFrame(reflowReaderPages)});
 document.addEventListener("keydown",event=>{
  if(!$("bookReader").classList.contains("open"))return;
  if(event.key==="Escape"){if(document.querySelector(".book-reader-dialog").classList.contains("editing"))cancelBookEdit();else closeBookReader();return}
  if(event.target.closest("input,select,textarea,button"))return;
  if(event.key==="ArrowLeft")changeReaderPage(-1);
  if(event.key==="ArrowRight")changeReaderPage(1);
 });
}

async function load(){
 profile=null;
 renderBooks();
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
   window.dispatchEvent(new CustomEvent("dori:lounge-member-locked"));
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
  bookStoreKey="dori-lounge-books:v2:"+user.id;
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
   window.dispatchEvent(new CustomEvent("dori:lounge-member-locked"));
   setLock("회원 프로필을 찾을 수 없습니다","로그인은 확인됐지만 현재 로그인 ID와 일치하는 users 회원 정보가 없습니다. 회원 프로필 연결이 필요합니다. 이 화면의 오류 코드는 PROFILE_NOT_FOUND 입니다.");
   console.error("Dori Lounge profile missing for authenticated user",user.id);
   return;
  }

  member(p,session);
  stage="공용 도서 원고 조회";
  await loadSharedBooks(client);
  const level=Number(p.user_level||1);
  if(p.is_admin!==true&&level<2){
   window.dispatchEvent(new CustomEvent("dori:lounge-member-locked"));
   setLock("VIP 멤버십이 필요합니다","현재 등급은 "+(levels[level]||"일반")+"입니다. 프리미엄 등급 이상부터 라운지를 이용할 수 있습니다.");
   return;
  }

  $("lockPanel").classList.remove("show");
  $("loungeApp").classList.add("show");
  $("loungeMusicPlayer").hidden=false;
  $("loungeMusicPlayer").classList.remove("is-collapsed");
  document.body.classList.add("lounge-music-expanded");
  armMusicIdleTimer();

  stage="수집품 및 음악 인벤토리 조회";
  const inventoryIds=items.map(item=>item.id).concat(musicCatalog.filter(track=>!track.free).map(track=>track.id));
  const inventoryResult=await client.from("user_inventory")
   .select("item_id,purchased_at").eq("user_id",user.id).in("item_id",inventoryIds);
  if(inventoryResult.error){
   console.error("Dori Lounge inventory lookup failed",inventoryResult.error);
   owned=new Set();
   ownedMusic=new Set(["lounge_music_royal_piano"]);
   paintOwned();renderMusicPlayer();paintMusicShop();
   toast("회원 정보는 확인됐지만 보유 음악을 불러오지 못했습니다.");
  }else{
   const inventoryFound=new Set((inventoryResult.data||[]).map(item=>item.item_id));
   owned=new Set(items.map(item=>item.id).filter(id=>inventoryFound.has(id)));
   ownedMusic=new Set(["lounge_music_royal_piano",...musicCatalog.filter(track=>!track.free&&inventoryFound.has(track.id)).map(track=>track.id)]);
   paintOwned();renderMusicPlayer();paintMusicShop();
  }
  paintShop();
  renderBooks();
  updateVisit();
  greeting();
  window.dispatchEvent(new CustomEvent("dori:lounge-member-ready",{detail:{userId:user.id,name:p.name||session.user.email||"회원",level:Number(p.user_level||1),isAdmin:p.is_admin===true}}));
 }catch(e){
  console.error("Dori Lounge account load failed at: "+stage,e);
  const code=String(e&&e.code||e&&e.status||"UNKNOWN");
  let desc="단계: "+stage+" · 오류 코드: "+code+". 로그인 상태를 다시 확인하고 새로고침해 주세요.";
  if(/permission|policy|row.level|rls/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · 회원 데이터 조회 권한이 거부되었습니다. 로그인 계정의 RLS 접근 정책을 확인해야 합니다. 오류 코드: "+code;
  else if(/network|fetch|timeout/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · Supabase 서버에 연결하지 못했습니다. 네트워크 연결 후 다시 시도해 주세요.";
  else if(/column|schema cache|does not exist/i.test(String(e&&e.message||"")))desc="단계: "+stage+" · 요청한 데이터 필드가 DB 구조와 일치하지 않습니다. 오류 코드: "+code;
  window.dispatchEvent(new CustomEvent("dori:lounge-member-locked"));
  setLock("회원 정보 연결 오류",desc);
 }
}
async function buy(id,button){
 if(!db||!user){toast("로그인 상태를 확인해 주세요.");return}
 if(owned.has(id)){toast("이미 보유한 상품입니다.");return}
 const item=items.find(entry=>entry.id===id);if(!item){toast("상품 정보를 찾을 수 없습니다.");return}
 button.disabled=true;button.dataset.loading="true";button.textContent="구매 확인 중…";
 try{
  const confirmed=await window.DoriPurchaseConfirm?.ask({
   itemName:item.name,
   amount:item.price,
   currency:"돌돌코인",
   currentBalance:profile?.doldolcoin,
   detail:"구매가 확정되면 수집품이 계정 인벤토리에 영구 보관됩니다."
  });
  if(!confirmed)return;
  button.textContent="구매 처리 중…";
  const {data,error}=await db.rpc("purchase_vip_lounge_item",{p_item_id:id});if(error)throw error;
  const result=Array.isArray(data)?data[0]:data;if(!result||result.success!==true)throw new Error("Purchase not completed");
  $("memberCoins").textContent=format(result.doldolcoin)+" C";if(profile)profile.doldolcoin=result.doldolcoin;owned.add(id);paintOwned();paintShop();toast((result.item_name||"VIP 상품")+" 구매 완료!");
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
$("supportDraft").addEventListener("input",()=>{prefs.draft=$("supportDraft").value;save();counter();$("draftStatus").textContent="회원 계정 저장 · 클라우드 동기화"});
$("copyInquiry").addEventListener("click",()=>{if(!$("supportDraft").value.trim()){toast("문의 내용을 먼저 작성해 주세요.");return}copy("돌이 라운지 문의\n회원: "+(profile&&profile.name||"회원")+"\n내용:\n"+$("supportDraft").value,"문의 내용을 복사했어요. 공식 문의 경로에 직접 전달해 주세요.")});
$("clearDraft").addEventListener("click",()=>{$("supportDraft").value="";prefs.draft="";save();counter();toast("문의 초안을 비웠어요.")});
document.querySelectorAll("[data-favorite]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.favorite;prefs.favorites=prefs.favorites.includes(id)?prefs.favorites.filter(x=>x!==id):prefs.favorites.concat(id);paintPrefs();save();toast(prefs.favorites.includes(id)?"즐겨찾기에 추가했어요.":"즐겨찾기에서 제거했어요.")}));
$("collectionSearch").addEventListener("input",()=>{const q=$("collectionSearch").value.trim().toLowerCase();document.querySelectorAll("[data-collection-item]").forEach(c=>c.classList.toggle("hidden",!c.dataset.name.toLowerCase().includes(q)))});
$("copyCollection").addEventListener("click",()=>copy("돌이 라운지 컬렉션\n"+items.map(x=>x.name+" · "+(owned.has(x.id)?"보유":"미보유")+(prefs.favorites.includes(x.id)?" · 즐겨찾기":"")).join("\n"),"컬렉션 목록을 복사했어요."));
$("shopSearch").addEventListener("input",paintShop);
$("faqSearch").addEventListener("input",()=>{const q=$("faqSearch").value.trim().toLowerCase();document.querySelectorAll("#faqList details").forEach(d=>d.classList.toggle("hidden",!d.textContent.toLowerCase().includes(q)))});
const hash=location.hash.slice(1);if(["home","salon","library","gallery","concierge","hotel","shop"].includes(hash))nav(hash);
read();loadBookState();greeting();
$("retryAccount").addEventListener("click",async()=>{
 const button=$("retryAccount");
 button.disabled=true;button.textContent="다시 확인하는 중…";
 try{await load()}finally{button.disabled=false;button.textContent="다시 확인"}
});
wireBookReader();
const musicDock=$("loungeMusicPlayer");
["pointerdown","keydown","input","change","click"].forEach(type=>musicDock.addEventListener(type,noteMusicActivity,{passive:true}));
$("musicMiniExpand").addEventListener("click",event=>{
 event.stopPropagation();expandMusicPlayer();
 $("musicPlayToggle").focus({preventScroll:true});
});
window.addEventListener("resize",positionMusicMini,{passive:true});
$("musicPlayToggle").addEventListener("click",()=>void toggleLoungeMusic());
$("musicTrackSelect").addEventListener("change",()=>{
 expandMusicPlayer();
 const id=$("musicTrackSelect").value;
 const wasPlaying=window.DoriLoungeAudio&&window.DoriLoungeAudio.getState().playing;
 prefs.musicTrack=id;save();renderMusicPlayer();paintMusicShop();
 if(wasPlaying)void chooseAndPlayMusic(id);
});
$("musicPrev").addEventListener("click",()=>stepMusic(-1));
$("musicNext").addEventListener("click",()=>stepMusic(1));
$("musicVolume").addEventListener("input",()=>{
 prefs.musicVolume=Number($("musicVolume").value)/100;
 window.DoriLoungeAudio.setVolume(prefs.musicVolume);
});
$("musicVolume").addEventListener("change",save);
$("musicShopSearch").addEventListener("input",paintMusicShop);
$("musicShopJump").addEventListener("click",()=>{
 nav("shop");
 setTimeout(()=>$("musicStore").scrollIntoView({behavior:"smooth",block:"start"}),180);
});
window.addEventListener("dori-lounge-music-state",event=>{
 const state=event.detail||{};
 if(state.trackId&&ownedMusic.has(state.trackId))prefs.musicTrack=state.trackId;
 if(state.progressTick){renderMusicProgress(state);return}
 renderMusicPlayer();
});
renderMusicPlayer();
window.DoriLoungeAudio.setVolume(prefs.musicVolume);
void load();
window.addEventListener("pagehide",()=>{
 if(readerScrollTimer)clearTimeout(readerScrollTimer);
 clearMusicIdleTimer();
 
},{once:true});
})();