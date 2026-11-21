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
const factory = fs.readFileSync("doronium-factory/factory.js", "utf8");
const factoryCss = fs.readFileSync("doronium-factory/factory.css", "utf8");
const factoryIndex = fs.readFileSync("doronium-factory/index.html", "utf8");

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
assert.ok(!home.includes("#돌이프로필프레임[data-frame]{"),
  "The main page must not keep a duplicate custom-frame renderer.");
assert.ok(!home.includes("#돌이프로필고정틀.profile-frame-equipped > #돌이사진{"),
  "The main page must not keep a duplicate equipped-frame border rule.");
assert.ok(!settings.includes(".profile-image-wrapper.has-profile-frame::before {"),
  "Settings must not keep a second profile artwork renderer.");
assert.ok(!settings.includes(".profile-image-wrapper.has-profile-frame #돌이사진 {"),
  "Settings must not keep a duplicate equipped-photo border rule.");
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

// Doronium Factory: pause the world render/simulation frame loop while hidden.
assert.ok(factory.includes("function scheduleWorldFrame(){\n if(worldFrameHandle||document.hidden)return;"),
  "The factory must gate its render loop behind visibility.");
assert.ok(factory.includes("if(worldFrameHandle)cancelAnimationFrame(worldFrameHandle);"),
  "The factory must cancel its pending frame when hidden.");
assert.ok(factory.includes('document.addEventListener("visibilitychange",onFactoryVisibilityChange);'),
  "The factory must resume from a single visibility lifecycle handler.");
const factoryFrameStart = factory.indexOf("function animationFrame(time){");
const factoryFrameEnd = factory.indexOf("function boot(){", factoryFrameStart);
assert.ok(factoryFrameStart >= 0 && factoryFrameEnd > factoryFrameStart,
  "Could not isolate the factory animation loop.");
const factoryFrame = factory.slice(factoryFrameStart, factoryFrameEnd);
assert.ok(factoryFrame.includes("worldFrameHandle=0;") && factoryFrame.includes("if(document.hidden)return;") &&
  factoryFrame.includes("scheduleWorldFrame();"),
  "The factory frame callback must stop while hidden and use the single scheduler.");

// Bring the factory typography onto the shared Dori font instead of downloading two extra font families.
assert.ok(factoryCss.includes('font-family:"HancomMalrangmalrang",sans-serif'),
  "The factory must use the shared Dori font family.");
assert.ok(factoryCss.includes('#game-root,#game-root *{font-family:"HancomMalrangmalrang",sans-serif!important;font-weight:400!important}'),
  "All factory text must use the shared regular-weight font only.");
assert.ok(factoryCss.includes('font-weight:400;font-display:swap'),
  "The factory must load the regular Hancom font asset.");
assert.ok(!factoryIndex.includes("fonts.googleapis.com/css2?family=Inter"),
  "The factory must not download its separate Inter/Noto font families.");
assert.ok(factoryIndex.includes('href="./factory.css?v=9"'),
  "The updated factory stylesheet must use a fresh cache version.");
assert.ok(factoryIndex.includes('src="./factory.js?v=44"'),
  "The updated factory controller must use a fresh cache version.");
assert.ok(factoryIndex.includes('rel="preconnect" href="https://cdn.jsdelivr.net"'),
  "The factory must warm the shared font CDN connection.");

console.log("Factory hidden-tab lifecycle + shared typography checks passed.");

