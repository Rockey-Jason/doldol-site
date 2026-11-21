import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = process.cwd();
const frameSource = fs.readFileSync("js/dori-profile-frame.js", "utf8");
const frameCss = fs.readFileSync("css/dori-profile-frame.css", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const settings = fs.readFileSync("settings.html", "utf8");
const doriLife = fs.readFileSync("dori-life.html", "utf8");
const rockeyGame = fs.readFileSync("rockey-client/src/core/Game.ts", "utf8");

// Execute the real shared frame module with small DOM-compatible test doubles.
const executableFrameSource = frameSource.replace(/\bexport\s+(?=function\s)/g, "");
const context = vm.createContext({});
vm.runInContext(
  executableFrameSource +
    "\nglobalThis.frameApi = { applyDoriProfileFrame, getDoriProfileFrameAsset, getDoriVipProfileTier };",
  context,
  { filename: "js/dori-profile-frame.js" }
);
const api = context.frameApi;

function makeClassList() {
  const values = new Set();
  return {
    toggle(name, force) {
      const enabled = Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
    contains(name) { return values.has(name); }
  };
}

function makeElement({ wrapper = false, parentElement = null } = {}) {
  const variables = Object.create(null);
  return {
    dataset: {},
    classList: makeClassList(),
    parentElement,
    matches(selector) { return wrapper && selector === ".profile-image-wrapper"; },
    style: { setProperty(name, value) { variables[name] = value; }, values: variables }
  };
}

const settingsWrapper = makeElement({ wrapper: true });
const custom = api.applyDoriProfileFrame(settingsWrapper, {
  item_code: "FRAME_DORONIUM",
  item_name: "도로늄 프레임"
}, 10);
assert.equal(custom.kind, "custom");
assert.equal(custom.asset, "assets/dori-items/FRAME_DORONIUM.svg");
assert.equal(settingsWrapper.classList.contains("has-profile-frame"), true);
assert.equal(settingsWrapper.classList.contains("profile-frame-equipped"), true);
assert.equal(settingsWrapper.classList.contains("profile-vip-frame"), false);
assert.equal(settingsWrapper.dataset.profileFrameCode, "FRAME_DORONIUM");
assert.equal(settingsWrapper.dataset.profileFrameName, "도로늄 프레임");
assert.equal(settingsWrapper.style.values["--profile-frame-art"], 'url("assets/dori-items/FRAME_DORONIUM.svg")');

const vip = api.applyDoriProfileFrame(settingsWrapper, null, 5);
assert.equal(vip.kind, "vip");
assert.equal(vip.tier, "elite");
assert.equal(settingsWrapper.classList.contains("has-profile-frame"), true);
assert.equal(settingsWrapper.classList.contains("profile-frame-equipped"), false);
assert.equal(settingsWrapper.classList.contains("profile-vip-frame"), true);
assert.equal("profileFrameCode" in settingsWrapper.dataset, false);
assert.equal("profileFrameName" in settingsWrapper.dataset, false);
assert.equal(settingsWrapper.dataset.vipTier, "elite");
assert.equal(settingsWrapper.style.values["--profile-frame-art"], "none");

const plain = api.applyDoriProfileFrame(settingsWrapper, null, 1);
assert.equal(plain.kind, "default");
assert.equal(settingsWrapper.classList.contains("has-profile-frame"), false);
assert.equal(settingsWrapper.classList.contains("profile-frame-equipped"), false);
assert.equal(settingsWrapper.classList.contains("profile-vip-frame"), false);
assert.equal("vipTier" in settingsWrapper.dataset, false);

const fixedHost = makeElement({ wrapper: true });
const fixedOverlay = makeElement({ parentElement: fixedHost });
const fixed = api.applyDoriProfileFrame(fixedOverlay, "FRAME_MEGA_GALAXY", 1);
assert.equal(fixed.kind, "custom");
assert.equal(fixedHost.classList.contains("profile-frame-equipped"), true);
assert.equal(fixedOverlay.dataset.frame, "FRAME_MEGA_GALAXY");

const basic = api.applyDoriProfileFrame(fixedOverlay, null, 2);
assert.equal(basic.kind, "vip");
assert.equal(basic.tier, "basic");
assert.equal(fixedHost.classList.contains("profile-frame-equipped"), false);
assert.equal(fixedHost.classList.contains("profile-vip-frame"), true);
assert.equal(fixedOverlay.dataset.vipTier, "basic");

assert.equal(api.getDoriVipProfileTier(8), "royal");
assert.equal(api.getDoriVipProfileTier(5), "elite");
assert.equal(api.getDoriVipProfileTier(2), "basic");
assert.equal(api.getDoriVipProfileTier(1), null);
assert.equal(api.applyDoriProfileFrame(null, null, 1).kind, "default");

// Both pages must use the same single geometry source.
assert.ok(home.includes("css/dori-profile-frame.css?v=20261114-frame-geometry-1"),
  "The main page must load the shared profile frame stylesheet.");
assert.ok(settings.includes("css/dori-profile-frame.css?v=20261114-frame-geometry-1"),
  "Settings must load the same shared profile frame stylesheet.");
assert.ok(frameCss.includes("inset:-12.5%"), "The shared art overlay must use the calibrated frame size.");
assert.ok(frameCss.includes("#돌이프로필프레임[data-vip-tier]"), "The fixed profile must draw its VIP ring.");
assert.ok(frameCss.includes(".profile-image-wrapper.has-profile-frame[data-vip-tier]::before"),
  "The Settings profile must draw the same VIP ring.");
assert.ok(frameCss.includes(".profile-image-wrapper.has-profile-frame::after{content:none!important;animation:none!important}"),
  "Equipped artwork must not be doubled by the generic avatar halo.");
assert.ok(frameCss.includes("@media(prefers-reduced-motion:reduce)"),
  "VIP frame motion must respect reduced-motion preferences.");

// Dori Life: a hidden page must cancel its pending frame and resume only when visible.
assert.ok(doriLife.includes("if(rigFrame||!ready||failed||document.hidden)return;"),
  "Dori Life must not enqueue animation frames while hidden.");
assert.ok(doriLife.includes("if(rigFrame)cancelAnimationFrame(rigFrame);"),
  "Dori Life must cancel a pending frame when hidden.");
assert.ok(doriLife.includes("document.addEventListener('visibilitychange',onRigVisibilityChange);"),
  "Dori Life must resume the rig on visibility changes.");
assert.ok(!doriLife.includes("if(document.hidden){requestAnimationFrame(loop);return;}"),
  "Dori Life must not keep a hidden-tab animation loop alive.");

// ROCKEY: stop the render loop when hidden; restart cleanly when shown again.
const visibilityStart = rockeyGame.indexOf("const onVisibilityChange = () => {");
const visibilityEnd = rockeyGame.indexOf("const onWindowBlur", visibilityStart);
assert.ok(visibilityStart >= 0 && visibilityEnd > visibilityStart,
  "Could not isolate ROCKEY's visibility handler.");
const visibilityHandler = rockeyGame.slice(visibilityStart, visibilityEnd);
assert.ok(visibilityHandler.includes("if (raf) cancelAnimationFrame(raf);"),
  "ROCKEY must cancel a pending render frame when hidden.");
assert.ok(visibilityHandler.includes("if (!raf && !disposed) raf = requestAnimationFrame(frame);"),
  "ROCKEY must restart its render loop when the page becomes visible.");
const frameStart = rockeyGame.indexOf("function frame(now: number) {");
const frameEnd = rockeyGame.indexOf("raf = requestAnimationFrame(frame);", frameStart);
assert.ok(frameStart >= 0 && frameEnd > frameStart, "Could not isolate ROCKEY's frame loop.");
const frameHandler = rockeyGame.slice(frameStart, frameEnd);
assert.ok(frameHandler.includes("raf = 0;") && frameHandler.includes("if (document.hidden) {") &&
  frameHandler.includes("previous = now;\n      return;"),
  "ROCKEY's hidden frame callback must return without scheduling another frame.");

console.log("Shared profile frame + hidden-tab lifecycle checks passed.");
