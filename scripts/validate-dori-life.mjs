import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const file = "dori-life.html";
const html = fs.readFileSync(file, "utf8");
const lines = html.split(/\r?\n/);
const normalizedHtml = html.replace(/\s+/g, " ");

// Parse every inline script before the site is published.
assert.ok(html.includes("css/dori-foundation.css"), "Dori Life must load the shared UI foundation.");
const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => {
    if (/\bsrc\s*=/i.test(match[1]) || !match[2].trim()) return false;
    const type = (match[1].match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1] || "").toLowerCase();
    return !type || ["module", "text/javascript", "application/javascript", "text/ecmascript", "application/ecmascript"].includes(type);
  });
assert.ok(inlineScripts.length > 0, "Dori Life must contain an inline controller script.");
inlineScripts.forEach((match, index) => {
  new vm.Script(match[2], { filename: file + ":inline-" + (index + 1) });
});

// The behavior bank and choreography table must stay in one-to-one correspondence.
const bankMatch = html.match(/var BANK\s*=\s*\{([\s\S]*?)\n\s*\};/);
assert.ok(bankMatch, "Could not find the Dori Life event bank.");
const bankKeys = [...bankMatch[1].matchAll(/^\s*(?:'([^']+)'|([A-Za-z0-9_-]+))\s*:\s*\{/gm)]
  .map((match) => match[1] || match[2]);

function readQuotedArray(source) {
  return [...source.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}
function readArrayField(source, field) {
  const match = source.match(new RegExp("[\\\"']?" + field + "[\\\"']?\\s*:\\s*\\[([^\\]]*)\\]"));
  return match ? readQuotedArray(match[1]) : null;
}

const profiles = new Map();
for (const line of lines) {
  const add = line.match(/addEventChoreography\((\[[^\]]+\]),\s*\{(.*)\}\);/);
  if (add) {
    const keys = JSON.parse(add[1]);
    const profileSource = add[2];
    const sequence = readArrayField(profileSource, "sequence");
    const faces = readArrayField(profileSource, "faces");
    const route = /["']?route["']?\s*:\s*true/.test(profileSource);
    keys.forEach((key) => profiles.set(key, { sequence, faces, route }));
  }

  const update = line.match(/customizeEventChoreography\('([^']+)',\{(.*)\}\);/);
  if (update) {
    const key = update[1];
    const source = update[2];
    const previous = profiles.get(key) || { sequence: null, faces: null, route: false };
    const sequence = readArrayField(source, "sequence");
    const faces = readArrayField(source, "faces");
    const routeMatch = source.match(/route\s*:\s*(true|false)/);
    profiles.set(key, {
      sequence: sequence || previous.sequence,
      faces: faces || previous.faces,
      route: routeMatch ? routeMatch[1] === "true" : previous.route
    });
  }
}

assert.equal(bankKeys.length, 76, "Unexpected event-bank size; review the test's parser.");
assert.ok(bankKeys.includes("visitor"), "The event bank must include a friendly visitor event.");
assert.ok(html.includes('id="doriVisitor"'), "A visitor must have a separate room character.");
assert.ok(html.includes("function updateVisitorArrival(evt,state)"), "Visitor choreography must include approach, greeting, interaction and departure.");
assert.ok(html.includes('id="visitorNameTag"'), "The visitor name must be visible above the visiting cat.");
assert.ok(html.includes("var VISITOR_CATS = ["), "The visitor roster must include the four named cats.");
for (const name of ["윈터","모래","복돌이","스마트"]) {
  assert.ok(html.includes("name:'" + name + "'"), "The visitor roster must include " + name + ".");
}
for (const catId of ["winter","morae","bokdori","smart"]) {
  assert.ok(html.includes('data-visitor-cat="' + catId + '"'), "Each visitor needs an individual coat palette: " + catId + ".");
}
assert.ok(html.includes("function visitorNameForDay(key,index)"), "Visitor selection must rotate deterministically by day.");
assert.ok(html.includes("visitorName:kind==='visitor'?visitorNameForDay(key,index):''"), "Scheduled visitors must store their selected cat identity.");
assert.ok(html.includes("function eventContentFor(evt)"), "Visitor names must be used in the live scene, schedule and archive.");
assert.ok(html.includes("room.dataset.visitorCat=profile.id;"), "The selected cat coat must be applied to the actual visitor.");
assert.ok(html.includes('id="visitorWavePaw"'), "A cat visitor must greet with a raised paw.");
assert.ok(html.includes('id="visitorTail"'), "The visitor cat must have an independently animated tail.");
assert.ok(!html.includes('id="visitorWaveArm"'), "The old human visitor arm must be removed.");
const visitorNameStart = html.indexOf("function visitorNameForDay(key,index){");
const visitorNameEnd = html.indexOf("\\n  function visitorProfileForEvent", visitorNameStart);
assert.ok(visitorNameStart >= 0 && visitorNameEnd > visitorNameStart, "Could not isolate the visitor rotation helper.");
const visitorNames = ["윈터","모래","복돌이","스마트"];
const visitorNameSelector = new Function(
  "VISITOR_CATS","ordinal",
  html.slice(visitorNameStart,visitorNameEnd) + "\\nreturn visitorNameForDay;"
)(
  visitorNames.map((name,index)=>({id:["winter","morae","bokdori","smart"][index],name})),
  () => 2
);
assert.deepEqual([0,1,2,3].map(index=>visitorNameSelector("2026-11-25",index)),visitorNames,
  "Four consecutive visitor slots must rotate through all four cat names.");
const visitorPresentationStart = html.indexOf("function visitorProfileForEvent(evt){");
const visitorPresentationEnd = html.indexOf("\\n  function parts(now)", visitorPresentationStart);
assert.ok(visitorPresentationStart >= 0 && visitorPresentationEnd > visitorPresentationStart, "Could not isolate visitor presentation helpers.");
const visitorPresentationApi = new Function(
  "VISITOR_CATS","BANK",
  html.slice(visitorPresentationStart,visitorPresentationEnd) + "\\nreturn {visitorProfileForEvent,eventContentFor};"
)(
  visitorNames.map((name,index)=>({id:["winter","morae","bokdori","smart"][index],name})),
  {visitor:{title:"손님",desc:"고양이가 왔어요",icon:"🐱",tag:"손님"}}
);
for (const name of visitorNames) {
  const data=visitorPresentationApi.eventContentFor({kind:"visitor",visitorName:name});
  assert.equal(data.title,name+"가 놀러 왔어요","Timeline and live visitor titles must show the selected cat.");
  assert.ok(data.desc.includes(name),"Visitor descriptions must keep the selected cat identity.");
}

assert.ok(html.includes("function updateFriendArrival(evt,state,now)"), "The bread-cat companion must move independently during visits.");
assert.ok(html.includes("room.dataset.visitor=stage;"), "Visitor phases must be explicit for animation styling.");
assert.ok(html.includes("room.dataset.friend=pose==='friendPlay'"), "The companion must react to friendship choreography.");
const missingProfiles = bankKeys.filter((key) => !profiles.has(key));
assert.deepEqual(missingProfiles, [], "Events without choreography profiles: " + missingProfiles.join(", "));

const supportedPoses = new Set([
  "alert","beg","boop","circle","cuddle","curious","dance","doze","dream","eat",
  "explore","flop","follow","friendPlay","gallop","greet","groom","guard","happy",
  "hide","hop","idle","listen","lookUp","paw","peek","play","pounce","reunion",
  "scratch","shake","shy","sit","sleep","sneeze","sniff","stretch","trot","wait",
  "wake","walk","water","yawn","zoomies","chase"
]);
const locomotionPoses = new Set(["walk","trot","gallop","zoomies","explore","follow","chase","circle"]);
const unsupported = [];
const badFaces = [];
const stationaryWalking = [];
for (const [key, profile] of profiles) {
  const sequence = profile.sequence || [];
  const unknown = sequence.filter((pose) => !supportedPoses.has(pose));
  if (unknown.length) unsupported.push(key + ": " + unknown.join(", "));
  if (!sequence.length) unsupported.push(key + ": empty sequence");
  if (profile.faces && profile.faces.length !== sequence.length) {
    badFaces.push(key + ": " + profile.faces.length + " faces for " + sequence.length + " actions");
  }
  if (!profile.route && sequence.some((pose) => locomotionPoses.has(pose))) {
    stationaryWalking.push(key + ": " + sequence.join(" → "));
  }
}
assert.deepEqual(unsupported, [], "Unsupported or empty action poses: " + unsupported.join("; "));
assert.deepEqual(badFaces, [], "Event face/action count mismatch: " + badFaces.join("; "));
assert.deepEqual(stationaryWalking, [], "Fixed-destination events contain in-place locomotion: " + stationaryWalking.join("; "));

// Protect the actual fixes: movement is gated, direction turns precede travel,
// and the most easily-confused maintenance/rest actions each have a distinct rig.
assert.ok(html.includes("var isDoriTurning=!!(doriActor&&doriActor._isTurning);"), "The turning state used by the rig must be declared.");
assert.ok(html.includes("function applyLifeLegMotion(pose,t,isMoving,isTurning)"), "Every non-travel activity must animate the four leg joints.");
assert.ok(html.includes("applyLifeLegMotion(pose,t,isDoriMoving,isDoriTurning);"), "Secondary leg motion must run for each rendered pose.");
assert.ok(html.includes("Math.max(7600,state.moveDuration)"), "Event travel must not use fast short movement durations.");
assert.ok(html.includes("Math.max(9000,plan.stepMs||0)"), "Event actions must remain visible long enough to read.");
assert.ok(html.includes("var zi=Math.floor(second/10)%zoomStops.length;"), "Zoomies route changes must not cause rapid sliding.");
assert.ok(html.includes("var ti=Math.floor(second/10)%trotStops.length;"), "Trot route changes must be slow and deliberate.");
assert.ok(html.includes("var demoIndex=Math.floor((performance.now()-motionTestStartedAt)/11000)%demo.length;"), "Motion test clips must last eleven seconds and start at walking.");
assert.ok(html.includes("var isDoriMoving=!!(doriActor&&doriActor._isMoving&&!isDoriTurning);"), "Movement state must be derived from the declared turning state.");
assert.ok(html.includes("var desiredFacing=isDori&&Math.abs(dx)>7?(dx>0?'right':'left'):currentFacing"));
assert.ok(html.includes("function turnFrame(ts)"));
assert.ok(html.includes("set('frontNearPaw',-.16,1,1,0,-12-5*lickPhase)"), "Grooming must lift the front paw.");
assert.ok(html.includes("set('hindNearPaw',.18*Math.sin(t*17),1,1,0,-2-7*scratchBeat)"), "Scratching must animate the hind paw.");
assert.ok(html.includes("function buildRoutineCycle(now,base){"), "The behavior director must build seeded routine cycles.");
assert.ok(html.includes("var cycleIndex=Math.floor(seconds/300);"), "Routine choices must be aligned to five-minute KST blocks.");
assert.ok(html.includes("DORI-LIFE-ROUTINE-"), "Routine behavior must be deterministic by KST day and cycle.");
assert.ok(html.includes("var actionBeat=Math.sin(t*5.6)"), "The high-visibility action pass must be present.");
assert.ok(html.includes("motion-test=1"), "The pose demonstration mode must be available.");
assert.ok(html.includes("['breakfast','식사','eat']"), "The motion test must drive the eating pose explicitly.");
assert.ok(html.includes("el._gaitCycles=distance>3?"), "Gait cycles must be derived from actual movement distance.");
assert.ok(html.includes("distance*.62/(el._gaitStride*Math.max(.62,from.s))"), "Stance foot travel must match actual body displacement.");
assert.ok(html.includes("var demoIndex=Math.floor((performance.now()-motionTestStartedAt)/11000)%demo.length;"), "Motion test must start at walking and hold each clip for eleven seconds.");
assert.ok(html.includes("el._gaitPhase=ease*el._gaitCycles*Math.PI*2;"), "Gait phase must stay synchronized with travel progress.");
assert.ok(html.includes("function gaitFootStep(phase,stride)"), "A planted stance and lifted swing foot cycle must be defined.");
assert.ok(html.includes("function animateGaitLeg(prefix,phase,stride,amplitude)"), "Each leg must be individually articulated.");
assert.ok(html.includes("var isDoriTurning=!!(doriActor&&doriActor._isTurning);"), "The animation frame must declare the turning state used by the rig.");
assert.ok(html.includes("animateGaitLeg('frontNear',gaitPhase,gaitStride,.92)"), "Walking must move the near front leg.");
assert.ok(html.includes("animateGaitLeg('hindFar',gaitPhase+Math.PI*.5,gaitStride*.92,.82)"), "Walking must move the rear far leg.");
assert.ok(html.includes("animateGaitLeg('hindNear',gaitPhase+Math.PI*1.5,gaitStride*.92,.82)"), "Walking must move the rear near leg.");
assert.ok(html.includes("if(isDoriMoving){"), "Every actual Dori translation must trigger the shared gait dispatcher.");
assert.ok(html.includes("var fastTravel=['trot','gallop','zoomies','chase','pounce','hop'].indexOf(pose)>=0;"), "Fast movement actions must use a diagonal-pair gait while all other movement uses a four-beat walk.");
assert.ok(normalizedHtml.includes("Locomotion is driven by the actor's real translation, not by the current activity label."), "Event poses must not suppress locomotion while Dori moves.");
assert.ok(html.includes("}else if(isDoriTurning){"), "Turns must include articulated pivot steps instead of freezing the legs.");
assert.ok(html.includes("A small alternating pivot-step prevents the feet from freezing while Dori turns."), "Pivot stepping must remain present for direction changes.");
assert.ok(html.includes("['walk','실제 보행','walk']"), "The pose test must include walking.");
assert.ok(html.includes("['trot','빠른 보행','trot']"), "The pose test must include trotting.");
assert.ok(html.includes("if(pose==='flop')"), "Flop must have its own side-rest pose.");
assert.ok(html.includes("if(pose==='doze')"), "Dozing must have its own head nod.");
assert.ok(html.includes("if(pose==='shake')"), "Shaking must animate the full upper body.");

// KST is the single source of truth for the clock, routines and roaming destinations.
assert.ok(html.includes("function kstSecondsOfDay(now){var p=parts(now);return Number(p.hour)*3600+Number(p.minute)*60+Number(p.second);}"), "A shared KST seconds-of-day clock must drive all daily behavior.");
assert.ok(html.includes("var seconds=kstSecondsOfDay(now);"), "Ambient routines must use Korean Standard Time.");
assert.ok(!html.includes("var hour=now.getHours();"), "Ambient routines must not fall back to the visitor device's local timezone.");
assert.ok(html.includes("var second=kstSecondsOfDay(now);"), "Roaming destinations must use the same KST time source.");
assert.ok(html.includes("function clampDoriTarget(target){"), "Dori's movement target must stay within the walkable room bounds.");
assert.ok(html.includes("function keepActorSpacing(target,other,minDistance){"), "Dori must maintain spacing from companions and visitors.");
assert.ok(html.includes("if(friendIsHere)target=keepActorSpacing(target,friendBread,104);"), "The companion must participate in collision spacing.");
assert.ok(html.includes("var roamPhase=second%300;"), "Roaming route segments must align with the five-minute daily routine.");
assert.ok(html.includes("var step=Math.floor(roamPhase/15)%stops.length;"), "Walk destinations must change at the route segment boundary.");
assert.ok(html.includes("var lastMinuteKey = '';"), "Minute-based UI updates need a persistent KST minute key.");
assert.ok(html.includes("if(minuteKey!==lastMinuteKey){"), "Timeline/history updates must not depend on hitting second zero exactly.");
assert.ok(html.includes("function startRoutineTimer(){"), "The one-second routine timer must have an explicit lifecycle.");
assert.ok(html.includes("function stopRoutineTimer(){"), "The routine timer must be stoppable while the page is hidden.");
assert.ok(html.includes("if(document.hidden){stopRoutineTimer();return;}"), "A hidden Dori Life tab must stop its DOM update timer.");
assert.ok(!html.includes("  update();\n  window.setInterval(update,1000);"), "The clock must not leave an unconditional one-second timer running in the background.");
assert.ok(!html.includes("if(second===0){renderTimeline(now);renderActivityHistory(now);}"), "The drift-prone exact-second refresh must be removed.");
assert.ok(html.includes("var defById=Object.create(null);"), "The mesh rig must cache joint definitions for fast vertex transforms.");
assert.ok(html.includes("var w=v.weights[i],d=defById[w.id],b=bone[w.id];"), "Per-frame skinning must use constant-time joint lookups.");
assert.ok(!html.includes("defs.find(function(bd){return bd.id===w.id;})"), "The render loop must not linearly scan the skeleton for every vertex weight.");
assert.ok(html.includes("function scheduleLoop(){"), "The character renderer must expose a single gated frame scheduler.");
assert.ok(html.includes("if(rigFrame||!ready||failed||document.hidden)return;"), "Hidden tabs must not schedule another character animation frame.");
assert.ok(html.includes("if(rigFrame)cancelAnimationFrame(rigFrame);"), "An already scheduled mesh frame must be cancelled when the tab becomes hidden.");
assert.ok(html.includes("document.addEventListener('visibilitychange',onRigVisibilityChange);"), "The mesh renderer must suspend and resume with document visibility.");
assert.ok(html.includes("if(!document.hidden){lastFrame=0;scheduleLoop();}"), "A visible or restored page must restart the mesh from a fresh frame.");
assert.ok(html.includes("var lowPowerDevice=saveData||hardwareThreads<=4||(deviceMemory>0&&deviceMemory<=4);"), "The renderer must adapt to low-power devices.");
assert.ok(html.includes("var COLS=lowPowerDevice?28:36,ROWS=lowPowerDevice?32:40;"), "Low-power devices must use a lighter mesh.");
assert.ok(html.includes("if(!prefersReducedMotion)scheduleLoop();"), "The renderer must stop continuous motion for reduced-motion users.");
assert.ok(html.includes("if(prefersReducedMotion){"), "Movement tweens must respect reduced-motion preferences.");

// The skinning/render loop must keep executable statements outside line comments.
// A literal "\\n" inserted after // would comment out the animation call and pts assignment;
// the next triangle pass would then throw ReferenceError and permanently stop all motion.
const renderBlockStart = html.indexOf("// Subtle weight shifts, paw adjustments and dream twitches");
const renderBlockEnd = html.indexOf("ctx.clearRect(0,0,W,H);", renderBlockStart);
assert.ok(renderBlockStart >= 0 && renderBlockEnd > renderBlockStart, "Could not isolate the final mesh render block.");
const renderBlock = html.slice(renderBlockStart, renderBlockEnd);
assert.ok(renderBlock.includes("action.\\n") === false, "The mesh render block must not contain escaped pseudo-newlines.");
assert.ok(renderBlock.includes(`action.\n      applyLifeLegMotion(pose,t,isDoriMoving,isDoriTurning);\n      var pts=vertices.map(transformPoint);`), "Leg motion and vertex transforms must be executable statements on separate source lines.");


assert.ok(html.includes("var OBSERVED_LOG_KEY='doriLifeObservedLogV1';"), "The real-observation archive must have a versioned local storage key.");
assert.ok(html.includes("function recordObservedAction(state,evt,now)"), "The page must record displayed behavior transitions.");
assert.ok(html.includes("var OBSERVED_LOG_LIMIT=3000;"), "The local observer must retain a longer rolling history.");
assert.ok(html.includes('id="observedSyncButton"'), "Observation history must expose account sync status.");
assert.ok(html.includes('id="observedExportButton"'), "Observation history must support JSON backups.");
assert.ok(html.includes('id="observedImportButton"'), "Observation history must support JSON restore.");
assert.ok(html.includes("document.addEventListener('dori:cloud-sync-ready',renderObservationCloudStatus);"), "The observer must integrate with the shared Dori account sync.");
assert.ok(html.includes("schema:'dori-life-observations',version:1"), "Backups must use a versioned data schema.");
assert.ok(html.includes("function normalizeImportedObservation(row,cutoff){"), "Imported records must be normalized before merging.");
assert.ok(html.includes("parsed.records.length>10000"), "Imports must reject unreasonable record counts.");
assert.ok(html.includes("file.size>5*1024*1024"), "Imports must enforce a file-size limit.");
assert.ok(html.includes("door:'현관 앞'"), "Visitor behavior must have an accurate observation location.");
assert.ok(html.includes("recordObservedAction(state,evt,now||new Date());"), "The observer must attach to the rendered room state.");
assert.ok(html.includes("function closeObservedAction(endAt,shouldRender)"), "Observed intervals must be closed and persisted.");
assert.ok(html.includes("document.addEventListener('visibilitychange',function(){\n    if(document.hidden)closeObservedAction(Date.now());"), "Hidden-tab time must not be counted as observed activity.");
assert.ok(html.includes("window.addEventListener('pagehide',function(){closeObservedAction(Date.now());});"), "The final visible interval must be saved when leaving the page.");
assert.ok(html.includes("{x:440,y:438,s:.87},{x:555,y:444,s:.89}"), "The route must begin near the sofa and table rather than the centre only.");
assert.ok(html.includes("{x:910,y:438,s:.87},{x:1035,y:444,s:.84}"), "The route must extend to the far side of the room.");


assert.ok(html.includes('id="observedDailyChart"'), "The actual-observation archive must have a period-based chart.");
assert.ok(html.includes('id="observedLocationBars"'), "The actual-observation archive must include location duration analysis.");
assert.ok(html.includes('data-observed-range="180"'), "Actual observation history must support a 180-day range.");
assert.ok(html.includes("function observedLocationFor(state)"), "Actual observations must capture the rendered room location.");
assert.ok(html.includes("location:location,interaction:interaction"), "Each new observation must retain location and interaction metadata.");
assert.ok(html.includes("endLocation:observedLocationFor(null)"), "Closed observation intervals must retain their end location.");
assert.ok(html.includes("function addObservedDurationByKstDay(dailyTotals,row)"), "Observed intervals must be split across KST calendar days.");
assert.ok(html.includes("var dailyTotals=Object.create(null);"), "Observed durations must be grouped into independent date buckets.");
assert.ok(html.includes("var nextMidnight=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+1)-9*60*60*1000;"), "Daily observed duration boundaries must use KST midnight.");
assert.ok(html.includes("dailyBuckets.some(function(bucket){return bucket.ms>0;})"), "The actual-observation graph must have a clear empty state.");
assert.ok(html.includes(".observation-location-card,.observation-daily-card{grid-column:1/-1}"), "The observation charts must span the responsive panel.");
assert.ok(html.includes("예정 장면 변화 그래프"), "The generated schedule archive must identify its content as planned scenes.");
assert.ok(html.includes("실제 페이지 접속 시간이나 애니메이션 재생 여부를 저장한 기록이 아니며"), "The generated schedule archive must not be presented as actual observation.");

// Test the actual timezone helper against UTC instants, independent of the test machine's timezone.
const clockStart = html.indexOf("function parts(now)");
const clockEnd = html.indexOf("\n  function hash", clockStart);
assert.ok(clockStart >= 0 && clockEnd > clockStart, "Could not isolate the KST clock helpers.");
const clockContext = {
  partFormatter: new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  })
};
vm.runInNewContext(html.slice(clockStart, clockEnd), clockContext);
const midnightKst = vm.runInNewContext("kstSecondsOfDay(new Date('2026-11-14T15:00:00.000Z'))", clockContext);
const morningKst = vm.runInNewContext("kstSecondsOfDay(new Date('2026-11-15T00:30:00.000Z'))", clockContext);
assert.equal(midnightKst, 0, "15:00 UTC must be midnight in Korea.");
assert.equal(morningKst, 9 * 3600 + 30 * 60, "00:30 UTC must be 09:30 in Korea.");

// Execute the real seeded behavior director. Each cycle must be deterministic,
 // contiguous, fully occupied, and allowed to differ from adjacent dates/cycles.
const routineStart = html.indexOf("function buildRoutineCycle(now,base){");
const routineEnd = html.indexOf("\n  function eventTimestampToday", routineStart);
assert.ok(routineStart >= 0 && routineEnd > routineStart, "Could not isolate the seeded routine director.");
const routineClockStart = html.indexOf("function parts(now)");
const routineClockEnd = html.indexOf("\n  function formatMinute", routineClockStart);
assert.ok(routineClockStart >= 0 && routineClockEnd > routineClockStart, "Could not isolate the KST and deterministic seed helpers.");
const routineContext = {
  partFormatter: new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }),
  dateFormatter: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  })
};
vm.runInNewContext(html.slice(routineClockStart, routineClockEnd), routineContext);
const routineFactory = new Function(
  "kstSecondsOfDay", "dayKey", "hash", "rng",
  html.slice(routineStart, routineEnd) + "\nreturn {buildRoutineCycle,ambientRoutine};"
);
const routineApi = routineFactory(
  routineContext.kstSecondsOfDay,
  routineContext.dayKey,
  (value) => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  (seed) => {
    let state = seed >>> 0;
    return function() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
);
const baseRoutine = {title:"base",desc:"base",pose:"idle",tag:"base",icon:"🐾"};
const samples = [
  new Date("2026-11-25T00:00:00.000Z"),
  new Date("2026-11-25T00:05:00.000Z"),
  new Date("2026-11-25T00:10:00.000Z"),
  new Date("2026-11-26T00:00:00.000Z"),
  new Date("2026-11-25T15:00:00.000Z")
];
const routineSignatures = new Set();
for (const now of samples) {
  const first = routineApi.buildRoutineCycle(now, baseRoutine);
  const repeated = routineApi.buildRoutineCycle(now, baseRoutine);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(repeated)),
    "The same KST cycle must generate the same action plan.");
  assert.equal(first[0].start, 0, "Each routine must begin at the start of the five-minute block.");
  assert.equal(first[first.length - 1].end, 300, "Each routine must fill the complete five-minute block.");
  for (let i = 0; i < first.length; i++) {
    assert.ok(first[i].duration > 0, "Every routine action must have a positive duration.");
    if (i) assert.equal(first[i].start, first[i - 1].end, "Routine actions must be contiguous without gaps or overlaps.");
    assert.ok(first[i].state && supportedPoses.has(first[i].state.pose),
      "Every routine action must use a supported animated pose.");
  }
  for (let second = 0; second < 300; second++) {
    const state = routineApi.ambientRoutine(new Date(now.getTime() + second * 1000), baseRoutine);
    assert.ok(state && supportedPoses.has(state.pose), "Every second must have a supported visible action.");
  }
  routineSignatures.add(first.map((item) => item.state.pose + ":" + item.state.title).join("|"));
}
assert.ok(routineSignatures.size >= 4, "Routine choices must vary across days and five-minute cycles.");

// Test the real room-bound helpers for clipping and companion separation.
const routeStart = html.indexOf("function clampDoriTarget(target){");
const routeEnd = html.indexOf("\n  function updateDoriMovement", routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "Could not isolate room-bound helpers.");
const routeApi = new Function(html.slice(routeStart, routeEnd) + "\nreturn {clampDoriTarget,keepActorSpacing};")();
assert.deepEqual(
  JSON.parse(JSON.stringify(routeApi.clampDoriTarget({x:-100,y:900,s:3,key:"outside"}))),
  {x:330,y:462,s:.94,key:"outside"}
);
const separated = routeApi.keepActorSpacing(
  {x:500,y:432,s:.9,key:"target"},
  {_doriPosition:{x:500,y:432,s:.88},style:{opacity:"1"},getAttribute:()=> "0"},
  104
);
assert.ok(Math.hypot(separated.x - 500, separated.y - 432) >= 103.9,
  "Dori must maintain minimum spacing from an active companion.");

// Validate backup import normalization against malformed, future and oversized intervals.
const normalizeStart = html.indexOf("function normalizeImportedObservation(row,cutoff){");
const normalizeEnd = html.indexOf("\n  function closeObservedAction", normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart, "Could not isolate backup import validation.");
const normalizeContext = {
  dayKey: () => "2026-11-25",
  timeFormatter: {format: () => "09:00"}
};
const normalizeImportedObservation = new Function(
  "dayKey","timeFormatter",
  html.slice(normalizeStart,normalizeEnd)+"\nreturn normalizeImportedObservation;"
)(normalizeContext.dayKey,normalizeContext.timeFormatter);
const cutoff = Date.now() - 180 * 86400000;
const validBackup = normalizeImportedObservation({
  id:"safe-id",startedAt:cutoff+1000,endedAt:cutoff+61000,title:"A".repeat(200),
  category:"unknown",location:"<img src=x>",icon:"🐾"
},cutoff);
assert.ok(validBackup && validBackup.title.length === 100, "Imported titles must be length-limited.");
assert.equal(validBackup.category,"react", "Imported categories must be restricted to known values.");
assert.equal(normalizeImportedObservation({startedAt:10,endedAt:5},cutoff),null,
  "Negative or inverted intervals must be rejected.");
assert.equal(normalizeImportedObservation({startedAt:10,endedAt:10+86400001},cutoff),null,
  "Intervals longer than one day must be rejected.");
assert.equal(normalizeImportedObservation({startedAt:cutoff-86400000,endedAt:cutoff-86000000},cutoff),null,
  "Expired backup records must be rejected.");

console.log("DORI LIFE QA passed: " + bankKeys.length + " events, " + profiles.size + " choreography profiles, inline JavaScript parsed, all action poses supported.");console.log("DORI LIFE QA passed: " + bankKeys.length + " events, " + profiles.size + " choreography profiles, inline JavaScript parsed, all action poses supported.");
