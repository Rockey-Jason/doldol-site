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
assert.ok(html.includes("var isDoriMoving=!!(doriActor&&doriActor._isMoving&&!doriActor._isTurning)"));
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
assert.ok(html.includes("var demoIndex=Math.floor(performance.now()/6500)%demo.length;"), "Motion test must start at walking for immediate review.");
assert.ok(html.includes("el._gaitPhase=ease*el._gaitCycles*Math.PI*2;"), "Gait phase must stay synchronized with travel progress.");
assert.ok(html.includes("function gaitFootStep(phase,stride)"), "A planted stance and lifted swing foot cycle must be defined.");
assert.ok(html.includes("function animateGaitLeg(prefix,phase,stride,amplitude)"), "Each leg must be individually articulated.");
assert.ok(html.includes("animateGaitLeg('frontNear',gaitPhase,gaitStride,.92)"), "Walking must move the near front leg.");
assert.ok(html.includes("animateGaitLeg('hindFar',gaitPhase+Math.PI*.5,gaitStride*.92,.82)"), "Walking must move the rear far leg.");
assert.ok(html.includes("animateGaitLeg('hindNear',gaitPhase+Math.PI*1.5,gaitStride*.92,.82)"), "Walking must move the rear near leg.");
assert.ok(html.includes("['walk','실제 보행','walk']"), "The pose test must include walking.");
assert.ok(html.includes("['trot','빠른 보행','trot']"), "The pose test must include trotting.");
assert.ok(html.includes("if(pose==='flop')"), "Flop must have its own side-rest pose.");
assert.ok(html.includes("if(pose==='doze')"), "Dozing must have its own head nod.");
assert.ok(html.includes("if(pose==='shake')"), "Shaking must animate the full upper body.");

console.log("DORI LIFE QA passed: " + bankKeys.length + " events, " + profiles.size + " choreography profiles, inline JavaScript parsed, all action poses supported.");
