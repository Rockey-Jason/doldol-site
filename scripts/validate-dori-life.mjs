import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const file = "dori-life.html";
const html = fs.readFileSync(file, "utf8");
const lines = html.split(/\r?\n/);

// Parse every inline script before the site is published.
const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/i.test(match[1]) && match[2].trim());
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

assert.equal(bankKeys.length, 75, "Unexpected event-bank size; review the test's parser.");
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
assert.ok(html.includes("var phase=seconds%300;"), "The daily routine must include visible action blocks.");
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
assert.ok(html.includes("if(phase<60){"), "The daytime home patrol must last a full minute.");
assert.ok(html.includes("var walkStep=Math.floor(phase/15)%4;"), "The home patrol must use four deliberate 15-second route segments.");
assert.ok(html.includes("var roamPhase=second%300;"), "Roaming route segments must align with the five-minute daily routine.");
assert.ok(html.includes("var step=Math.floor(roamPhase/15)%stops.length;"), "Walk destinations must change at the route segment boundary.");
assert.ok(html.includes("var lastMinuteKey = '';"), "Minute-based UI updates need a persistent KST minute key.");
assert.ok(html.includes("if(minuteKey!==lastMinuteKey){"), "Timeline/history updates must not depend on hitting second zero exactly.");
assert.ok(!html.includes("if(second===0){renderTimeline(now);renderActivityHistory(now);}"), "The drift-prone exact-second refresh must be removed.");
assert.ok(html.includes("var defById=Object.create(null);"), "The mesh rig must cache joint definitions for fast vertex transforms.");
assert.ok(html.includes("var w=v.weights[i],d=defById[w.id],b=bone[w.id];"), "Per-frame skinning must use constant-time joint lookups.");
assert.ok(!html.includes("defs.find(function(bd){return bd.id===w.id;})"), "The render loop must not linearly scan the skeleton for every vertex weight.");
assert.ok(html.includes("if(document.hidden){requestAnimationFrame(loop);return;}"), "The character renderer must pause expensive drawing while the tab is hidden.");

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

// Execute the real ambient routine across every second of its five-minute cycle.
// This catches accidental shadowing where a longer walk window removes later actions.
const routineStart = html.indexOf("function ambientRoutine(now,base){");
const routineEnd = html.indexOf("\n  function eventTimestampToday", routineStart);
assert.ok(routineStart >= 0 && routineEnd > routineStart, "Could not isolate the ambient routine.");
const ambientFactory = new Function("kstSecondsOfDay", html.slice(routineStart, routineEnd) + "\nreturn ambientRoutine;");
const ambientRoutine = ambientFactory((now) => now.kstSeconds);
const baseRoutine = { title: "base", desc: "base", pose: "idle", tag: "base", icon: "🐾" };
function poseAt(second) {
  return ambientRoutine({ kstSeconds: 9 * 3600 + second }, baseRoutine).pose;
}
for (let second = 0; second < 300; second++) {
  const pose = poseAt(second);
  let valid = false;
  if (second < 60) valid = pose === "walk" || pose === "explore";
  else if (second < 82) valid = pose === "sniff";
  else if (second < 112) valid = pose === "play";
  else if (second < 134) valid = pose === "water";
  else if (second < 158) valid = pose === "groom" || pose === "scratch";
  else if (second < 200) valid = ["flop", "sleep", "cuddle", "doze"].includes(pose);
  else if (second < 224) valid = pose === "wake" || pose === "stretch";
  else if (second < 254) valid = ["curious", "listen", "lookUp"].includes(pose);
  else if (second < 284) valid = ["sit", "beg", "wait"].includes(pose);
  else valid = pose === "happy";
  assert.ok(valid, "Unexpected or missing routine pose at " + second + " seconds: " + pose);
}

console.log("DORI LIFE QA passed: " + bankKeys.length + " events, " + profiles.size + " choreography profiles, inline JavaScript parsed, all action poses supported.");console.log("DORI LIFE QA passed: " + bankKeys.length + " events, " + profiles.size + " choreography profiles, inline JavaScript parsed, all action poses supported.");
