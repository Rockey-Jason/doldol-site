(()=>{'use strict';if(window.__DORI_SOUND_V3__)return;window.__DORI_SOUND_V2__=true;
const KEY='doriSoundSettings.v1';let S={enabled:true,volume:100};try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&typeof x==='object'){S.enabled=x.enabled!==false;S.volume=Math.max(0,Math.min(100,Number(x.volume??100)))}}catch{}
let C=null,M=null,comp=null,hoverAt=0,sliderAt=0,lastAt=0,lastCoinAt=0,entryPlayed=false;
function audio(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!C){C=new A();M=C.createGain();comp=C.createDynamicsCompressor();comp.threshold.value=-20;comp.knee.value=18;comp.ratio.value=4;M.connect(comp);comp.connect(C.destination)}if(C.state==='suspended')C.resume().catch(()=>{});M.gain.setTargetAtTime(S.volume/100,C.currentTime,.02);return C}
function tone(f=650,e=500,d=.07,g=.08,w='sine',delay=0){if(!S.enabled||S.volume<=0)return;const c=audio();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),a=c.createGain(),q=c.createBiquadFilter();o.type=w;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,e),t+d);q.type='lowpass';q.frequency.value=4800;a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(g,t+.012);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(q);q.connect(a);a.connect(M);o.start(t);o.stop(t+d+.015)}
function hiss(d=.045,g=.04,delay=0){if(!S.enabled||!S.volume)return;const c=audio();if(!c)return;const b=c.createBuffer(1,Math.floor(c.sampleRate*d),c.sampleRate),v=b.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*(1-i/v.length);const n=c.createBufferSource(),q=c.createBiquadFilter(),a=c.createGain(),t=c.currentTime+delay;n.buffer=b;q.type='lowpass';q.frequency.value=2200;a.gain.setValueAtTime(g,t);a.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(q);q.connect(a);a.connect(M);n.start(t);n.stop(t+d+.01)}
const FX={
 click:()=>{tone(720,540,.045,.065);tone(1120,900,.035,.022,'sine',.008)},
 enter:()=>{tone(392,587,.13,.065,'sine');tone(587,784,.16,.06,'sine',.075);tone(1175,1568,.20,.035,'sine',.15)},
 exit:()=>{tone(784,587,.11,.055,'sine');tone(587,392,.14,.05,'sine',.06);tone(392,294,.17,.035,'sine',.13)},
 menuOpen:()=>{tone(330,494,.11,.055,'triangle');tone(660,990,.14,.04,'sine',.07)},
 menuClose:()=>{tone(880,660,.085,.05,'sine');tone(440,330,.12,.04,'triangle',.055)},
 newsOpen:()=>{hiss(.045,.018);tone(523,659,.11,.05);tone(784,1046,.14,.045,'sine',.08)},
 newsRead:()=>{tone(659,784,.09,.045);tone(988,1175,.12,.04,'sine',.065);tone(1568,1318,.14,.025,'sine',.13)},
 boxOpen:()=>{hiss(.07,.026);tone(330,494,.10,.06,'triangle');tone(660,990,.12,.06,'sine',.06);tone(1320,1760,.18,.065,'sine',.13)},
 mission:()=>{tone(440,554,.08,.055);tone(659,880,.12,.055,'sine',.06)},
 missionDone:()=>{tone(523,659,.12,.065);tone(784,1046,.14,.07,'sine',.075);tone(1318,1568,.20,.05,'sine',.16)},
 hover:()=>tone(900,820,.025,.018),image:()=>{tone(880,1175,.085,.055);tone(1480,1320,.065,.022,'sine',.025)},
 select:()=>{tone(520,760,.075,.075);tone(1040,1120,.045,.022,'sine',.025)},
 open:()=>{tone(390,640,.12,.075);tone(620,940,.13,.055,'sine',.045)},close:()=>tone(720,410,.09,.065),
 toggle:()=>{tone(500,760,.065,.06);tone(980,980,.04,.022,'sine',.02)},change:()=>tone(620,760,.05,.055),tab:()=>{tone(640,840,.06,.06);tone(1240,1080,.035,.018,'sine',.02)},
 success:()=>{tone(523,523,.12,.09);tone(659,659,.14,.09,'sine',.075);tone(784,1046,.19,.095,'sine',.15)},
 error:()=>{tone(300,210,.12,.08,'triangle');tone(210,155,.13,.055,'triangle',.07)},
 coin:()=>{tone(1318,1760,.055,.095,'triangle');tone(1976,1568,.085,.075,'sine',.045);tone(2637,2093,.10,.045,'sine',.105);tone(1175,880,.11,.025,'sine',.16)},
 move:()=>{tone(440,660,.065,.075);tone(880,990,.045,.025,'sine',.025)},attack:()=>{hiss(.055,.045);tone(210,85,.14,.12,'triangle');tone(120,72,.12,.07,'sine',.025)},
 hit:()=>{hiss(.075,.065);tone(165,75,.12,.10,'triangle',.012)},defend:()=>{tone(340,520,.09,.08,'triangle');tone(720,920,.12,.045,'sine',.03)},
 card:()=>{hiss(.035,.025);tone(780,640,.06,.055);tone(1180,980,.045,.022,'sine',.018)},
 craft:()=>{tone(440,560,.09,.07);tone(660,880,.12,.065,'sine',.07);tone(1320,1760,.16,.045,'sine',.14)},
 win:()=>{tone(392,392,.14,.085);tone(523,523,.14,.085,'sine',.09);tone(659,659,.14,.085,'sine',.18);tone(784,1046,.24,.095,'sine',.27)},
 lose:()=>{tone(440,370,.12,.075);tone(330,260,.16,.07,'triangle',.1);tone(220,165,.21,.06,'triangle',.22)},
 dog:()=>{tone(330,178,.10,.13,'triangle');tone(258,142,.105,.12,'triangle',.13)},
 doronum:()=>{tone(880,1320,.19,.075);tone(1760,2200,.23,.065,'sine',.09);tone(1320,1980,.16,.04,'sine',.19)}
};
function play(n='click'){try{(FX[n]||FX.click)()}catch(e){console.debug(e)}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch{};ui()}
function target(t){return t?.closest?.('button,a,[role="button"],[onclick],[data-action],[data-tab],.cell,.card,.piece,.tile,.leader,.fieldPreviewSlot,.fieldPreviewLeader,.tab,.menu-item,.nav-item,.game-card,.메인이미지,img,label,summary,select,input,textarea')||null}
function soundFor(el){if(!el)return'click';const tx=(el.getAttribute?.('aria-label')||el.getAttribute?.('title')||el.innerText||el.textContent||'').trim().slice(0,100),cl=String(el.className?.baseVal||el.className||'');
if(el.matches?.('.cell')){if(el.classList.contains('kill'))return'hit';if(el.classList.contains('attack'))return'attack';if(el.classList.contains('move'))return'move';if(el.classList.contains('selected'))return'select'}
if(/targetSelectable|fieldPreviewCard|fieldPreviewSlot|fieldPreviewLeader/.test(cl))return'card';if(/battlefieldActive/.test(cl))return'select';if(el.disabled||/disabled/.test(cl))return'error';
if(/랜덤\s*박스|박스\s*열기|뽑기|상자\s*열기/.test(tx))return'boxOpen';
if(/돌이신문|신문\s*읽기|기사\s*읽기|읽으러\s*가기/.test(tx))return/news|신문/.test(tx)?'newsOpen':'newsRead';
if(/일일\s*미션|오늘의\s*미션|미션\s*보기/.test(tx))return'mission';
if(/체크메이트|승리|우승|축하/.test(tx))return'win';if(/패배|기권/.test(tx))return'lose';if(/오류|실패|잘못|부족|불가/.test(tx))return'error';
if(/도로늄|보석|희귀/.test(tx))return'doronum';if(/공격|전투|타격|발사/.test(tx))return'attack';if(/방어|막기|보호/.test(tx))return'defend';if(/제작|조합|채굴|생산/.test(tx))return'craft';
if(/코인\s*받기|보상\s*받기|코인\s*획득|보상\s*수령/.test(tx))return'coin';
if(/돌이신문|신문|뉴스|기사/.test(tx))return'newsOpen';
if(/랜덤\s*박스|뽑기|상자/.test(tx))return'boxOpen';
if(/일일\s*미션|미션/.test(tx))return'mission';
if(/코인|보상|획득|매수|매도|구매|판매|체결/.test(tx))return'coin';if(/모두\s*완료|미션\s*완료|달성/.test(tx))return'missionDone';
if(/완료|성공|저장/.test(tx))return'success';
if(/닫기|접기|취소|모달\s*닫기/.test(tx))return'menuClose';
if(/나가기|메인으로|돌아가기|페이지\s*이동/.test(tx))return'exit';
if(/메뉴|설정|열기|시작|다음|로그인/.test(tx))return'menuOpen';
if(el.matches?.('img'))return'image';if(el.matches?.('select,input,textarea'))return'change';if(el.matches?.('[data-tab],.tab'))return'tab';if(el.matches?.('.card,.tile,.leader'))return'card';return'select'}
function pageEntry(){if(entryPlayed)return;entryPlayed=true;play('enter')}
document.addEventListener('pointerdown',()=>{if(!entryPlayed){const c=audio();if(c&&c.state==='running')pageEntry();else if(c)c.resume().then(pageEntry).catch(()=>{})}}, {capture:true,once:true});
document.addEventListener('click',e=>{const el=target(e.target);if(!el||el.closest?.('#dori-sound-widget')||el.dataset?.soundIgnore==='true')return;const n=performance.now();if(n-lastAt<24)return;lastAt=n;const img=e.target?.closest?.('img'),parent=img?.closest?.('button,a,[role="button"],[onclick],[data-action],.card,.game-card,.메인이미지');const action=parent||el;const href=action.matches?.('a[href]')?action.getAttribute('href'):'';if(href&&!href.startsWith('#')&&!href.startsWith('javascript:')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){play('exit')}else{play(parent?soundFor(parent):img?'image':soundFor(el))}},true);
window.addEventListener('pagehide',()=>{try{if(S.enabled&&S.volume>0)play('exit')}catch{}},{capture:true});
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=target(e.target);if(!el||el.closest?.('#dori-sound-widget')||(e.relatedTarget&&el.contains(e.relatedTarget)))return;const n=performance.now();if(n-hoverAt<100)return;hoverAt=n;play('hover')},true);
document.addEventListener('change',e=>{const el=e.target;if(!el||el.closest?.('#dori-sound-widget'))return;if(el.matches?.('select,input[type="checkbox"],input[type="radio"],textarea'))play(el.matches('input[type="checkbox"],input[type="radio"]')?'toggle':'change')},true);
document.addEventListener('input',e=>{const el=e.target;if(el?.matches?.('input[type="range"]')&&!el.closest?.('#dori-sound-widget')){const n=performance.now();if(n-sliderAt>110){sliderAt=n;play('change')}}},true);
document.addEventListener('submit',e=>{if(!e.target?.closest?.('#dori-sound-widget'))play('success')},true);
document.addEventListener('dragstart',e=>{if(target(e.target))play('select')},true);document.addEventListener('drop',e=>{if(target(e.target))play('move')},true);
document.addEventListener('keydown',e=>{if(e.repeat||e.target?.closest?.('#dori-sound-widget'))return;if(e.key==='Escape'){play('close');return}if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('button,a,[role="button"],[onclick],.cell,.card,.tab,[data-action]'))play(soundFor(e.target));else if(/^Arrow/.test(e.key)&&e.target?.matches?.('select,input[type="range"],.cell'))play('move')},true);
document.addEventListener('dori:sound',e=>{const n=typeof e.detail==='string'?e.detail:e.detail?.name;if(n)play(n)});
/* Reward feedback: play a metallic coin chime only when the UI reports an actual reward. */
const rewardText=/((돌돌)?코인.{0,14}(획득|지급|받았|증가|추가|보상)|(?:획득|지급|받았|추가).{0,14}(돌돌)?코인|\+\s*[\d,]+\s*(?:돌돌)?코인|미션.{0,10}완료)/i;
const rewardObserver=new MutationObserver(records=>{if(!S.enabled)return;const now=Date.now();if(now-lastCoinAt<700)return;for(const r of records){const nodes=[...(r.addedNodes||[])];if(r.type==='characterData'&&r.target)nodes.push(r.target);for(const node of nodes){const textValue=(node.nodeType===3?node.nodeValue:node.textContent)||'';if(textValue.length>500)continue;if(rewardText.test(textValue)){lastCoinAt=now;play(/미션.{0,10}완료/i.test(textValue)?'missionDone':'coin');return}}}});
try{rewardObserver.observe(document.body,{subtree:true,childList:true,characterData:true})}catch{}
document.addEventListener('click',e=>{const el=e.target?.closest?.('button,[role="button"],[data-action]');if(!el||el.closest?.('#dori-sound-widget'))return;const tx=(el.innerText||el.textContent||'').trim();if(/미션\s*완료|보상\s*받기/.test(tx))play('missionDone')},false);
const css=document.createElement('style');css.textContent=`#dori-sound-widget{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;font:13px/1.4 inherit;color:#f5f7ff}#dori-sound-toggle{display:flex;align-items:center;gap:9px;border:1px solid #ffffff35;border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#131c48f5,#05081cf5);box-shadow:0 8px 30px #0006,inset 0 1px #ffffff18;color:inherit;font:inherit;font-weight:700;cursor:pointer;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:transform .18s,border-color .18s}#dori-sound-toggle:hover{border-color:#9aaaffaa;transform:translateY(-1px)}#dori-sound-led{width:7px;height:7px;border-radius:50%;background:#65e6b0;box-shadow:0 0 12px #65e6b0aa}#dori-sound-widget[data-off=true] #dori-sound-led{background:#8790a8;box-shadow:none}#dori-sound-panel{position:absolute;right:0;bottom:calc(100% + 10px);width:min(290px,calc(100vw - 28px));padding:17px;border:1px solid #ffffff30;border-radius:19px;background:linear-gradient(145deg,#12193efa,#05081afa);box-shadow:0 20px 60px #0007;backdrop-filter:blur(20px);transform-origin:bottom right;animation:dsIn .18s ease-out}#dori-sound-panel[hidden]{display:none}#dori-sound-panel .dsrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0}#dori-sound-panel .dssub{font-size:11px;color:#aeb9da;margin-top:4px}#dori-sound-panel input[type=range]{width:100%;accent-color:#9aaaff}#dori-sound-panel .dsval{color:#dbe2ff;min-width:42px;text-align:right}#dori-sound-panel button{width:100%;margin-top:12px;padding:10px;border:1px solid #aabaff40;border-radius:11px;background:#828fff20;color:inherit;font:inherit;cursor:pointer}@keyframes dsIn{from{opacity:0;transform:translateY(5px) scale(.98)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){#dori-sound-panel{animation:none}}`;document.head.appendChild(css);
const w=document.createElement('div');w.id='dori-sound-widget';w.innerHTML='<section id="dori-sound-panel" hidden aria-label="효과음 설정"><div style="font-weight:750;font-size:15px">사운드 컨트롤</div><div class="dssub">DORI PREMIUM AUDIO</div><div class="dsrow"><label for="dori-sound-enabled">효과음 켜기</label><input id="dori-sound-enabled" type="checkbox"></div><div class="dsrow"><label for="dori-sound-volume">기본 음량</label><span id="dori-sound-value" class="dsval">100%</span></div><input id="dori-sound-volume" type="range" min="0" max="100" value="100" aria-label="효과음 음량"><button id="dori-sound-test" type="button">♪ 사운드 미리 듣기</button></section><button id="dori-sound-toggle" type="button" aria-expanded="false" aria-controls="dori-sound-panel"><span id="dori-sound-led"></span><span id="dori-sound-label">효과음 켜짐</span><span aria-hidden="true">⌄</span></button>';document.body.appendChild(w);
const p=w.querySelector('#dori-sound-panel'),b=w.querySelector('#dori-sound-toggle'),en=w.querySelector('#dori-sound-enabled'),vol=w.querySelector('#dori-sound-volume'),val=w.querySelector('#dori-sound-value'),lab=w.querySelector('#dori-sound-label');
function ui(){if(!w.isConnected)return;en.checked=S.enabled;vol.value=S.volume;vol.disabled=!S.enabled;val.textContent=S.volume+'%';lab.textContent=S.enabled?'효과음 켜짐':'효과음 꺼짐';w.dataset.off=String(!S.enabled)}
b.addEventListener('click',()=>{p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden)play('menuOpen');else play('menuClose')});en.addEventListener('change',()=>{S.enabled=en.checked;save();if(S.enabled)play('toggle')});vol.addEventListener('input',()=>{S.volume=Number(vol.value);save()});w.querySelector('#dori-sound-test').addEventListener('click',()=>{if(!S.enabled)S.enabled=true;save();play('success')});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!p.hidden){p.hidden=true;b.setAttribute('aria-expanded','false')}});ui();
window.DoriSound=Object.freeze({play,setEnabled(v){S.enabled=!!v;save()},setVolume(v){S.volume=Math.max(0,Math.min(100,Number(v)||0));save()},getSettings(){return {...S}}});
})();