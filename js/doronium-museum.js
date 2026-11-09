import { createCrystalViewer } from "../doronium-factory/world3d.js?v=19";

const specimens = [
 {id:"dn",name:"일반 도로늄 · Dn / Dr",en:"DORONIUM · Dn / Dr",grade:"BASE MATERIAL",group:"base",color:"#65d8e7",glow:"rgba(101,216,231,.22)",visual:"crystal",appearance:"신문에는 일반 도로늄의 결정 외형이 구체적으로 묘사되어 있지 않습니다.",desc:"압축된 돌이 고기를 Dn(Doronium)라고 부른다고 제11회 돌이신문이 명시합니다. 제12회에는 Dr(도로늄) 표기도 등장합니다.",process:"돌이 고기를 강한 열과 압력으로 압축해 Dn을 만듭니다. 이어 다이아몬드·돌이털·압축된 돌이 고기·황금·돌이가 먹던 돌을 섞고 다시 압축한다고 제16회에 기록되어 있습니다.",recipe:"① 돌이 고기를 강한 열과 압력으로 압축한다. ② 다이아몬드, 돌이털, 압축된 돌이 고기, 황금, 돌이가 먹던 돌을 섞는다. ③ 혼합물을 다시 압축한다.",note:"제9·10·33·37회는 돌이 고기의 열·압력·압축 기록을 보충합니다. 제33회에 따르면 압력이 약하면 약간 압축된 돌이 고기 스테이크가 되고, 열이 약하면 썩은 도로늄이 됩니다. 이 부산물은 일반 도로늄과 구별해 전시합니다.",sources:"제9·10·11·12·16·33·37회",sourceIds:[9,10,11,12,16,33,37]},
 {id:"rotten",name:"썩은 도로늄",en:"ROTTEN DORONIUM",grade:"ALTERED MATERIAL",group:"variant",color:"#a7a18a",glow:"rgba(167,161,138,.2)",visual:"crystal",appearance:"신문에는 색상이나 결정 형태가 따로 적혀 있지 않습니다.",desc:"제33회 돌이신문은 돌이 고기를 압력과 열로 압축하는 과정에서 열이 약하면 썩은 도로늄이 된다고 설명합니다.",process:"돌이 고기를 압축하는 공정에서 열을 약하게 처리한 결과물로 기록되어 있습니다.",recipe:"돌이 고기를 압력과 열로 압축하는 공정에서 열을 약하게 한다. 신문에는 구체적인 온도·시간·추가 재료가 적혀 있지 않습니다.",note:"신문에 명시된 것은 '열이 약하면 썩은 도로늄'이라는 설명입니다. 정확한 온도나 후처리 공정은 임의로 보충하지 않았습니다.",sources:"제33회",sourceIds:[33]},
 {id:"red",name:"붉은 도로늄",en:"RED DORONIUM",grade:"ALTERED MATERIAL",group:"variant",color:"#e96565",glow:"rgba(233,101,101,.23)",visual:"crystal",appearance:"이름으로 붉은색이 확인되지만, 결정의 구체적인 형태는 기록되어 있지 않습니다.",desc:"제34회 돌이신문에서 돌이가 직접 이름을 붙이고 제조 과정을 설명한 붉은 도로늄입니다.",process:"도로늄을 먼저 '김장'한 뒤, 9억 도에서 도로늄과 루비를 함께 녹입니다. 이를 -10억 도로 얼리고, 녹인 루비와 함께 압축한다고 기록되어 있습니다.",recipe:"① 도로늄을 김장한다. ② 9억 도에서 도로늄과 루비를 함께 녹인다. ③ -10억 도로 얼린다. ④ 녹인 루비와 함께 압축한다.",note:"온도와 김장 과정은 신문에 쓰인 표현을 그대로 옮겼습니다. 현실의 재료 공정이나 과학적 제조법으로 바꾸어 해석하지 않았습니다.",sources:"제34회",sourceIds:[34]},
 {id:"rusted",name:"약간 녹슨 도로늄",en:"SLIGHTLY RUSTED DORONIUM",grade:"ALTERED MATERIAL",group:"variant",color:"#c58a56",glow:"rgba(197,138,86,.22)",visual:"crystal",appearance:"신문에는 녹슨다는 특성만 나오며, 결정의 정확한 모양은 묘사되지 않습니다.",desc:"제34회 돌이신문은 구리와 함께 녹인 도로늄을 피뢰침에 두고 번개를 맞힌 뒤 물을 뿌려 녹슬게 만드는 과정을 설명합니다.",process:"도로늄과 구리를 함께 녹여 섞고, 비 오는 날 피뢰침에 꽂아 번개를 맞힌 다음 물을 뿌려 녹슬게 합니다.",recipe:"① 도로늄과 구리를 함께 녹여 섞는다. ② 비 오는 날 피뢰침에 꽂는다. ③ 번개가 떨어지게 한다. ④ 물을 뿌려 녹슬게 한다.",note:"신문에 기록된 이름은 '약간 녹슨 도로늄'입니다. 구리 비율이나 번개 횟수 등은 공개되어 있지 않습니다.",sources:"제34·35회",sourceIds:[34,35]},
 {id:"yinyang",name:"음양 도로늄",en:"YIN-YANG DORONIUM",grade:"LEGENDARY MATERIAL",group:"special",color:"#c8d6df",glow:"rgba(190,213,226,.23)",visual:"yin",appearance:"이름은 음양 도로늄으로 기록되지만, 결정 외형에 대한 별도 묘사는 없습니다.",desc:"블랙홀에 도로늄을 넣고 즉시 생기는 화이트홀에서 다시 얻는다고 기록된 전설의 도로늄입니다.",process:"제35회는 도로늄 1경 개를 준비해 강한 중력으로 압축한 뒤 블랙홀에 넣고, 들어가자마자 생기는 화이트홀에서 다시 얻는 과정을 설명합니다. 제36회는 블랙홀과 화이트홀을 만드는 세계관 설정을 덧붙입니다.",recipe:"① 도로늄 1경 개를 준비한다. ② 블랙홀의 중력으로 도로늄을 매우 강하게 압축한다. ③ 블랙홀에 넣는다. ④ 즉시 생기는 화이트홀에서 도로늄을 다시 얻는다. 제36회에는 태양보다 질량이 큰 별, 돌피니티 스톤 6개와 돌틀렛, 시간을 거꾸로 돌리는 설정이 추가로 설명됩니다.",note:"블랙홀·화이트홀 제조는 신문 속 허구 세계관의 설정입니다. 실제 과학적 제조 방법을 뜻하지 않습니다. 제21회도 블랙홀에 넣고 화이트홀에서 되돌아오면 음양 도로늄이 된다고 설명합니다.",sources:"제21·33·35·36회",sourceIds:[21,33,35,36]},
 {id:"legendary-hard",name:"전설의 단단한 도로늄",en:"LEGENDARY HARD DORONIUM",grade:"LEGENDARY MATERIAL",group:"special",color:"#88b8ce",glow:"rgba(136,184,206,.24)",visual:"crystal",appearance:"신문에는 '전설의 단단한 도로늄'이라는 이름과 단단하다는 설명만 기록되어 있습니다.",desc:"제43회에서 매우 많은 도로늄을 압축하고 블랙홀로 더 압축하는 계획이 나오며, 제44회에서 전설의 단단한 도로늄을 얻었다고 기록합니다.",process:"도로늄을 무한 개 모아 압축한 뒤 블랙홀에 던져 더 압축하는 과정으로 설명됩니다.",recipe:"① 도로늄을 무한 개 모은다. ② 압축한다. ③ 블랙홀에 넣어 더욱 압축한다. 제44회에서 결과물을 '전설의 단단한 도로늄'이라고 부릅니다.",note:"정확한 수량·압축 조건은 기재되어 있지 않습니다. 별도의 결정 색상이나 형상도 신문에서 확인되지 않습니다.",sources:"제43·44회",sourceIds:[43,44]},
 {id:"special-edition",name:"도로늄 스페셜 에디션",en:"DORONIUM SPECIAL EDITION",grade:"SPECIAL EDITION",group:"special",color:"#d8bd80",glow:"rgba(216,189,128,.24)",visual:"seal",appearance:"신문에는 스페셜 에디션의 외형이나 색상이 기록되어 있지 않습니다.",desc:"제48회에서 만들겠다고 언급되고, 제49회에는 도로늄 공장 가동 후 일반 도로늄과 함께 모이고 있다고 기록됩니다.",process:"신문에는 스페셜 에디션을 공장에서 생산·수집한다는 사실만 있습니다.",recipe:"신문에 구체적인 제조법이 기록되어 있지 않습니다. 재료, 공정, 온도를 임의로 추가하지 않았습니다.",note:"스페셜 에디션은 신문에서 이름이 확인되는 별도 항목이므로 전시하지만, 제조법은 '미공개'로 표시합니다.",sources:"제48·49회",sourceIds:[48,49]},
 {id:"dolstrong",name:"돌스트롱 스톤",en:"DOLSTRONG STONE",grade:"DOLPINITI RELIC",group:"stones",color:"#b6a0e2",glow:"rgba(182,160,226,.23)",visual:"stone",appearance:"신문에는 별도의 결정 외형이 묘사되지 않습니다.",desc:"제7회 돌이신문이 첫 번째 돌피니티 스톤으로 소개하며, 힘을 강하게 해주는 스톤이라고 설명합니다. 제36회는 돌피니티 스톤도 도로늄이라고 명시합니다.",process:"제조 과정은 신문에 기록되어 있지 않습니다. 돌이가 찾아 획득한 유물로 등장합니다.",recipe:"제조법 미기록 · 신문에는 '힘을 강하게 해주는 첫 번째 돌피니티 스톤'으로 설명되어 있습니다.",note:"돌피니티 스톤은 신문에서 도로늄이라고 확인된 파생 유물로 분류했습니다. 신문에 없는 재료나 제작법은 추가하지 않았습니다.",sources:"제7·36회",sourceIds:[7,36]},
 {id:"speed-stone",name:"돌도리도리스피드 스톤",en:"DOLDORIDORI SPEED STONE",grade:"DOLPINITI RELIC",group:"stones",color:"#b6a0e2",glow:"rgba(182,160,226,.23)",visual:"stone",appearance:"신문에는 별도의 결정 외형이 묘사되지 않습니다.",desc:"제7회 돌이신문이 두 번째 돌피니티 스톤으로 소개하며, 속도를 빠르게 해주는 스톤이라고 설명합니다. 제36회는 돌피니티 스톤도 도로늄이라고 명시합니다.",process:"제조 과정은 신문에 기록되어 있지 않습니다. 블랙홀에서 빠져나온 뒤 발견한 유물로 서술됩니다.",recipe:"제조법 미기록 · 신문에는 '속도를 빠르게 해주는 두 번째 돌피니티 스톤'이라고 기록되어 있습니다.",note:"신문의 표기를 유지했습니다. 별도 3D 결정 형태나 재료는 알려져 있지 않습니다.",sources:"제7·36회",sourceIds:[7,36]},
 {id:"time-stop-stone",name:"돌도리도리멍멍팔팔시스팡타임스톱돌돌돌이",en:"TIME-STOP DOLPINITI STONE",grade:"DOLPINITI RELIC",group:"stones",color:"#b6a0e2",glow:"rgba(182,160,226,.23)",visual:"stone",appearance:"신문에는 별도의 결정 외형이 묘사되지 않습니다.",desc:"제8·9회 돌이신문에서 세 번째 돌피니티 스톤으로 이름이 언급됩니다. 이름에 '타임스톱'이 포함되어 있지만, 별도의 제조법은 나오지 않습니다.",process:"제조 과정은 신문에 기록되어 있지 않습니다. 돌이가 찾고 있던 세 번째 돌피니티 스톤으로 등장합니다.",recipe:"제조법 미기록 · 제8·9회에 이름과 세 번째 스톤이라는 사실이 기록되어 있습니다.",note:"긴 고유 명칭을 신문 표기대로 보존했습니다. 이름 이외의 결정 형태나 제작 재료는 추가하지 않았습니다.",sources:"제8·9·36회",sourceIds:[8,9,36]},
 {id:"new-stone",name:"새로운 돌피니티 스톤",en:"NEWLY NAMED DOLPINITI STONE",grade:"DOLPINITI RELIC",group:"stones",color:"#b6a0e2",glow:"rgba(182,160,226,.23)",visual:"stone",appearance:"신문에는 별도의 결정 외형이 묘사되지 않습니다.",desc:"제45회 돌이신문에서 새로 만들었다고 언급되는 돌피니티 스톤입니다. 신문에 적힌 매우 긴 고유 명칭을 아래 기록에 보존했습니다.",process:"새로운 돌피니티 스톤을 만들었다는 서술은 있지만 제조 재료와 절차는 기록되어 있지 않습니다.",recipe:"제조법 미기록 · 신문에는 '새로운 돌피니티 스톤을 만들었다'는 내용과 이름만 나옵니다.",note:"신문에 나온 전체 이름: 돌도리도리멍멍멍머머멍으르렁으르렁멍머멍머!도로도로늄늄늄늄늄도로늄도로돌도리멍멍팔찰시스팡멍멍으르르르렁멍머머머멍으르르멍머머어어!!!멍머멍머으르도로늄도로도로늄늄늄늄늄도로로로로로도로로로로로늄모니아돌도리멍멍으르렁 도로늄먼멍팔팔으르렁시스팡돌돌돌더인피미티록돌피니티 스톤.",sources:"제45회",sourceIds:[45]}
];

const grid=document.querySelector("#specimen-grid");
const searchInput=document.querySelector("#specimen-search");
const countLabel=document.querySelector("#collection-count");
const emptyState=document.querySelector("#empty-state");
const visitedCount=document.querySelector("#visited-count");
const visitedProgress=document.querySelector("#visited-progress");
const dialog=document.querySelector("#specimen-dialog");
const dialogCanvas=document.querySelector("#specimen-canvas");
const toastEl=document.querySelector("#museum-toast");
let activeFilter="all",activeViewer=null,toastTimer=0,viewed=new Set();
try{
 const saved=JSON.parse(localStorage.getItem("doriMuseumViewed.v2")||"[]");
 if(Array.isArray(saved))viewed=new Set(saved.filter(id=>specimens.some(item=>item.id===id)));
}catch{viewed=new Set();}

const filterNames={base:"기초 재료",variant:"변형 도로늄",special:"특수 도로늄",stones:"돌피니티 스톤"};
function renderGem(item){
 if(item.visual==="yin")return '<svg class="specimen-gem" viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="60" r="39" fill="#d9e2e5" stroke="#f4ffff" stroke-width="2"/><path d="M50 21a39 39 0 0 1 0 78 19.5 19.5 0 0 0 0-39 19.5 19.5 0 0 1 0-39Z" fill="#152535"/><circle cx="50" cy="41" r="5" fill="#152535"/><circle cx="50" cy="79" r="5" fill="#eaf5f5"/></svg>';
 if(item.visual==="seal")return '<svg class="specimen-gem" viewBox="0 0 100 120" aria-hidden="true"><path d="M50 8 86 29 86 83 50 111 14 83 14 29Z" fill="#d8bd80" fill-opacity=".78" stroke="#fff0c9" stroke-width="2"/><path d="M50 25 71 38 71 72 50 88 29 72 29 38Z" fill="#102539" stroke="#fff0c9"/><path d="m39 57 8 8 16-19" fill="none" stroke="#fff0c9" stroke-width="4" stroke-linecap="round"/></svg>';
 if(item.visual==="stone")return '<svg class="specimen-gem" viewBox="0 0 100 120" aria-hidden="true"><path d="M50 8 83 30 77 87 50 111 23 87 17 30Z" fill="#9c89c4" fill-opacity=".78" stroke="#ede4ff" stroke-width="2"/><path d="M50 8V111M17 30 50 57 83 30M23 87 50 57 77 87" fill="none" stroke="#f2ebff" stroke-opacity=".7"/><circle cx="50" cy="58" r="10" fill="#fff" fill-opacity=".24"/></svg>';
 return `<svg class="specimen-gem" viewBox="0 0 100 120" aria-hidden="true" style="--gem:${item.color}"><path d="M50 5 88 31 75 89 50 114 25 89 12 31Z" fill="var(--gem)" fill-opacity=".83" stroke="#efffff" stroke-opacity=".76" stroke-width="1.7"/><path d="M50 5V114M12 31 50 58 88 31M25 89 50 58 75 89" fill="none" stroke="#efffff" stroke-opacity=".4" stroke-width="1.2"/><path d="M50 5 50 58 12 31Z" fill="#fff" fill-opacity=".28"/><path d="M50 58 88 31 75 89 50 114Z" fill="#061a2b" fill-opacity=".2"/></svg>`;
}
function visibleSpecimens(){
 const q=searchInput.value.trim().toLocaleLowerCase();
 return specimens.filter(item=>{
  const matchesFilter=activeFilter==="all"||item.group===activeFilter;
  const matchesText=!q||[item.name,item.en,item.desc,item.process,item.recipe,item.sources].some(value=>value.toLocaleLowerCase().includes(q));
  return matchesFilter&&matchesText;
 });
}
function renderCards(){
 const visible=visibleSpecimens();
 grid.innerHTML=visible.map(item=>{
  const number=String(specimens.indexOf(item)+1).padStart(3,"0");
  const seen=viewed.has(item.id);
  return `<button class="specimen-card" type="button" data-specimen="${item.id}" style="--gem:${item.color};--gem-glow:${item.glow}" aria-label="${item.name} 상세 정보 열기">
   <div class="specimen-visual"><span class="specimen-number">NO. ${number}</span><span class="specimen-grade">${item.grade}</span>${renderGem(item)}<small class="visual-disclaimer">신문 기록 기반 참고 그림</small></div>
   <div class="specimen-copy"><small>${item.en}</small><strong>${item.name}</strong><span>${item.desc}</span></div>
   <div class="specimen-open"><span>${seen?"관람한 표본":"신문 기록 · 상세 보기"}</span><b>↗</b></div>
  </button>`;
 }).join("");
 countLabel.textContent=`${visible.length}개 표본 전시 중`;
 emptyState.hidden=visible.length>0;
}
function updateProgress(){
 visitedCount.textContent=String(viewed.size);
 visitedProgress.style.width=(viewed.size/specimens.length*100)+"%";
 try{localStorage.setItem("doriMuseumViewed.v2",JSON.stringify([...viewed]));}catch{}
}
function showToast(message){
 toastEl.textContent=message;toastEl.classList.add("show");clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toastEl.classList.remove("show"),2200);
}
function fillDialog(item){
 const index=specimens.indexOf(item)+1;
 document.querySelector("#dialog-class").textContent=`NEWSPAPER SPECIMEN / ${String(index).padStart(3,"0")} · ${item.grade}`;
 document.querySelector("#dialog-title").textContent=item.name;
 document.querySelector("#dialog-lead").textContent=item.desc;
 document.querySelector("#dialog-tags").innerHTML=`<span>${item.en}</span><span>${filterNames[item.group]}</span><span>돌이신문 근거 확인</span>`;
 document.querySelector("#dialog-shape").textContent=item.appearance;
 document.querySelector("#dialog-process").textContent=item.recipe;
 document.querySelector("#dialog-note").textContent=item.note+" / 근거: "+item.sources;
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
   activeViewer=createCrystalViewer(dialogCanvas,"doronium_normal");
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
  renderCards();
 });
});
searchInput.addEventListener("input",renderCards);
document.querySelector("#dialog-done").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>{if(activeViewer){activeViewer.dispose();activeViewer=null;}});
document.querySelector("#reset-visit").addEventListener("click",()=>{
 viewed.clear();updateProgress();renderCards();showToast("관람 기록을 초기화했습니다.");
});
document.addEventListener("keydown",event=>{
 if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)){
  event.preventDefault();searchInput.focus();
 }
});
renderCards();updateProgress();
