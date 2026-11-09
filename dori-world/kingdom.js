(() => {
  "use strict";

  const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
  const nationDefaults = [
    {
      id:"ggum_song_union",name_ko:"껌•송 연합국",name_en:"GGUM-SONG UNION",nation_type:"대륙 연합국",
      capital_ko:"아우렐리온",capital_en:"AURELION",government:"연합의회제 연방공화정",motto:"함께 세우고, 함께 번영한다",emblem:"✦",
      description:"네 나라가 함께하는 세계 질서의 중심이자 가장 넓은 영토와 높은 종합 국력을 보유한 초대형 연합국. 광대한 대륙과 촘촘한 교통망, 강력한 산업·금융 기반을 바탕으로 4국 문명협의회를 이끈다.",
      land_share_percent:46,land_area_km2:18400000,population:338000000,power_index:100,economy_index:98,science_index:95,culture_index:91,infrastructure_index:97,stability_index:96,
      specialties:["대륙 규모의 산업·물류","국제 금융과 교역","광역 교통 인프라","대형 과학기술 단지"],
      profile:{capitalDistrict:"아우렐리온 중앙수도권",governmentSeat:"연합의사당",nationalCharacter:"다양한 지역과 문화를 잇는 개방형 연합 문명",landmarks:["오브 연합의사당","그랜드 센트럴 역","천성 대륙공원"],specialNote:"영토 규모와 종합 국력에서 네 나라 중 가장 크고 강한 국가로 설정"},
      flag_design:"샴페인 골드 바탕 · 네 개의 별을 감싼 연합 문장"
    },
    {
      id:"dori_kingdom",name_ko:"돌이 왕국",name_en:"DORI KINGDOM",nation_type:"입헌 왕국",
      capital_ko:"로키아",capital_en:"ROKIA",government:"입헌군주제 · 왕립의회",motto:"호기심과 용기로 세계를 밝힌다",emblem:"🐾",
      description:"돌이의 이름과 상징을 계승하는 왕국. 로키아를 중심으로 금융·도로늄 산업·역사문화·우주개발을 균형 있게 발전시키며, 왕립 박물관과 연구기관을 통해 세계의 지식과 유산을 보존한다.",
      land_share_percent:23,land_area_km2:9200000,population:162000000,power_index:88,economy_index:89,science_index:97,culture_index:100,infrastructure_index:88,stability_index:94,
      specialties:["도로늄 산업과 연구","왕립 박물관과 역사문화","금융 서비스","우주 탐사와 기술혁신"],
      profile:{capitalDistrict:"로키아 왕도",governmentSeat:"왕실의회",nationalCharacter:"탐구·창의·기록을 중시하는 지식 산업 문명",landmarks:["로키아 왕궁","왕립 도로늄 박물관","돌이 중앙광장"],characterReference:"돌이를 상징하는 웰시코기 문장"},
      flag_design:"딥 네이비 바탕 · 샴페인 골드 왕관과 코기 발자국"
    },
    {
      id:"sikbbangi_kingdom",name_ko:"식빵이 왕국",name_en:"SIKBBANGI KINGDOM",nation_type:"문화 왕국",
      capital_ko:"브레드하임",capital_en:"BREADHEIM",government:"문화의회제 입헌왕정",motto:"따뜻함은 나눌수록 커진다",emblem:"🍞",
      description:"식빵이의 빵처럼 포근한 형태와 고양이 상징에서 영감을 받은 문화 왕국. 아름다운 해안과 정원 도시, 도서관·예술원·환대 산업을 중심으로 시민의 삶과 문화유산을 소중히 여긴다.",
      land_share_percent:16,land_area_km2:6400000,population:94000000,power_index:76,economy_index:82,science_index:85,culture_index:99,infrastructure_index:84,stability_index:95,
      specialties:["문화·예술·출판","정원과 해안 도시","환대·관광 산업","교육과 생활문화"],
      profile:{capitalDistrict:"브레드하임 왕도",governmentSeat:"문화의회",nationalCharacter:"따뜻한 환대와 생활문화, 예술을 중시하는 문명",landmarks:["식빵이 왕실정원","브레드하임 대도서관","크림빛 해안 산책로"],characterReference:"식빵 모양 고양이 식빵이의 상징을 반영"},
      flag_design:"버터 크림색 바탕 · 황금빛 빵 문장과 고양이 별"
    },
    {
      id:"winter_federation",name_ko:"윈터 연방",name_en:"WINTER FEDERATION",nation_type:"극지 연방국",
      capital_ko:"설휘아",capital_en:"SEOLHUIA",government:"연방의회제 공화정",motto:"고요함 속에서 미래를 찾는다",emblem:"❄",
      description:"차가운 북부의 자연과 오로라를 상징하는 과학 중심 연방국. 극지 관측, 기후 연구, 청정에너지, 천문과 우주과학에 특화되어 있으며 자연환경을 보전하면서 첨단 연구도시를 발전시킨다.",
      land_share_percent:15,land_area_km2:6000000,population:71000000,power_index:84,economy_index:86,science_index:100,culture_index:88,infrastructure_index:82,stability_index:92,
      specialties:["극지·기후 과학","오로라·천문 관측","청정에너지 연구","빙하 환경 보전"],
      profile:{capitalDistrict:"설휘아 연방수도권",governmentSeat:"윈터 연방의사당",nationalCharacter:"과학적 탐구와 자연 보전을 함께 추구하는 북부 문명",landmarks:["오로라 관측궁","설백 과학도시","빙하 생태보전원"],characterReference:"윈터의 이름에서 영감을 받은 겨울·극지 연구 문명"},
      flag_design:"아이스 블루 바탕 · 은빛 오로라와 설화 문장"
    }
  ];

  const regionDefaults = [
    ["gs-aurelion","ggum_song_union","아우렐리온 수도권","연합 수도","연합의사당과 외교기관, 중앙광장이 모여 있는 세계 최대 규모의 수도권.","세계수도"],
    ["gs-crownland","ggum_song_union","북부 크라운랜드","연구·교육","대학과 대형 연구단지, 고원 자연보호구역이 공존하는 북부 지역.","광역 연구권"],
    ["gs-eastport","ggum_song_union","동부 항만주","무역·물류","대륙 간 교역을 연결하는 국제항만과 물류도시가 이어진 해안 지역.","국제항만권"],
    ["gs-southworks","ggum_song_union","남부 산업주","산업·제조","첨단 제조업과 대형 물류 시설이 집적된 연합국의 산업 중심지.","메가 산업권"],
    ["gs-westfield","ggum_song_union","서부 초원주","농업·생태","광활한 초원과 농업도시, 생태공원이 자리한 서부 지역.","광역 생태권"],
    ["dori-rokia","dori_kingdom","로키아 왕도","왕실·행정","왕궁과 왕립의회, 중앙광장이 자리한 돌이 왕국의 중심 도시.","왕도"],
    ["dori-finance","dori_kingdom","금융특별구","금융","돌이은행과 돌돌증권, 국가 금융기관이 연결되는 금융 중심지.","특별구"],
    ["dori-industry","dori_kingdom","산업특별구","도로늄 산업","도로늄 공장과 소재 연구기관이 모여 있는 첨단 산업 지역.","특별구"],
    ["dori-culture","dori_kingdom","역사문화구","박물관·문화","왕립 박물관과 도서관, 기록관이 있는 역사문화 중심지.","특별구"],
    ["dori-orbit","dori_kingdom","우주개발구","우주과학","우주개발센터와 천문 연구소가 있는 미래 산업 지역.","특별구"],
    ["dori-nature","dori_kingdom","자연보호구","환경·생태","숲과 호수, 야생 생태계를 보존하는 국가 자연보호 지역.","보호구역"],
    ["sik-breadheim","sikbbangi_kingdom","브레드하임 수도권","수도·문화","문화의회와 대도서관, 왕실정원이 있는 문화 왕국의 수도.","왕도"],
    ["sik-toastplain","sikbbangi_kingdom","토스트 평원주","생활·농업","따뜻한 평원과 작은 마을, 전통시장과 생활문화 공간이 이어진 지역.","문화 농업권"],
    ["sik-buttercoast","sikbbangi_kingdom","버터 해안주","관광·해양문화","해안 산책로와 항구 마을, 문화 축제가 열리는 해안 지역.","해안 문화권"],
    ["sik-creamgarden","sikbbangi_kingdom","크림 정원구","정원·예술","식물원과 예술원, 교육시설이 모여 있는 정원 도시 지역.","정원 특별구"],
    ["win-seolhuia","winter_federation","설휘아 수도권","수도·행정","연방의사당과 오로라 관측 시설을 갖춘 북부 수도.","연방수도"],
    ["win-snowrange","winter_federation","설백 산맥주","자연·환경","빙하와 설산, 고산 생태계를 보호하는 북부 자연 지역.","자연보전권"],
    ["win-aurora","winter_federation","오로라 관측구","천문·우주과학","오로라와 우주 기상을 관측하는 연구소가 집중된 과학 지역.","국가 연구구"],
    ["win-glacier","winter_federation","빙하 연구주","기후·청정에너지","빙하 환경과 기후변화를 연구하고 청정에너지 기술을 시험하는 지역.","연구 특별구"]
  ].map((r,i)=>({id:r[0],nation_id:r[1],name_ko:r[2],region_role:r[3],description:r[4],settlement_level:r[5],sort_order:i+1}));

  const diplomacyDefaults = [
    ["diplomacy-gs-dori","ggum_song_union","dori_kingdom","연합 핵심협력·무역협정","전략·경제","껌•송 연합국과 돌이 왕국은 금융·산업·과학기술 교류를 확대하고 4국 문명협의회의 공동 프로젝트를 함께 추진한다."],
    ["diplomacy-gs-sik","ggum_song_union","sikbbangi_kingdom","문화·교역 교류협정","문화·경제","양국은 문화 박람회와 생활문화 교류, 안정적인 교역로 운영을 공동으로 추진한다."],
    ["diplomacy-gs-win","ggum_song_union","winter_federation","극지·과학기술 공동연구협정","과학·환경","대륙 연합국의 연구 인프라와 윈터 연방의 극지·천문 연구 역량을 연결한다."],
    ["diplomacy-dori-sik","dori_kingdom","sikbbangi_kingdom","형제국 문화교류 협약","문화","돌이 왕국과 식빵이 왕국은 공동 전시, 도서 교류, 왕실 문화행사를 이어가는 우호 관계다."],
    ["diplomacy-dori-win","dori_kingdom","winter_federation","첨단소재·기후과학 협력","과학·산업","도로늄 소재 연구와 윈터의 기후·청정에너지 연구를 연결하는 공동 연구 협약이다."],
    ["diplomacy-sik-win","sikbbangi_kingdom","winter_federation","북부 관광·문화교류 협정","문화·관광","식빵이 왕국의 정원·해안 문화와 윈터 연방의 오로라·설산 관광을 연결한다."]
  ].map((r,i)=>({id:r[0],nation_a_id:r[1],nation_b_id:r[2],agreement_name:r[3],category:r[4],status:"active",summary:r[5],era_year:40+i*2,sort_order:i+1}));

  const chronicleDefaults = [
    ["chronicle-four-origin",null,1,"네 문명의 기원","건국","서로 다른 자연환경과 가치관을 가진 네 나라가 각자의 터전에서 문명을 세우기 시작했다.","인피니티 대륙"],
    ["chronicle-gs-union","ggum_song_union",12,"껌•송 연합국 성립","건국","여러 지역 공동체가 연합 헌장을 채택하며 하나의 거대한 연합국으로 출범했다.","아우렐리온"],
    ["chronicle-dori-royal","dori_kingdom",18,"로키아 왕도 건설","건국","돌이 왕국의 왕궁과 왕립의회가 로키아에 자리 잡으며 수도 체계가 완성되었다.","로키아"],
    ["chronicle-sik-culture","sikbbangi_kingdom",24,"식빵이 왕국 문화헌장 선포","문화","식빵이 왕국은 환대와 예술, 교육을 국가 발전의 핵심 가치로 정한 문화헌장을 선포했다.","브레드하임"],
    ["chronicle-winter-federation","winter_federation",32,"윈터 연방 출범","건국","북부 도시와 연구 공동체가 연방 협약을 체결해 윈터 연방을 구성했다.","설휘아"],
    ["chronicle-council",null,40,"4국 문명협의회 발족","외교","네 나라는 각자의 주권을 존중하면서 교류와 공동 프로젝트를 논의하는 4국 문명협의회를 출범시켰다.","아우렐리온 국제회의장"],
    ["chronicle-dori-museum","dori_kingdom",52,"왕립 도로늄 박물관 개관","문화·과학","도로늄과 왕국의 산업·문화 유산을 연구하고 보존하는 왕립 박물관이 공식 개관했다.","역사문화구"],
    ["chronicle-gs-rail","ggum_song_union",67,"대륙 순환 고속철도 개통","인프라","아우렐리온과 동부 항만, 남부 산업주를 연결하는 대륙 순환 철도망이 개통되었다.","껌•송 연합국"],
    ["chronicle-winter-aurora","winter_federation",78,"오로라 관측궁 완공","과학","윈터 연방의 오로라 관측궁이 완공되어 4국 공동 천문 연구의 거점이 되었다.","오로라 관측구"],
    ["chronicle-sik-expo","sikbbangi_kingdom",84,"세계 생활문화 박람회 개최","문화","식빵이 왕국이 주최한 박람회에서 네 나라의 예술·출판·생활문화가 소개되었다.","브레드하임"],
    ["chronicle-infinity",null,100,"인피니티 시대 개막","문명 진화","네 나라가 공동 발전의 새 시대를 선언하며 인피니티 문명 계획을 시작했다.","4국 공동 선언장"]
  ].map((r,i)=>({id:r[0],nation_id:r[1],era_year:r[2],title:r[3],category:r[4],summary:r[5],location:r[6],sort_order:i+1}));

  const eventDefaults = [
    {id:"event-four-civilization-expo",title:"제1회 4국 문명 박람회",category:"국제 행사",status:"active",era_year:100,schedule_label:"인피니티 시대 · 상시 개최",summary:"껌•송 연합국, 돌이 왕국, 식빵이 왕국, 윈터 연방이 각자의 대표 기술과 문화유산을 함께 전시하는 세계 박람회.",sort_order:1},
    {id:"event-aurora-week",title:"윈터 오로라 관측 주간",category:"과학 행사",status:"scheduled",era_year:101,schedule_label:"왕국력 101년 예정",summary:"윈터 연방의 오로라 관측구에서 열리는 공개 천문·기후 과학 행사.",sort_order:2},
    {id:"event-heritage-festival",title:"형제국 문화유산 교류제",category:"문화 행사",status:"scheduled",era_year:102,schedule_label:"왕국력 102년 예정",summary:"돌이 왕국과 식빵이 왕국이 공동 개최하는 역사·출판·정원 문화 축제.",sort_order:3}
  ];

  const state = {
    nations:nationDefaults,
    regions:regionDefaults,
    diplomacy:diplomacyDefaults,
    chronicles:chronicleDefaults,
    events:eventDefaults,
    world:{era_year:100,era_label:"왕국력 100년 · 인피니티 시대",council_name:"4국 문명협의회",council_status:"ACTIVE"},
    selected:"ggum_song_union",
    tab:"overview",
    source:"fallback"
  };

  const $ = selector => document.querySelector(selector);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const number = value => new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  const shortNumber = value => {
    const n=Number(value||0);
    if(n>=100000000)return (n/100000000).toFixed(n%100000000===0?0:1)+"억";
    if(n>=10000)return (n/10000).toFixed(n%10000===0?0:1)+"만";
    return number(n);
  };
  const nationById = id => state.nations.find(n=>n.id===id);
  const profileOf = n => n.profile && typeof n.profile==="object" ? n.profile : {};
  const sortByOrder = (a,b) => Number(a.sort_order||0)-Number(b.sort_order||0);

  function flag(n) {
    return '<span class="flag flag--'+escapeHTML(n.id)+'" aria-hidden="true"><span>'+escapeHTML(n.emblem)+'</span></span>';
  }

  function setDataStatus(message,fallback=false) {
    const node=$("#data-status");
    node.classList.toggle("is-fallback",fallback);
    node.innerHTML='<i></i><span>'+escapeHTML(message)+'</span>';
  }

  function renderWorldState() {
    $("#world-nation-count").textContent=String(state.nations.length).padStart(2,"0");
    const share=state.nations.reduce((sum,n)=>sum+Number(n.land_share_percent||0),0);
    $("#world-area-share").innerHTML=share.toFixed(share%1===0?0:1)+'<span>%</span>';
    $("#world-council").textContent=state.world.council_name||"4국 문명협의회";
    $("#world-era-label").textContent=state.world.era_label||"왕국력 100년 · 인피니티 시대";
    $("#world-era-short").textContent=Number(state.world.era_year||100)>=100?"INFINITY":"FOUNDING";
  }

  function renderNationGrid() {
    $("#nation-grid").innerHTML=state.nations.slice().sort(sortByOrder).map((n,i)=>{
      const active=n.id===state.selected;
      return '<button class="nation-tile '+(active?"is-selected":"")+'" type="button" data-select="'+escapeHTML(n.id)+'" aria-pressed="'+active+'" style="--tile-glow:'+tileGlow(n.id)+';--tile-border:'+tileBorder(n.id)+'">'+
        '<div class="tile-top">'+flag(n)+'<span class="tile-rank">REALM 0'+(i+1)+'</span><span class="tile-power">POWER '+number(n.power_index)+'</span></div>'+
        '<h3 class="tile-name">'+escapeHTML(n.name_ko)+'</h3><div class="tile-en">'+escapeHTML(n.name_en)+'</div>'+
        '<div class="tile-capital">수도 · '+escapeHTML(n.capital_ko)+'</div>'+
        '<div class="tile-foot"><span>영토 점유율</span><b>'+Number(n.land_share_percent).toFixed(0)+'%</b></div></button>';
    }).join("");
  }

  function tileGlow(id) {
    return ({ggum_song_union:"rgba(220,190,124,.17)",dori_kingdom:"rgba(105,141,190,.17)",sikbbangi_kingdom:"rgba(226,190,143,.18)",winter_federation:"rgba(150,206,224,.18)"})[id]||"rgba(220,190,124,.12)";
  }
  function tileBorder(id) {
    return ({ggum_song_union:"rgba(220,190,124,.52)",dori_kingdom:"rgba(137,168,211,.48)",sikbbangi_kingdom:"rgba(230,200,159,.5)",winter_federation:"rgba(175,218,230,.5)"})[id]||"rgba(220,190,124,.4)";
  }
  function accent(id) {
    return ({ggum_song_union:"#dfc58d",dori_kingdom:"#9eb8df",sikbbangi_kingdom:"#e7c89c",winter_federation:"#b9dbe7"})[id]||"#dfc58d";
  }

  function renderMap() {
    document.querySelectorAll(".map-nation").forEach(g=>{
      const active=g.dataset.nation===state.selected;
      g.classList.toggle("is-selected",active);
      g.setAttribute("aria-pressed",String(active));
    });
  }

  function metric(label,value) {
    const v=Math.max(0,Math.min(100,Number(value||0)));
    return '<div class="metric"><div class="metric-top"><span>'+escapeHTML(label)+'</span><b>'+v+'</b></div><div class="metric-track"><i style="--value:'+v+'%"></i></div></div>';
  }

  function regionsFor(id) {
    return state.regions.filter(r=>r.nation_id===id).sort(sortByOrder);
  }
  function historyFor(id) {
    return state.chronicles.filter(c=>!c.nation_id||c.nation_id===id).sort(sortByOrder);
  }
  function relationsFor(id) {
    return state.diplomacy.filter(d=>d.nation_a_id===id||d.nation_b_id===id).sort(sortByOrder);
  }

  function overviewMarkup(n) {
    const p=profileOf(n);
    const regions=regionsFor(n.id);
    const landmarks=Array.isArray(p.landmarks)?p.landmarks:[];
    const specialties=Array.isArray(n.specialties)?n.specialties:[];
    return '<div class="detail-stats">'+
      metric("종합 국력",n.power_index)+metric("경제 발전",n.economy_index)+
      metric("과학기술",n.science_index)+metric("문화 영향력",n.culture_index)+
      metric("기반시설",n.infrastructure_index)+metric("국가 안정도",n.stability_index)+
      '</div>'+
      '<div class="detail-subhead">국가 특화 분야</div><div class="specialty-list">'+specialties.map(s=>'<span>'+escapeHTML(s)+'</span>').join("")+'</div>'+
      '<div class="detail-subhead">행정구역 · '+regions.length+'개 지역</div><div class="region-list">'+regions.map((r,i)=>'<div class="region-item"><span class="region-index">'+String(i+1).padStart(2,"0")+'</span><div><b>'+escapeHTML(r.name_ko)+'</b><small>'+escapeHTML(r.region_role)+' · '+escapeHTML(r.description)+'</small></div></div>').join("")+'</div>'+
      (landmarks.length?'<div class="detail-subhead">대표 명소</div><div class="specialty-list">'+landmarks.map(s=>'<span>'+escapeHTML(s)+'</span>').join("")+'</div>':"");
  }

  function historyMarkup(n) {
    const list=historyFor(n.id);
    return '<div class="timeline-mini">'+list.map(c=>'<article><small>YEAR '+String(c.era_year).padStart(3,"0")+' · '+escapeHTML(c.category)+'</small><b>'+escapeHTML(c.title)+'</b><p>'+escapeHTML(c.summary)+'</p></article>').join("")+'</div>';
  }

  function diplomacyMarkup(n) {
    const list=relationsFor(n.id);
    return '<div class="diplomacy-detail-list">'+list.map(d=>{
      const otherId=d.nation_a_id===n.id?d.nation_b_id:d.nation_a_id;
      const other=nationById(otherId);
      return '<div class="diplomacy-item">'+(other?flag(other):"")+'<div><b>'+escapeHTML(other?other.name_ko:otherId)+'</b><small>'+escapeHTML(d.agreement_name)+' · '+escapeHTML(d.category)+'</small><small>'+escapeHTML(d.summary)+'</small></div></div>';
    }).join("")+'</div>';
  }

  function renderSelected() {
    const n=nationById(state.selected)||state.nations[0];
    if(!n)return;
    const p=profileOf(n);
    const root=$("#selected-panel");
    root.style.setProperty("--nation-accent",accent(n.id));
    root.style.setProperty("--nation-glow",tileGlow(n.id));
    const content=state.tab==="history"?historyMarkup(n):state.tab==="diplomacy"?diplomacyMarkup(n):overviewMarkup(n);
    root.innerHTML=
      '<div class="selected-head">'+flag(n)+'<div><div class="nation-overline">'+escapeHTML(n.nation_type)+' · SOVEREIGN NATION</div><h3>'+escapeHTML(n.name_ko)+'</h3><p>'+escapeHTML(n.name_en)+'</p></div></div>'+
      '<div class="nation-motto">“'+escapeHTML(n.motto)+'”</div>'+
      '<p class="nation-summary">'+escapeHTML(n.description)+'</p>'+
      '<div class="detail-tabs" role="tablist" aria-label="국가 상세 정보">'+
        '<button type="button" data-tab="overview" role="tab" aria-selected="'+(state.tab==="overview")+'">국가 개요</button>'+
        '<button type="button" data-tab="history" role="tab" aria-selected="'+(state.tab==="history")+'">역사</button>'+
        '<button type="button" data-tab="diplomacy" role="tab" aria-selected="'+(state.tab==="diplomacy")+'">외교</button>'+
      '</div>'+
      '<div class="detail-body">'+
        (state.tab==="overview"?'<div class="specialty-list"><span>수도 · '+escapeHTML(n.capital_ko)+'</span><span>'+escapeHTML(n.government)+'</span><span>영토 '+Number(n.land_share_percent).toFixed(0)+'%</span><span>인구 '+shortNumber(n.population)+'</span></div>':"")+
        content+
      '</div>';
  }

  function renderRelations() {
    $("#relation-list").innerHTML=state.diplomacy.slice().sort(sortByOrder).map(d=>{
      const a=nationById(d.nation_a_id),b=nationById(d.nation_b_id);
      return '<div class="relation-row"><div class="relation-country"><b>'+escapeHTML(a?a.name_ko:d.nation_a_id)+'</b><small>'+escapeHTML(d.category)+'</small></div><div class="relation-link">↔</div><div class="relation-country"><b>'+escapeHTML(b?b.name_ko:d.nation_b_id)+'</b><small>'+escapeHTML(d.agreement_name)+'</small></div><div class="relation-copy">'+escapeHTML(d.summary)+'</div></div>';
    }).join("");
  }

  function renderEvents() {
    $("#event-list").innerHTML=state.events.slice().sort(sortByOrder).map(e=>{
      const active=e.status==="active";
      return '<article class="event-item"><span class="event-icon">'+(e.category==="과학 행사"?"✧":e.category==="문화 행사"?"❖":"◎")+'</span><div><b>'+escapeHTML(e.title)+'</b><small>'+escapeHTML(e.schedule_label)+' · '+escapeHTML(e.category)+'</small><p>'+escapeHTML(e.summary)+'</p></div><span class="event-status '+(active?"":"is-scheduled")+'">'+(active?"ACTIVE":"PLANNED")+'</span></article>';
    }).join("");
  }

  function renderChronicles() {
    const list=state.chronicles.slice().sort((a,b)=>Number(a.era_year)-Number(b.era_year));
    $("#chronicle-count").textContent=String(list.length).padStart(2,"0")+" RECORDS";
    $("#chronicle-track").innerHTML=list.map(c=>{
      const n=c.nation_id?nationById(c.nation_id):null;
      return '<article class="chronicle-card"><div class="chronicle-year">YEAR '+String(c.era_year).padStart(3,"0")+'</div><h3>'+escapeHTML(c.title)+'</h3><p>'+escapeHTML(c.summary)+'</p><span class="chronicle-location">'+escapeHTML(c.location)+' · '+escapeHTML(n?n.name_ko:"공동 세계 기록")+'</span></article>';
    }).join("");
  }

  function renderAll() {
    renderWorldState();
    renderMap();
    renderNationGrid();
    renderSelected();
    renderRelations();
    renderEvents();
    renderChronicles();
  }

  function selectNation(id) {
    if(!nationById(id))return;
    state.selected=id;
    state.tab="overview";
    renderMap();
    renderNationGrid();
    renderSelected();
  }

  async function loadWorldData() {
    if(!window.supabase||typeof window.supabase.createClient!=="function")throw new Error("Supabase client unavailable");
    const client=window.doriSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.doriSupabase=client;
    const results=await Promise.all([
      client.from("kingdom_nations").select("*").order("sort_order"),
      client.from("kingdom_regions").select("*").order("sort_order"),
      client.from("kingdom_diplomacy").select("*").order("sort_order"),
      client.from("kingdom_chronicles").select("*").order("sort_order"),
      client.from("kingdom_world_events").select("*").order("sort_order"),
      client.from("kingdom_world_state").select("*").eq("id","infinite-kingdom").maybeSingle()
    ]);
    const error=results.find(r=>r.error);
    if(error)throw error.error;
    const [nations,regions,diplomacy,chronicles,events,world]=results.map(r=>r.data);
    if(!Array.isArray(nations)||nations.length!==4)throw new Error("Expected exactly four sovereign nations");
    const totalArea=nations.reduce((sum,n)=>sum+Number(n.land_share_percent||0),0);
    if(Math.abs(totalArea-100)>.01)throw new Error("Nation territory shares must total 100%");
    if(!Array.isArray(regions)||!Array.isArray(diplomacy)||!Array.isArray(chronicles)||!Array.isArray(events))throw new Error("World data is incomplete");
    state.nations=nations;
    state.regions=regions;
    state.diplomacy=diplomacy;
    state.chronicles=chronicles;
    state.events=events;
    if(world)state.world=world;
    if(!nationById(state.selected))state.selected="ggum_song_union";
    state.source="supabase";
    setDataStatus("Supabase 세계관 데이터 연결됨",false);
  }

  function bindInteractions() {
    $("#nation-grid").addEventListener("click",event=>{
      const button=event.target.closest("[data-select]");
      if(button)selectNation(button.dataset.select);
    });
    $("#selected-panel").addEventListener("click",event=>{
      const button=event.target.closest("[data-tab]");
      if(button){state.tab=button.dataset.tab;renderSelected();}
    });
    $(".world-map").addEventListener("click",event=>{
      const group=event.target.closest("[data-nation]");
      if(group)selectNation(group.dataset.nation);
    });
    $(".world-map").addEventListener("keydown",event=>{
      if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-nation]")){
        event.preventDefault();selectNation(event.target.dataset.nation);
      }
    });
  }

  async function init() {
    bindInteractions();
    renderAll();
    try {
      await loadWorldData();
      renderAll();
    } catch(error) {
      console.warn("[DORI WORLD] Supabase world data unavailable; using embedded atlas fallback.",error);
      setDataStatus("기본 세계관 데이터로 열람 중",true);
      renderAll();
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();