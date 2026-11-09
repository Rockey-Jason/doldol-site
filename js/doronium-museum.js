import { createCrystalViewer } from "../doronium-factory/world3d.js?v=20";

let specimens = [];
let applicationRecords = [];
let loreRecord = null;


const grid=document.querySelector("#specimen-grid");
const searchInput=document.querySelector("#specimen-search");
const applicationGrid=document.querySelector("#application-grid");
const loreNote=document.querySelector("#doronium-lore-note");
const archiveStatus=document.querySelector("#museum-archive-status");
const specimenPagination=document.querySelector("#specimen-pagination");
const randomSpecimenButton=document.querySelector("#random-specimen");
const dialogFavoriteButton=document.querySelector("#dialog-favorite");
const dialogPrevButton=document.querySelector("#dialog-prev");
const dialogNextButton=document.querySelector("#dialog-next");
const specimenPrev=document.querySelector("#specimen-prev");
const specimenNext=document.querySelector("#specimen-next");
const specimenPageIndicator=document.querySelector("#specimen-page-indicator");
const specimenPageDots=document.querySelector("#specimen-page-dots");
const countLabel=document.querySelector("#collection-count");
const emptyState=document.querySelector("#empty-state");
const visitedCount=document.querySelector("#visited-count");
const visitedProgress=document.querySelector("#visited-progress");
const dialog=document.querySelector("#specimen-dialog");
const dialogCanvas=document.querySelector("#specimen-canvas");
const toastEl=document.querySelector("#museum-toast");
let activeFilter="all",activeViewer=null,toastTimer=0,viewed=new Set(),favorites=new Set(),activeSpecimenPage=0,lastSpecimenPageSize=0,activeDialogItem=null;
try{
 const saved=JSON.parse(localStorage.getItem("doriMuseumViewed.v2")||"[]");
 if(Array.isArray(saved))viewed=new Set(saved.filter(id=>typeof id==="string"));
}catch{viewed=new Set();}
try{const saved=JSON.parse(localStorage.getItem("doriMuseumFavorites.v1")||"[]");if(Array.isArray(saved))favorites=new Set(saved.filter(id=>typeof id==="string"));}catch{favorites=new Set();}

const filterNames={base:"기초 재료",variant:"변형 도로늄",special:"특수 도로늄",stones:"돌피니티 스톤",favorites:"즐겨찾기"};
const SUPABASE_URL="https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";;
const legacyIds={
 "dn-doronium":"dn","rotten-doronium":"rotten","red-doronium":"red","rusted-doronium":"rusted",
 "yin-yang-doronium":"yinyang","legendary-hard-doronium":"legendary-hard","doronium-special-edition":"special-edition",
 "dolstrong-stone":"dolstrong","doldoridori-speed-stone":"speed-stone","timestop-dolpinity-stone":"time-stop-stone",
 "long-name-dolpinity-stone":"new-stone"
};
const gemColors={
 "dn-doronium":"#65d8e7","rotten-doronium":"#a7a18a","red-doronium":"#e96565","rusted-doronium":"#c58a56",
 "yin-yang-doronium":"#c8d6df","legendary-hard-doronium":"#88b8ce","doronium-special-edition":"#d8bd80",
 "dolstrong-stone":"#b6a0e2","doldoridori-speed-stone":"#8ca6eb","timestop-dolpinity-stone":"#a89be4",
 "long-name-dolpinity-stone":"#83c9d7"
};
const gemGlow={
 "dn-doronium":"rgba(101,216,231,.22)","rotten-doronium":"rgba(167,161,138,.2)","red-doronium":"rgba(233,101,101,.23)",
 "rusted-doronium":"rgba(197,138,86,.22)","yin-yang-doronium":"rgba(190,213,226,.23)",
 "legendary-hard-doronium":"rgba(136,184,206,.24)","doronium-special-edition":"rgba(216,189,128,.24)",
 "dolstrong-stone":"rgba(182,160,226,.23)","doldoridori-speed-stone":"rgba(140,166,235,.24)",
 "timestop-dolpinity-stone":"rgba(168,155,228,.24)","long-name-dolpinity-stone":"rgba(131,201,215,.22)"
};
const groupByCategory={"기초 재료":"base","변형 도로늄":"variant","특수 도로늄":"special","돌피니티 스톤":"stones"};
const categoryGrades={"기초 재료":"BASE MATERIAL","변형 도로늄":"ALTERED MATERIAL","특수 도로늄":"SPECIAL MATERIAL","돌피니티 스톤":"DOLPINITI RELIC"};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function formatSources(numbers){
 const values=Array.isArray(numbers)?numbers.map(Number).filter(Number.isFinite):[];
 return values.length?"제"+values.join("·")+"회":"출처 미기록";
}
function mapArchiveRecord(row){
 const numbers=Array.isArray(row.source_news_numbers)?row.source_news_numbers:[];
 const appearance="신문에는 결정의 정확한 기하학적 외형이 별도로 묘사되어 있지 않습니다. 화면의 보석은 반투명 광물 형태로 통일한 전시용 참고 모형입니다.";
 return {
  id:legacyIds[row.id]||row.id,archiveId:row.id,name:row.name_ko,en:row.name_en,
  grade:categoryGrades[row.category]||row.category,group:groupByCategory[row.category]||"special",
  color:gemColors[row.id]||"#69d6e2",glow:gemGlow[row.id]||"rgba(105,214,226,.22)",
  desc:row.characteristics||"신문에 기록된 특징이 없습니다.",
  characteristics:row.characteristics||"신문에 기록된 특징이 없습니다.",
  abilities:row.abilities||"신문에 별도의 능력 설명이 없습니다.",
  appearance,process:row.manufacturing||"제조법 미기록",recipe:row.manufacturing||"제조법 미기록",
  manufacturing:row.manufacturing||"제조법 미기록",
  note:row.source_notes||"",sources:formatSources(numbers),sourceIds:numbers
 };
}
async function loadMuseumArchive(){
 try{
  if(!window.supabase||typeof window.supabase.createClient!=="function")throw new Error("Supabase 라이브러리를 불러오지 못했습니다.");
  const sb=window.doriSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  if(!window.doriSupabase)window.doriSupabase=sb;
  const {data,error}=await sb.from("doronium_archive")
   .select("id,record_type,museum_order,name_ko,name_en,category,characteristics,abilities,manufacturing,source_news_numbers,source_notes")
   .eq("is_published",true).order("museum_order",{ascending:true});
  if(error)throw error;
  const rows=Array.isArray(data)?data:[];
  const collection=rows.filter(row=>row.record_type==="specimen"||row.record_type==="relic");
  applicationRecords=rows.filter(row=>row.record_type==="application");
  loreRecord=rows.find(row=>row.record_type==="lore")||null;
  if(collection.length!==11)console.warn("Expected 11 newspaper specimens; received",collection.length);
  specimens=collection.map(mapArchiveRecord);
  viewed=new Set([...viewed].filter(id=>specimens.some(item=>item.id===id)));
  renderCards();updateProgress();renderApplications();renderLore();
  archiveStatus.textContent=`Supabase 원본 아카이브 연결 완료 · 표본 ${specimens.length}개 · 파생 기록 ${applicationRecords.length}개`;
  if(!specimens.length)throw new Error("전시 표본 자료가 비어 있습니다.");
 }catch(error){
  console.error("Doronium archive load failed",error);
  archiveStatus.textContent="Supabase 아카이브 연결에 실패했습니다.";
  countLabel.textContent="전시 자료를 불러오지 못했습니다";
  emptyState.hidden=false;
  emptyState.textContent="도로늄 전시 자료를 불러오지 못했습니다. 연결 상태를 확인한 뒤 새로고침해 주세요.";
  showToast("Supabase 도로늄 아카이브를 불러오지 못했습니다.");
 }
}
function renderApplications(){
 if(!applicationGrid)return;
 applicationGrid.innerHTML=applicationRecords.map((row,index)=>`<article class="application-card application-card-database">
  <span class="application-index">${String(index+1).padStart(2,"0")} · ${escapeHtml(row.category)}</span>
  <h3>${escapeHtml(row.name_ko)}</h3>
  <div class="application-detail"><small>도로늄 특징</small><p>${escapeHtml(row.characteristics)}</p></div>
  <div class="application-detail"><small>도로늄 능력</small><p>${escapeHtml(row.abilities)}</p></div>
  <div class="application-detail"><small>제조법</small><p>${escapeHtml(row.manufacturing)}</p></div>
  <small class="application-source">출처: ${escapeHtml(formatSources(row.source_news_numbers))} 돌이신문</small>
 </article>`).join("");
}
function renderLore(){
 if(!loreNote||!loreRecord)return;
 loreNote.innerHTML=`<aside class="archive-lore-card">
  <small>SUPPLEMENTAL NEWSPAPER RECORD</small>
  <h3>${escapeHtml(loreRecord.name_ko)}</h3>
  <p>${escapeHtml(loreRecord.characteristics)}</p>
  <p>${escapeHtml(loreRecord.abilities)}</p>
  <small>제조·분류 참고: ${escapeHtml(loreRecord.manufacturing)}</small>
  <small class="archive-lore-source">출처: ${escapeHtml(formatSources(loreRecord.source_news_numbers))} 돌이신문</small>
 </aside>`;
}
function renderGem(item){
 const id="gem-"+item.id.replace(/[^a-z0-9-]/gi,"");
 return `<svg class="specimen-gem" viewBox="0 0 120 150" role="img" aria-label="${item.name} 반투명 보석 참고 모형">
  <defs>
   <linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".94"/><stop offset=".18" stop-color="${item.color}" stop-opacity=".86"/><stop offset=".58" stop-color="${item.color}" stop-opacity=".48"/><stop offset="1" stop-color="#071a32" stop-opacity=".82"/></linearGradient>
   <linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffffff" stop-opacity=".54"/><stop offset=".5" stop-color="${item.color}" stop-opacity=".2"/><stop offset="1" stop-color="#031326" stop-opacity=".78"/></linearGradient>
   <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
   <radialGradient id="${id}-core"><stop stop-color="#ffffff" stop-opacity=".76"/><stop offset=".34" stop-color="${item.color}" stop-opacity=".42"/><stop offset="1" stop-color="${item.color}" stop-opacity="0"/></radialGradient>
   <filter id="${id}-blur"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <ellipse cx="60" cy="139" rx="29" ry="5" fill="${item.color}" opacity=".5" filter="url(#${id}-blur)"/>
  <path d="M60 5 104 35 91 116 60 145 29 116 16 35Z" fill="url(#${id}-body)" stroke="#efffff" stroke-opacity=".9" stroke-width="1.6"/>
  <path d="M60 5 104 35 60 61 16 35Z" fill="#ffffff" fill-opacity=".34"/>
  <path d="M16 35 60 61 29 116Z" fill="${item.color}" fill-opacity=".52"/>
  <path d="M104 35 60 61 91 116Z" fill="url(#${id}-side)"/>
  <path d="M29 116 60 61 60 145Z" fill="#ffffff" fill-opacity=".2"/>
  <path d="M91 116 60 61 60 145Z" fill="#06172c" fill-opacity=".46"/>
  <path d="M60 5 60 145M16 35 104 35M29 116 91 116" fill="none" stroke="#eaffff" stroke-opacity=".54" stroke-width="1.1"/>
  <path d="M27 34 50 20 42 52 31 76Z" fill="url(#${id}-shine)" opacity=".84"/>
  <path d="M60 5 104 35 60 61 16 35Z" fill="none" stroke="#ffffff" stroke-opacity=".58"/>
  <ellipse cx="60" cy="69" rx="19" ry="28" fill="url(#${id}-core)" opacity=".9"/>
  <path d="M16 35 29 116 60 145 91 116 104 35" fill="none" stroke="#bafaff" stroke-opacity=".25" stroke-width="2"/>
 </svg>`;
}
function visibleSpecimens(){
 const q=searchInput.value.trim().toLocaleLowerCase();
 return specimens.filter(item=>{
  const matchesFilter=activeFilter==="all"||(activeFilter==="favorites"?favorites.has(item.id):item.group===activeFilter);
  const matchesText=!q||[item.name,item.en,item.desc,item.abilities,item.process,item.recipe,item.sources,item.note].some(value=>String(value??"").toLocaleLowerCase().includes(q));
  return matchesFilter&&matchesText;
 });
}
function specimenPageSize(){return window.matchMedia("(max-width:760px)").matches?1:3;}
function renderSpecimenPagination(totalPages){
 if(!specimenPagination)return;
 specimenPagination.hidden=totalPages<=1;
 specimenPageIndicator.textContent=`${String(activeSpecimenPage+1).padStart(2,"0")} / ${String(totalPages).padStart(2,"0")}`;
 specimenPrev.disabled=activeSpecimenPage===0;
 specimenNext.disabled=activeSpecimenPage>=totalPages-1;
 specimenPageDots.innerHTML=Array.from({length:totalPages},(_,i)=>`<button type="button" data-specimen-page="${i}" aria-label="${i+1}페이지" aria-current="${i===activeSpecimenPage?"page":"false"}"></button>`).join("");
 specimenPageDots.querySelectorAll("[data-specimen-page]").forEach(button=>button.addEventListener("click",()=>setSpecimenPage(Number(button.dataset.specimenPage))));
}
function setSpecimenPage(next){
 const visible=visibleSpecimens(),size=specimenPageSize(),total=Math.max(1,Math.ceil(visible.length/size));
 activeSpecimenPage=Math.max(0,Math.min(total-1,next));
 renderCards();
}
function renderCards(){
 const visible=visibleSpecimens(),size=specimenPageSize();
 lastSpecimenPageSize=size;
 const totalPages=Math.max(1,Math.ceil(visible.length/size));
 activeSpecimenPage=Math.max(0,Math.min(activeSpecimenPage,totalPages-1));
 const start=activeSpecimenPage*size,pageItems=visible.slice(start,start+size);
 grid.classList.remove("page-turn-in");void grid.offsetWidth;grid.classList.add("page-turn-in");
 grid.innerHTML=pageItems.map(item=>{
  const number=String(specimens.indexOf(item)+1).padStart(3,"0");
  const seen=viewed.has(item.id),saved=favorites.has(item.id);
  return `<button class="specimen-card" type="button" data-specimen="${item.id}" style="--gem:${item.color};--gem-glow:${item.glow}" aria-label="${item.name} 상세 정보 열기">
   <div class="specimen-visual"><span class="specimen-number">NO. ${number}</span><span class="specimen-grade">${item.grade}</span><span class="specimen-favorite-mark" aria-label="${saved?"즐겨찾기 저장됨":"즐겨찾기 미저장"}">${saved?"★":"☆"}</span>${renderGem(item)}<small class="visual-disclaimer">반투명 보석 · 전시용 참고 모형</small></div>
   <div class="specimen-copy"><small>${item.en}</small><strong>${item.name}</strong><span>${item.desc}</span></div>
   <div class="specimen-open"><span>${seen?"관람한 표본":"전시 기록 · 상세 보기"}</span><b>↗</b></div>
  </button>`;
 }).join("");
 countLabel.textContent=visible.length?`${visible.length}개 표본 · ${start+1}–${Math.min(start+pageItems.length,visible.length)} 전시 중`:"0개 표본 전시 중";
 emptyState.hidden=visible.length>0;
 renderSpecimenPagination(totalPages);
}
function updateProgress(){
 visitedCount.textContent=String(viewed.size);
 visitedProgress.style.width=(specimens.length?viewed.size/specimens.length*100:0)+"%";
 try{localStorage.setItem("doriMuseumViewed.v2",JSON.stringify([...viewed]));}catch{}
 try{localStorage.setItem("doriMuseumFavorites.v1",JSON.stringify([...favorites]));}catch{}
}
function showToast(message){
 toastEl.textContent=message;toastEl.classList.add("show");clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toastEl.classList.remove("show"),2200);
}
function fillDialog(item){
 activeDialogItem=item;
 const index=specimens.indexOf(item)+1;
 document.querySelector("#dialog-class").textContent=`NEWSPAPER SPECIMEN / ${String(index).padStart(3,"0")} · ${item.grade}`;
 document.querySelector("#dialog-title").textContent=item.name;
 document.querySelector("#dialog-lead").textContent=item.desc;
 document.querySelector("#dialog-tags").innerHTML=`<span>${item.en}</span><span>${filterNames[item.group]}</span><span>돌이신문 근거 확인</span>`;
 document.querySelector("#dialog-characteristics").textContent=item.characteristics+"\n\n신문의 외형 기록: "+item.appearance;
 document.querySelector("#dialog-abilities").textContent=item.abilities;
 document.querySelector("#dialog-process").textContent=item.manufacturing+"\n\n추가 기록: "+item.note;
 document.querySelector("#dialog-source").textContent=item.sources+" 돌이신문. "+item.note+" 신문 원문에서 확인되는 기록만 반영했습니다.";
 if(dialogFavoriteButton){dialogFavoriteButton.textContent=favorites.has(item.id)?"★ 즐겨찾기 저장됨":"☆ 즐겨찾기 추가";dialogFavoriteButton.setAttribute("aria-pressed",String(favorites.has(item.id)));}
 const position=specimens.indexOf(item);if(dialogPrevButton)dialogPrevButton.disabled=position<=0;if(dialogNextButton)dialogNextButton.disabled=position>=specimens.length-1;
}
function openSpecimen(item){
 if(activeViewer){activeViewer.dispose();activeViewer=null;}
 fillDialog(item);
 if(!dialog.open)dialog.showModal();
 viewed.add(item.id);updateProgress();renderCards();
 requestAnimationFrame(()=>{
  try{
   // The source newspapers do not specify exact crystal geometry for these specimens.
   // Use the generic base Doronium model solely as a reference illustration.
   activeViewer=createCrystalViewer(dialogCanvas,"doronium_normal",{glass:true,color:item.color});
  }catch(error){
   console.error("3D specimen viewer unavailable",error);
   showToast("3D 참고 모형을 불러오지 못했어요. 신문 기록은 계속 볼 수 있습니다.");
  }
 });
}
grid.addEventListener("click",event=>{
 const card=event.target.closest("[data-specimen]");
 if(!card)return;
 const item=specimens.find(entry=>entry.id===card.dataset.specimen);
 if(item)openSpecimen(item);
});
document.querySelectorAll("[data-filter]").forEach(button=>{
 button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(tab=>{
   const selected=tab===button;tab.classList.toggle("active",selected);tab.setAttribute("aria-pressed",String(selected));
  });
  activeSpecimenPage=0;renderCards();
 });
});
searchInput.addEventListener("input",()=>{activeSpecimenPage=0;renderCards();});
specimenPrev?.addEventListener("click",()=>setSpecimenPage(activeSpecimenPage-1));
specimenNext?.addEventListener("click",()=>setSpecimenPage(activeSpecimenPage+1));
document.querySelector("#dialog-done").addEventListener("click",()=>dialog.close());
dialogFavoriteButton?.addEventListener("click",()=>{if(!activeDialogItem)return;const id=activeDialogItem.id;if(favorites.has(id))favorites.delete(id);else favorites.add(id);updateProgress();fillDialog(activeDialogItem);renderCards();showToast(favorites.has(id)?"즐겨찾기에 보관했습니다.":"즐겨찾기에서 제거했습니다.");});
function moveDialogSpecimen(direction){if(!activeDialogItem)return;const list=visibleSpecimens();const index=list.findIndex(item=>item.id===activeDialogItem.id);const target=list[index+direction];if(target)openSpecimen(target);}
dialogPrevButton?.addEventListener("click",()=>moveDialogSpecimen(-1));dialogNextButton?.addEventListener("click",()=>moveDialogSpecimen(1));
randomSpecimenButton?.addEventListener("click",()=>{const pool=visibleSpecimens();if(!pool.length){showToast("선택한 조건에 표본이 없습니다.");return;}const item=pool[Math.floor(Math.random()*pool.length)];openSpecimen(item);});
dialog.addEventListener("close",()=>{if(activeViewer){activeViewer.dispose();activeViewer=null;}});
document.querySelector("#reset-visit").addEventListener("click",()=>{
 viewed.clear();updateProgress();renderCards();showToast("관람 기록을 초기화했습니다.");
});
document.addEventListener("keydown",event=>{
 if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)){
  event.preventDefault();searchInput.focus();
 }
});
function setupChapterDeck(){
 const deck=document.querySelector("#museum-deck");if(!deck)return;
 const hero=deck.querySelector(".museum-hero"),facts=deck.querySelector(".museum-facts");
 if(hero&&facts&&!hero.contains(facts)){const bottomline=hero.querySelector(".hero-bottomline");hero.insertBefore(facts,bottomline||null);}
 const pages=Array.from(deck.children).filter(node=>node.matches("section"));
 const chapterNames=["입장","결정 전시","가공과 활용","기록의 역사","특별 전시","관람 종료"];
 const chapterCodes=["INTRODUCTION","THE COLLECTION","APPLICATIONS","ARCHIVE HISTORY","SPECIAL EXHIBITION","THANK YOU"];
 pages.forEach((page,index)=>{page.classList.add("museum-page");page.dataset.chapter=String(index);page.setAttribute("aria-label",chapterNames[index]||`전시실 ${index+1}`);});
 const steps=document.querySelector("#chapter-steps"),counter=document.querySelector("#chapter-counter"),currentTitle=document.querySelector("#chapter-current-title");
 const previous=document.querySelector("#chapter-prev"),next=document.querySelector("#chapter-next");
 let current=0,scrollFrame=0,swipeStart=null,suppressSwipeClick=false;
 steps.innerHTML=pages.map((page,index)=>`<button type="button" class="chapter-step" data-chapter-step="${index}" aria-label="${index+1}번 전시실: ${chapterNames[index]}" aria-current="${index===0?"step":"false"}"><span></span></button>`).join("");
 function paint(index){
  current=Math.max(0,Math.min(pages.length-1,index));
  counter.textContent=`${String(current+1).padStart(2,"0")} / ${String(pages.length).padStart(2,"0")}`;
  currentTitle.textContent=`${chapterNames[current]} · ${chapterCodes[current]}`;
  steps.querySelectorAll("[data-chapter-step]").forEach(button=>{const selected=Number(button.dataset.chapterStep)===current;button.setAttribute("aria-current",selected?"step":"false");button.classList.toggle("active",selected);});
  previous.disabled=current===0;next.disabled=current===pages.length-1;
 }
 function go(index){const target=Math.max(0,Math.min(pages.length-1,index));deck.scrollTo({left:target*deck.clientWidth,behavior:"smooth"});paint(target);}
 previous.addEventListener("click",()=>go(current-1));next.addEventListener("click",()=>go(current+1));
 steps.addEventListener("click",event=>{const button=event.target.closest("[data-chapter-step]");if(button)go(Number(button.dataset.chapterStep));});
 deck.addEventListener("scroll",()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(deck.clientWidth)paint(Math.round(deck.scrollLeft/deck.clientWidth));});},{passive:true});
 deck.addEventListener("pointerdown",event=>{if(event.pointerType==="mouse"&&event.button!==0)return;if(event.target.closest("input,button,a,dialog"))return;swipeStart={x:event.clientX,y:event.clientY,target:event.target};},{passive:true});
 deck.addEventListener("pointerup",event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y,startTarget=swipeStart.target;swipeStart=null;if(Math.abs(dx)<58||Math.abs(dx)<Math.abs(dy)*1.25)return;suppressSwipeClick=true;setTimeout(()=>{suppressSwipeClick=false;},450);if(startTarget.closest(".specimen-grid")){setSpecimenPage(activeSpecimenPage+(dx<0?1:-1));return;}go(current+(dx<0?1:-1));});
 deck.addEventListener("pointercancel",()=>{swipeStart=null;});
 deck.addEventListener("click",event=>{if(!suppressSwipeClick)return;event.preventDefault();event.stopPropagation();},true);
 deck.addEventListener("wheel",event=>{
  if(Math.abs(event.deltaY)<Math.abs(event.deltaX)||Math.abs(event.deltaY)<18)return;
  const page=pages[current];if(!page)return;
  const atTop=page.scrollTop<=2,atBottom=page.scrollTop+page.clientHeight>=page.scrollHeight-3;
  const down=event.deltaY>0&&atBottom&&current<pages.length-1,up=event.deltaY<0&&atTop&&current>0;
  if(down||up){event.preventDefault();go(current+(down?1:-1));}
 },{passive:false});
 document.addEventListener("keydown",event=>{
  if(document.querySelector(".specimen-dialog")?.open)return;
  if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;
  if(event.key==="ArrowRight"){event.preventDefault();go(current+1);}
  if(event.key==="ArrowLeft"){event.preventDefault();go(current-1);}
  if(event.key==="Home"){event.preventDefault();go(0);}
  if(event.key==="End"){event.preventDefault();go(pages.length-1);}
 });
 document.addEventListener("click",event=>{
  const anchor=event.target.closest('a[href^="#"]');if(!anchor)return;
  const target=document.getElementById(anchor.getAttribute("href").slice(1));if(!target)return;
  const page=target.closest(".museum-page");if(!page)return;
  event.preventDefault();go(pages.indexOf(page));
  if(target===page)page.scrollTo({top:0,behavior:"smooth"});
  else requestAnimationFrame(()=>page.scrollTo({top:Math.max(0,target.offsetTop-page.offsetTop),behavior:"smooth"}));
 });
 window.addEventListener("resize",()=>{const size=specimenPageSize();if(size!==lastSpecimenPageSize){activeSpecimenPage=0;renderCards();}});
 paint(0);
}
setupChapterDeck();
renderCards();updateProgress();
void loadMuseumArchive();
