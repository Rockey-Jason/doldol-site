/* ROCKEY STUDY · MATHEMATICS FORMULA QUEST
   Calculator-style symbolic input, answer checking, and account-synced progress. */
(function () {
  "use strict";

  var COURSE = Array.isArray(window.ROCKEY_FORMULA_COURSE) ? window.ROCKEY_FORMULA_COURSE : [];
  var MATH = window.ROCKEY_MATH_INPUT;
  var TOOLS = window.ROCKEY_STUDY_TOOLS;
  var STORAGE_KEY = "rockeyStudy.formulaQuest.progress.v1";
  var GRADE_NAMES = {
    1:"초등학교 1학년",2:"초등학교 2학년",3:"초등학교 3학년",4:"초등학교 4학년",5:"초등학교 5학년",6:"초등학교 6학년",
    7:"중학교 1학년",8:"중학교 2학년",9:"중학교 3학년",
    10:"고등학교 1학년",11:"고등학교 2학년",12:"고등학교 3학년"
  };
  var $ = function (id) { return document.getElementById(id); };
  var state = {grade:null,topic:"전체",mode:"learn",index:0,revealed:false,session:null,searchFilter:"all",searchLimit:8};
  var toastTimer = 0;
  var progress = loadProgress();

  function freshProgress() {
    return {version:2,cards:{},stats:{correct:0,answers:0,sessions:0,points:0,bestBoss:0},activity:[]};
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshProgress();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return freshProgress();
      return {
        version:2,
        cards:parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {},
        stats:Object.assign(freshProgress().stats,parsed.stats || {}),
        activity:Array.isArray(parsed.activity) ? parsed.activity.slice(0,30) : []
      };
    } catch (_) { return freshProgress(); }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));
      var status = $("saveStatus");
      if (status) {
        status.textContent = window.doriCloudSync && window.doriCloudSync.userId
          ? "저장 완료 · 로그인 계정의 모든 기기와 자동 동기화되고 있어."
          : "자동 저장 완료 · 로그인하면 기존 계정 클라우드 동기화가 이어져.";
      }
    } catch (error) {
      var status = $("saveStatus");
      if (status) status.textContent = "저장 공간이 부족해. 브라우저 저장 공간을 확인해 줘.";
      console.warn("[Rockey Formula Quest] save failed:",error);
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i=copy.length-1;i>0;i--) {
      var j = Math.floor(Math.random()*(i+1));
      var temp=copy[i];copy[i]=copy[j];copy[j]=temp;
    }
    return copy;
  }

  function gradeLabel(grade) { return GRADE_NAMES[grade] || "학년 미선택"; }
  function gradeShort(grade) {
    if (grade<=6) return "초"+grade;
    if (grade<=9) return "중"+(grade-6);
    return "고"+(grade-9);
  }

  function openCardById(id) {
    var card=COURSE.find(function(item){return item.id===id;});
    if(!card)return false;
    state.grade=card.grade;state.topic=card.topic;state.mode="learn";state.session=null;state.revealed=false;
    var deck=currentDeck();
    state.index=Math.max(0,deck.findIndex(function(item){return item.id===id;}));
    renderAll();
    $("lessonContent").scrollIntoView({behavior:"smooth",block:"nearest"});
    return true;
  }

  function startCardPractice(card) {
    if(!card||card.answer===undefined||card.answer===null||card.quiz===false){
      showToast("이 공식은 직접 입력형 연습을 준비 중이야.");
      return;
    }
    state.grade=card.grade;state.topic=card.topic;state.mode="quiz";
    state.session={
      type:"practice",questions:[{kind:"formula",card:card,prompt:card.question,answer:card.answer,options:null}],
      index:0,score:0,correct:0,streak:0,bestStreak:0,answered:false,saved:false,
      input:"",inputError:"",wrongAttempts:0,lastGain:0,returnCardId:card.id
    };
    renderAll();
    $("lessonContent").scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function quickStartRecommended() {
    if(!TOOLS||typeof TOOLS.recommendCard!=="function"){
      showToast("추천 학습 도구를 불러오지 못했어. 페이지를 새로고침해 줘.");
      return;
    }
    var suggestion=TOOLS.recommendCard(COURSE,progress.cards,state.grade);
    if(!suggestion.card){
      state.searchFilter="mastered";state.searchLimit=8;
      var searchInput=$("formulaSearchInput");
      if(searchInput)searchInput.value="";
      document.querySelectorAll("[data-search-filter]").forEach(function(item){
        var active=item.dataset.searchFilter==="mastered";
        item.classList.toggle("active",active);item.setAttribute("aria-pressed",active?"true":"false");
      });
      renderSearchResults("",true);
      $("formulaSearchResults").scrollIntoView({behavior:"smooth",block:"nearest"});
      showToast("모든 공식을 마스터했어! 원하는 공식을 골라 다시 연습해 봐.");
      return;
    }
    openCardById(suggestion.card.id);
    showToast("오늘의 추천: "+suggestion.card.title);
  }

  function deckForGrade(grade) { return COURSE.filter(function(card){return card.grade===grade;}); }

  function currentDeck() {
    var deck=deckForGrade(state.grade);
    if (state.topic!=="전체") deck=deck.filter(function(card){return card.topic===state.topic;});
    return deck;
  }

  function quizDeck() {
    return currentDeck().filter(function(card){
      return card.quiz!==false && card.answer!==undefined && card.answer!==null;
    });
  }

  function cardProgress(card) {
    if (!progress.cards[card.id] || typeof progress.cards[card.id]!=="object") {
      progress.cards[card.id]={seen:false,mastered:false,review:false,attempts:0,correct:0};
    }
    return progress.cards[card.id];
  }

  function showToast(message) {
    var node=$("toast");if(!node)return;
    node.textContent=message;node.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(function(){node.classList.remove("show");},2400);
  }

  function renderGradeGroups() {
    var groups=[
      {name:"초등학교",caption:"BASIC FOUNDATION",from:1,to:6},
      {name:"중학교",caption:"MIDDLE SCHOOL",from:7,to:9},
      {name:"고등학교",caption:"HIGH SCHOOL",from:10,to:12}
    ];
    $("gradeGroups").innerHTML=groups.map(function(group){
      var buttons=[];
      for(var grade=group.from;grade<=group.to;grade++){
        var deck=deckForGrade(grade);
        var mastered=deck.filter(function(card){return cardProgress(card).mastered;}).length;
        buttons.push('<button class="grade-button" type="button" data-grade="'+grade+'" aria-pressed="false"><span>'+gradeShort(grade)+'</span><small>'+mastered+'/'+deck.length+' 마스터</small></button>');
      }
      return '<section class="grade-group"><div class="grade-group-head"><strong>'+group.name+'</strong><span>'+group.caption+'</span></div><div class="grade-buttons">'+buttons.join("")+'</div></section>';
    }).join("");
  }

  function renderTopics() {
    var node=$("topicBar");
    if(!state.grade){node.innerHTML="";node.hidden=true;return;}
    node.hidden=false;
    var topics=["전체"];
    deckForGrade(state.grade).forEach(function(card){
      if(topics.indexOf(card.topic)<0)topics.push(card.topic);
    });
    node.innerHTML=topics.map(function(topic){
      return '<button class="topic-button'+(topic===state.topic?" active":"")+'" type="button" data-topic="'+esc(topic)+'" aria-pressed="'+(topic===state.topic?"true":"false")+'">'+esc(topic)+'</button>';
    }).join("");
  }

  function renderSearchResults(query,forceShow) {
    var node=$("formulaSearchResults");
    if(!node||!TOOLS||typeof TOOLS.searchCards!=="function")return;
    var text=String(query||"").trim();
    if(!forceShow&&!text&&state.searchFilter==="all"){
      node.hidden=true;node.innerHTML="";return;
    }
    var result=TOOLS.searchCards(COURSE,progress.cards,text,state.searchFilter,state.grade,state.searchLimit);
    var cards=result.results;
    var rows=cards.map(function(card){
      var record=cardProgress(card);
      var status=TOOLS.statusLabel(record);
      var statusClass=record.review?"review":record.mastered?"mastered":record.seen?"learning":"unseen";
      return '<article class="formula-result-card">'+
        '<div class="formula-result-meta"><span>'+esc(gradeShort(card.grade))+' · '+esc(card.topic)+'</span><span class="formula-status '+statusClass+'">'+esc(status)+'</span></div>'+
        '<h4>'+esc(card.title)+'</h4><p>'+esc(card.question)+'</p>'+
        '<div class="formula-result-actions"><button type="button" data-action="open-search-card" data-card-id="'+esc(card.id)+'">개념 열기</button><button type="button" class="practice" data-action="practice-search-card" data-card-id="'+esc(card.id)+'">바로 풀기</button></div>'+
      '</article>';
    }).join("");
    var more=result.total>cards.length
      ? '<button type="button" class="search-show-more" data-action="show-all-search-results">검색 결과 '+result.total+'개 모두 보기</button>'
      : "";
    node.hidden=false;
    node.innerHTML='<div class="search-results-head"><strong>검색 결과 '+result.total+'개</strong><span>'+(text?'전체 12개 학년에서 검색했어.':'선택한 학습 상태의 공식이야.')+'</span></div>'+
      (rows?'<div class="formula-result-grid">'+rows+'</div>':'<div class="search-no-results">조건에 맞는 공식이 없어. 검색어를 바꾸거나 다른 필터를 선택해 봐.</div>')+more;
  }

  function renderModeTabs() {
    document.querySelectorAll("[data-mode]").forEach(function(button){
      var active=button.dataset.mode===state.mode;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",active?"true":"false");
    });
  }

  function renderHeader() {
    var mode=state.mode==="learn"?"FORMULA STUDY":state.mode==="quiz"?"MEMORY QUEST":state.mode==="multiply"?"TIMES TABLE BATTLE":"BOSS CHALLENGE";
    $("courseEyebrow").textContent=state.grade?gradeShort(state.grade).toUpperCase()+" · "+mode:"CHOOSE YOUR GRADE";
    $("courseTitle").textContent=state.grade?gradeLabel(state.grade):"먼저 학년을 선택해 줘";
  }

  function renderLearn() {
    var deck=currentDeck();
    if(!state.grade){
      $("lessonContent").innerHTML='<div class="empty-state"><div><div class="empty-icon">∑</div><h3>첫 번째 수학 코스를 골라 봐!</h3><p>위에서 학년을 선택하면 공식 카드가 열려. 쉬운 개념부터 차근차근 마스터해 보자.</p></div></div>';
      return;
    }
    if(!deck.length){
      $("lessonContent").innerHTML='<div class="empty-state"><div><div class="empty-icon">✧</div><h3>이 주제에는 아직 공식 카드가 없어.</h3><p>다른 주제를 선택해 봐.</p></div></div>';return;
    }
    if(state.index>=deck.length)state.index=0;
    if(state.index<0)state.index=0;
    var card=deck[state.index],cardState=cardProgress(card);
    if(!cardState.seen){cardState.seen=true;saveProgress();}
    var formula=state.revealed
      ? '<div class="formula-label">CORE FORMULA</div><div class="formula-text">'+esc(card.formula)+'</div>'
      : '<div class="formula-hidden"><span>정답을 머릿속으로 먼저 떠올려 봐!</span><button class="reveal-button" type="button" data-action="reveal">공식 공개하기 ✦</button></div>';
    var detail=state.revealed
      ? '<div class="explain-grid"><section class="explain-box"><h4>◈ 원리 이해하기</h4><p>'+esc(card.explain)+'</p></section><section class="explain-box example"><h4>✦ 예제로 확인하기</h4><p>'+esc(card.example)+'</p></section></div><div class="memory-tip"><b>✧</b><span><strong>돌이의 암기 팁</strong><br>'+esc(card.memory)+'</span></div>'
      : '<div class="explain-box"><h4>먼저 생각해 보기</h4><p>공식을 바로 보지 말고, 문제를 읽은 다음 기억나는 식을 마음속으로 만들어 봐. 준비되면 공식 공개하기를 눌러 확인해!</p></div>';
    $("lessonContent").innerHTML=
      '<div class="lesson-meta"><span>'+esc(gradeShort(card.grade))+' · '+esc(card.topic)+'</span><span class="lesson-pill">공식 '+(state.index+1)+' / '+deck.length+' · '+(cardState.review?'복습 필요':cardState.mastered?'마스터':cardState.seen?'학습 중':'새 공식')+'</span></div>'+
      '<h3 class="lesson-title">'+esc(card.title)+'</h3><p class="lesson-question">'+esc(card.question)+'</p>'+
      '<div class="formula-box">'+formula+'</div>'+detail+
      '<div class="lesson-actions"><div class="action-group">'+
        '<button class="action-button" type="button" data-action="previous"'+(state.index===0?" disabled":"")+'>← 이전</button>'+
        '<button class="action-button" type="button" data-action="next">다음 공식 →</button>'+
      '</div><div class="action-group">'+
        '<button class="action-button'+(cardState.review?" gold":"")+'" type="button" data-action="review">'+(cardState.review?"★ 복습 목록에 있음":"☆ 복습 표시")+'</button>'+
        '<button class="action-button good" type="button" data-action="practice-current">'+(cardState.mastered?"✓ 마스터 공식 다시 풀기":"✎ 직접 풀고 마스터하기")+'</button>'+
      '</div></div>';
  }

  function multiplicationQuestion() {
    var a=2+Math.floor(Math.random()*8),b=1+Math.floor(Math.random()*9),answer=a*b,options=[answer];
    while(options.length<4){
      var value=answer+(Math.floor(Math.random()*15)-7)*(1+Math.floor(Math.random()*3));
      if(value>0&&options.indexOf(value)<0)options.push(value);
    }
    return {kind:"multiply",prompt:a+" × "+b+" = ?",answer:String(answer),card:null,options:shuffle(options.map(String))};
  }

  function startSession(type) {
    if(!state.grade){
      if(type==="multiply"){state.grade=2;state.topic="전체";renderGradeGroups();renderTopics();}
      else{showToast("먼저 학년을 선택해 줘!");$("gradeGroups").scrollIntoView({behavior:"smooth",block:"center"});return;}
    }
    var pool=quizDeck();
    if(type!=="multiply"&&!pool.length){
      showToast("이 주제에는 직접 입력형 퀴즈가 아직 없어. 다른 주제를 선택해 봐.");
      return;
    }
    var count=type==="boss"?12:12;
    var questions=[];
    if(type==="multiply"){
      for(var m=0;m<count;m++)questions.push(multiplicationQuestion());
    }else{
      var bag=shuffle(pool);
      for(var i=0;i<count;i++){
        var card=bag[i%bag.length];
        questions.push({kind:"formula",card:card,prompt:card.question,answer:card.answer,options:null});
      }
    }
    state.session={
      type:type,questions:questions,index:0,score:0,correct:0,streak:0,bestStreak:0,
      answered:false,saved:false,input:"",inputError:"",wrongAttempts:0,lastGain:0
    };
    state.mode=type;
    renderAll();
    if(type!=="multiply"){
      $("lessonContent").scrollIntoView({behavior:"smooth",block:"nearest"});
    }
  }

  var KEY_ROWS=[
    [{label:"7",value:"7"},{label:"8",value:"8"},{label:"9",value:"9"},{label:"(",value:"("},{label:")",value:")"},{label:"⌫",value:"backspace",kind:"utility"}],
    [{label:"4",value:"4"},{label:"5",value:"5"},{label:"6",value:"6"},{label:"+",value:"+",kind:"operator"},{label:"−",value:"-",kind:"operator"},{label:"AC",value:"clear",kind:"utility"}],
    [{label:"1",value:"1"},{label:"2",value:"2"},{label:"3",value:"3"},{label:"×",value:"*",kind:"operator"},{label:"÷",value:"/",kind:"operator"},{label:"^",value:"^",kind:"operator"}],
    [{label:"0",value:"0"},{label:".",value:"."},{label:"=",value:"=",kind:"operator"},{label:";",value:";",kind:"operator"},{label:"_",value:"_",kind:"operator"},{label:"!",value:"!",kind:"operator"}],
    [{label:"x",value:"x"},{label:"y",value:"y"},{label:"a",value:"a"},{label:"b",value:"b"},{label:"c",value:"c"},{label:"n",value:"n"}],
    [{label:"m",value:"m"},{label:"p",value:"p"},{label:"q",value:"q"},{label:"r",value:"r"},{label:"h",value:"h"},{label:"t",value:"t"}],
    [{label:"√",value:"sqrt(",kind:"operator"},{label:"π",value:"pi",kind:"operator"},{label:"±",value:"±",kind:"operator"}],
    [{label:"sin",value:"sin(",kind:"operator"},{label:"cos",value:"cos(",kind:"operator"},{label:"tan",value:"tan(",kind:"operator"},{label:"log",value:"log(",kind:"operator"},{label:"ln",value:"ln(",kind:"operator"},{label:"abs",value:"abs(",kind:"operator"}]
  ];

  function renderKeypad() {
    return KEY_ROWS.map(function(row){
      return row.map(function(key){
        return '<button class="math-key'+(key.kind?" "+key.kind:"")+'" type="button" data-action="insert-key" data-key="'+esc(key.value)+'" aria-label="'+esc(key.label)+'">'+esc(key.label)+'</button>';
      }).join("");
    }).join("");
  }

  function answerText(answer) {
    return Array.isArray(answer)?answer.join(" 또는 "):String(answer);
  }

  function renderSession() {
    var session=state.session;
    if(!session){startSession(state.mode);return;}
    if(session.index>=session.questions.length){finishSession();renderFinish();return;}
    var q=session.questions[session.index];
    var title=session.type==="multiply"?"구구단 배틀":session.type==="boss"?"수학 보스 챌린지":session.type==="practice"?"공식 마스터 연습":"공식 암기 퀘스트";
    var kicker=session.type==="multiply"?"TIMES TABLE ARENA":session.type==="boss"?"FINAL FORMULA BOSS":session.type==="practice"?"ONE FORMULA PRACTICE":"MATH FORMULA INPUT";
    var correctAnswer=q.card?q.card.formula:q.answer;
    var progressPercent=Math.round((session.index+(session.answered?1:0))/session.questions.length*100);
    var subLabel=q.card?esc(q.card.topic)+" · "+esc(q.card.title):"2단부터 9단까지";
    var feedback="";
    if(session.inputError&&!session.answered){
      feedback='<div class="math-input-error" role="alert">'+esc(session.inputError)+'</div>';
    }
    if(session.answered){
      if(session.wasCorrect){
        feedback='<div class="feedback-box"><strong>정답이야! +'+session.lastGain+' XP ✨</strong>'+(q.card?esc(q.card.explain):"아주 좋아! 구구단 계산을 정확하게 해냈어.")+'</div>';
      }else{
        feedback='<div class="feedback-box wrong"><strong>거의 다 왔어! 식을 다시 확인해 보자.</strong>정답 공식: '+esc(correctAnswer)+(q.card?'<br>'+esc(q.card.explain):"")+'</div>';
      }
    }
    var inputArea="";
    if(!session.answered){
      inputArea=
        '<form class="math-entry-panel" id="mathAnswerForm" autocomplete="off">'+
          '<label class="math-entry-label" for="mathAnswerInput"><span>답안을 수식으로 입력해 줘</span><span>CALCULATOR INPUT</span></label>'+
          '<div class="math-entry-input-wrap"><input class="math-entry-input" id="mathAnswerInput" type="text" inputmode="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="예: (−b+sqrt(b^2−4*a*c))/(2*a)" value="'+esc(session.input)+'" aria-describedby="mathAnswerHint" aria-label="수학 수식 답안 입력"><button class="math-submit" type="submit">정답 확인 ↵</button></div>'+
          '<p class="math-entry-hint" id="mathAnswerHint">숫자와 문자 사이의 곱셈은 생략해도 돼. 예: 2x, x^2, sqrt(2), (a+b)^2. 제곱은 ^, 루트는 √ 또는 sqrt()를 써.</p>'+
          '<div class="math-keypad" aria-label="수식 입력 계산기">'+renderKeypad()+'</div>'+
          (feedback||"")+
        '</form>';
    }else{
      inputArea=feedback;
    }
    var actions="";
    if(session.answered&&session.wasCorrect){
      actions='<button class="primary-action" type="button" data-action="next-question">'+(session.index===session.questions.length-1?"결과 확인하기 ✦":"다음 문제 →")+'</button>';
    }else if(session.answered&&!session.wasCorrect){
      actions='<button class="secondary-action" type="button" data-action="retry-answer">다시 입력하기 ↻</button><button class="primary-action" type="button" data-action="next-question">다음 문제 건너뛰기 →</button>';
    }else{
      actions='<span class="session-count">직접 입력하고 정답 확인을 눌러 줘.</span>';
    }
    $("lessonContent").innerHTML=
      '<div class="session-head"><div class="session-progress"><div class="session-progress-track"><div class="session-progress-fill" style="width:'+progressPercent+'%"></div></div><span class="session-count">'+(session.index+1)+' / '+session.questions.length+'</span></div><span class="session-score">'+session.score.toLocaleString("ko-KR")+' XP</span></div>'+
      '<div class="lesson-meta"><span>'+kicker+'</span><span class="lesson-pill">연속 정답 '+session.streak+'회</span></div>'+
      '<div class="quiz-prompt"><div class="quiz-kicker">'+title+' · '+subLabel+'</div><h3>'+esc(q.prompt)+'</h3></div>'+
      inputArea+
      '<div class="session-actions"><button class="secondary-action" type="button" data-action="restart">처음부터 다시</button>'+actions+'</div>';
    var form=$("mathAnswerForm");
    if(form){
      form.addEventListener("submit",function(event){event.preventDefault();answerQuestion();});
      var input=$("mathAnswerInput");
      input.addEventListener("input",function(){session.input=input.value;session.inputError="";});
      input.addEventListener("keydown",function(event){
        if(event.key==="Enter"){event.preventDefault();answerQuestion();}
      });
    }
  }

  function insertKey(value) {
    var input=$("mathAnswerInput"),session=state.session;
    if(!input||!session||session.answered)return;
    var start=Number.isInteger(input.selectionStart)?input.selectionStart:input.value.length;
    var end=Number.isInteger(input.selectionEnd)?input.selectionEnd:input.value.length;
    var before=input.value.slice(0,start),after=input.value.slice(end);
    var next="";
    if(value==="clear"){
      next="";
      start=0;
    }else if(value==="backspace"){
      if(start===end&&start>0)start--;
      next=before.slice(0,start)+after;
    }else{
      next=before+value+after;
      start=before.length+value.length;
    }
    input.value=next;
    session.input=next;
    session.inputError="";
    input.focus();
    try{input.setSelectionRange(start,start);}catch(_){}
  }

  function finishSession() {
    var session=state.session;
    if(!session||session.saved)return;
    session.saved=true;
    progress.stats.sessions=Number(progress.stats.sessions||0)+1;
    if(session.type==="boss")progress.stats.bestBoss=Math.max(Number(progress.stats.bestBoss||0),session.score);
    progress.activity.unshift({
      time:new Date().toISOString(),mode:session.type,grade:state.grade,
      score:session.score,correct:session.correct,total:session.questions.length
    });
    progress.activity=progress.activity.slice(0,30);
    saveProgress();
  }

  function renderFinish() {
    var session=state.session;
    var percent=Math.round(session.correct/session.questions.length*100);
    var title=session.type==="multiply"?"구구단 배틀 완료!":session.type==="boss"?"보스 챌린지 클리어!":session.type==="practice"?"공식 연습 완료!":"암기 퀘스트 완료!";
    var message=percent>=90?"정말 정확해! 공식들이 머릿속에 단단히 자리 잡고 있어!":percent>=70?"멋진 결과야! 헷갈린 공식만 다시 확인하면 더 강해질 거야.":"좋은 도전이었어. 틀린 문제를 공식 도감에서 다시 확인하고 도전해 보자!";
    $("lessonContent").innerHTML=
      '<div class="finish-card"><div class="finish-icon">✦</div><h3>'+title+'</h3><p>'+message+'</p>'+
      '<div class="finish-score">'+session.score.toLocaleString("ko-KR")+' <small>XP</small></div>'+
      '<p>'+session.correct+' / '+session.questions.length+' 정답 · 정답률 '+percent+'% · 최고 연속 정답 '+session.bestStreak+'</p>'+
      '<div class="action-group" style="justify-content:center;margin-top:20px"><button class="primary-action" type="button" data-action="restart">한 번 더 도전하기 ↻</button><button class="secondary-action" type="button" data-action="back-learn">공식 다시 배우기</button></div></div>';
  }

  function renderMain() {
    renderHeader();renderModeTabs();
    if(state.mode==="learn")renderLearn();else renderSession();
  }

  function allMasteredCount() {
    return COURSE.filter(function(card){return cardProgress(card).mastered;}).length;
  }

  function renderStats() {
    var total=COURSE.length,mastered=allMasteredCount();
    var percent=total?Math.round(mastered/total*100):0;
    var accuracy=progress.stats.answers?Math.round(progress.stats.correct/progress.stats.answers*100):0;
    $("heroMastered").textContent=String(mastered);
    $("heroAccuracy").textContent=accuracy+"%";
    $("heroPoints").textContent=Number(progress.stats.points||0).toLocaleString("ko-KR");
    $("masteryNumber").textContent=String(mastered);
    $("courseTotal").textContent=String(total);
    $("masteryPercent").textContent=percent+"% 완료";
    $("reviewCaption").textContent="복습 "+COURSE.filter(function(card){return cardProgress(card).review;}).length+"개";
    $("correctStat").textContent=Number(progress.stats.correct||0).toLocaleString("ko-KR");
    $("sessionStat").textContent=Number(progress.stats.sessions||0).toLocaleString("ko-KR");
    $("overallProgressFill").style.width=percent+"%";
    $("overallProgress").setAttribute("aria-valuenow",String(percent));

    if(state.grade){
      var deck=deckForGrade(state.grade);
      var known=deck.filter(function(card){return cardProgress(card).mastered;}).length;
      var review=deck.filter(function(card){return cardProgress(card).review;}).length;
      $("buddyStatus").textContent=gradeLabel(state.grade)+" · "+known+"/"+deck.length+"개 공식 마스터";
      $("buddyQuote").textContent=review?"“복습 표시한 공식이 "+review+"개 있어. 다시 확인하면 기억이 더 오래갈 거야!”":"“공식은 외우기만 하는 게 아니라, 왜 그런지도 이해하면 오래 기억할 수 있어!”";
    }else{
      $("buddyStatus").textContent="오늘의 수학 미션을 시작해 봐.";
      $("buddyQuote").textContent="“한 번에 모두 외울 필요는 없어. 작은 공식 하나씩 마스터하면 돼!”";
    }
    if(state.grade){
      var selected=deckForGrade(state.grade);
      var selectedKnown=selected.filter(function(card){return cardProgress(card).mastered;}).length;
      $("courseEyebrow").textContent=gradeShort(state.grade).toUpperCase()+" · "+(state.mode==="learn"?"FORMULA STUDY":state.mode==="quiz"?"MEMORY QUEST":state.mode==="multiply"?"TIMES TABLE BATTLE":"BOSS CHALLENGE");
      $("courseTitle").textContent=gradeLabel(state.grade)+" · 마스터 "+selectedKnown+"/"+selected.length;
    }

    var recent=progress.activity.slice(0,4);
    var recommendation=TOOLS&&TOOLS.recommendCard?TOOLS.recommendCard(COURSE,progress.cards,state.grade):null;
    if($("recommendedTitle")&&$("recommendedReason")){
      $("recommendedTitle").textContent=recommendation&&recommendation.card
        ?gradeShort(recommendation.card.grade)+" · "+recommendation.card.topic+" · "+recommendation.card.title
        :"모든 공식 마스터 완료!";
      $("recommendedReason").textContent=recommendation?recommendation.reason:"추천 학습을 불러오지 못했어.";
    }

    $("activityList").innerHTML=recent.length?recent.map(function(item){
      var date="최근";
      try{date=new Intl.DateTimeFormat("ko-KR",{month:"numeric",day:"numeric"}).format(new Date(item.time));}catch(_){}
      var label=item.mode==="multiply"?"구구단 배틀":item.mode==="boss"?"보스 챌린지":item.mode==="practice"?"공식 연습":"암기 퀘스트";
      var icon=item.mode==="multiply"?"×":item.mode==="boss"?"✦":item.mode==="practice"?"✓":"∑";
      return '<div class="activity-item"><span class="activity-icon">'+icon+'</span><div class="activity-copy"><strong>'+label+' · '+esc(gradeShort(Number(item.grade)||1))+'</strong><small>'+date+' · '+item.correct+'/'+item.total+' 정답</small></div><span class="activity-score">+'+Number(item.score||0)+' XP</span></div>';
    }).join(""):'<div class="activity-empty">첫 퀘스트를 완료하면<br>여기에 기록이 쌓여!</div>';

    $("gradeGroups").querySelectorAll("[data-grade]").forEach(function(button){
      var active=Number(button.dataset.grade)===state.grade;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",active?"true":"false");
      var deck2=deckForGrade(Number(button.dataset.grade));
      var mastered2=deck2.filter(function(card){return cardProgress(card).mastered;}).length;
      var small=button.querySelector("small");
      if(small)small.textContent=mastered2+"/"+deck2.length+" 마스터";
    });
  }

  function renderAll() {
    renderGradeGroups();renderTopics();renderMain();renderStats();
    var searchInput=$("formulaSearchInput");
    if(searchInput)renderSearchResults(searchInput.value,state.searchFilter!=="all"||!!String(searchInput.value||"").trim());
  }

  function chooseGrade(grade) {
    state.grade=grade;state.topic="전체";state.index=0;state.revealed=false;state.mode="learn";state.session=null;
    renderAll();
    $("lessonContent").scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function setMode(mode) {
    if(mode==="multiply"&&!state.grade){state.grade=2;state.topic="전체";renderGradeGroups();renderTopics();}
    if(!state.grade){
      showToast("먼저 학년을 선택해 줘!");
      $("gradeGroups").scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(mode==="learn"){
      state.mode="learn";state.session=null;state.revealed=false;renderAll();return;
    }
    startSession(mode);
  }

  function handleMainAction(button) {
    var action=button.dataset.action;
    if(action==="reveal"){state.revealed=true;renderMain();return;}
    if(action==="previous"||action==="next"){
      var deck=currentDeck();
      state.index=action==="previous"?Math.max(0,state.index-1):Math.min(deck.length-1,state.index+1);
      state.revealed=false;renderMain();renderStats();return;
    }
    if(action==="practice-current"){
      var cardToPractice=currentDeck()[state.index];
      if(cardToPractice)startCardPractice(cardToPractice);
      return;
    }
    if(action==="review"){
      var current=currentDeck()[state.index];if(!current)return;
      var record=cardProgress(current);record.review=!record.review;
      saveProgress();showToast(record.review?"복습 목록에 추가했어.":"복습 목록에서 뺐어.");renderAll();return;
    }
    if(action==="insert-key"){insertKey(button.dataset.key);return;}
    if(action==="submit-answer"){answerQuestion();return;}
    if(action==="retry-answer"){
      if(!state.session)return;
      state.session.answered=false;state.session.input="";state.session.inputError="";
      renderMain();var input=$("mathAnswerInput");if(input)input.focus();return;
    }
    if(action==="next-question"){
      if(!state.session||!state.session.answered)return;
      state.session.index+=1;state.session.answered=false;state.session.input="";state.session.inputError="";state.session.wrongAttempts=0;
      if(state.session.index>=state.session.questions.length){finishSession();renderFinish();renderStats();}
      else{renderMain();renderStats();}
      return;
    }
    if(action==="restart"){
      var previousSession=state.session;
      if(previousSession&&previousSession.type==="practice"&&previousSession.questions[0]&&previousSession.questions[0].card){
        startCardPractice(previousSession.questions[0].card);
      }else startSession(state.mode);
      return;
    }
    if(action==="back-learn"){
      var returnId=state.session&&state.session.returnCardId;
      if(returnId){openCardById(returnId);return;}
      state.mode="learn";state.session=null;state.index=0;state.revealed=false;renderAll();return;
    }
  }

  function answerQuestion() {
    var session=state.session;
    if(!session||session.answered)return;
    var question=session.questions[session.index];
    if(!question)return;
    var raw=session.input||"";
    if(!MATH||typeof MATH.check!=="function"){
      session.inputError="수식 계산기를 불러오지 못했어. 페이지를 새로고침해 줘.";
      renderMain();return;
    }
    var result=MATH.check(raw,question.answer);
    if(result.error){
      session.inputError=result.error;
      renderMain();
      return;
    }
    session.answered=true;
    session.wasCorrect=!!result.correct;
    if(session.wasCorrect){
      session.lastGain=Math.max(40,100-session.wrongAttempts*20)+Math.min(session.streak,5)*20;
      session.correct+=1;session.streak+=1;
      session.bestStreak=Math.max(session.bestStreak,session.streak);
      session.score+=session.lastGain;
      progress.stats.correct=Number(progress.stats.correct||0)+1;
      progress.stats.points=Number(progress.stats.points||0)+session.lastGain;
    }else{
      session.lastGain=0;session.streak=0;session.wrongAttempts+=1;
    }
    progress.stats.answers=Number(progress.stats.answers||0)+1;
    if(question.card){
      var record=cardProgress(question.card);
      record.seen=true;record.attempts=Number(record.attempts||0)+1;
      if(session.wasCorrect)record.correct=Number(record.correct||0)+1;
      if(session.wasCorrect&&session.type==="practice"){
        record.mastered=true;
        record.review=false;
      }else if(!session.wasCorrect){
        record.review=true;
      }else if(record.attempts>0&&record.correct/record.attempts>=.8){
        record.mastered=true;
      }
    }
    saveProgress();renderMain();renderStats();
    var activeSearch=$("formulaSearchInput");
    if(activeSearch)renderSearchResults(activeSearch.value,state.searchFilter!=="all"||!!String(activeSearch.value||"").trim());
  }

  function init() {
    if(!COURSE.length){
      $("lessonContent").textContent="학습 콘텐츠를 불러오지 못했어. 새로고침해 줘.";
      return;
    }
    $("gradeGroups").addEventListener("click",function(event){
      var button=event.target.closest("[data-grade]");if(button)chooseGrade(Number(button.dataset.grade));
    });
    var searchInput=$("formulaSearchInput");
    if(searchInput)searchInput.addEventListener("input",function(){
      state.searchLimit=8;
      renderSearchResults(searchInput.value,false);
    });
    $("topicBar").addEventListener("click",function(event){
      var button=event.target.closest("[data-topic]");if(!button)return;
      state.topic=button.dataset.topic;state.index=0;state.revealed=false;state.session=null;state.mode="learn";renderAll();
    });
    $("modeTabs").addEventListener("click",function(event){
      var button=event.target.closest("[data-mode]");if(button)setMode(button.dataset.mode);
    });
    $("lessonContent").addEventListener("click",function(event){
      var button=event.target.closest("[data-action]");if(button)handleMainAction(button);
    });
    document.body.addEventListener("click",function(event){
      var button=event.target.closest("[data-action]");if(!button)return;
      var action=button.dataset.action;
      if(action==="jump-grades")$("gradeGroups").scrollIntoView({behavior:"smooth",block:"center"});
      else if(action==="quick-start")quickStartRecommended();
      else if(action==="open-search-card")openCardById(button.dataset.cardId);
      else if(action==="practice-search-card"){
        var card=COURSE.find(function(item){return item.id===button.dataset.cardId;});
        if(card)startCardPractice(card);
      }else if(action==="search-filter"){
        state.searchFilter=button.dataset.filter||"all";state.searchLimit=8;
        document.querySelectorAll("[data-search-filter]").forEach(function(item){
          var active=item.dataset.searchFilter===state.searchFilter;
          item.classList.toggle("active",active);item.setAttribute("aria-pressed",active?"true":"false");
        });
        renderSearchResults($("formulaSearchInput")?$("formulaSearchInput").value:"",true);
      }else if(action==="show-all-search-results"){
        state.searchLimit=9999;
        renderSearchResults($("formulaSearchInput")?$("formulaSearchInput").value:"",true);
      }else if(action==="clear-search"){
        var searchInput=$("formulaSearchInput");
        if(searchInput){searchInput.value="";searchInput.focus();}
        state.searchFilter="all";state.searchLimit=8;
        document.querySelectorAll("[data-search-filter]").forEach(function(item){
          var active=item.dataset.searchFilter==="all";
          item.classList.toggle("active",active);item.setAttribute("aria-pressed",active?"true":"false");
        });
        renderSearchResults("",false);
      }
    });
    window.addEventListener("dori:cloud-sync-ready",function(event){
      progress=loadProgress();renderAll();
      var status=$("saveStatus");
      if(status)status.textContent=event.detail&&event.detail.userId
        ?"계정 클라우드 동기화 연결 완료 · 다른 기기에서도 학습을 이어갈 수 있어."
        :"로그인 전에는 이 브라우저에 저장돼. 로그인하면 계정 클라우드 동기화가 이어져.";
    });
    renderAll();
    if(window.doriCloudSync&&window.doriCloudSync.userId)$("saveStatus").textContent="계정 클라우드 동기화가 연결되어 있어.";
  }

  init();
})();