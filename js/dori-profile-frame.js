// Dori Profile Frame — the only renderer and equipment-state adapter.
const FRAME_VISUALS = [
  { test: /DORONUM|DORONIUM/, asset: "assets/dori-items/FRAME_DORONIUM.svg", color: "#5df4ff", glow: "rgba(93,244,255,.55)" },
  { test: /2026[-_]?10|EXPLORER/, asset: "assets/dori-items/FRAME_2026_10_EXPLORER.svg", color: "#9c7bff", glow: "rgba(156,123,255,.52)" },
  { test: /2026[-_]?11|AURORA/, asset: "assets/dori-items/FRAME_2026_11_AURORA.svg", color: "#65d9f5", glow: "rgba(101,217,245,.5)" },
  { test: /MEGA|GALAXY|MILESTONE|ROYAL|CROWN|GOLD/, asset: "assets/dori-items/FRAME_MEGA_GALAXY.svg", color: "#f4c86c", glow: "rgba(244,200,108,.55)" },
  { test: /DIAMOND|ICE|BLUE/, asset: "assets/dori-items/FRAME_2026_11_AURORA.svg", color: "#85dcff", glow: "rgba(90,190,255,.58)" }
];
const DEFAULT_FRAME = { asset: "assets/dori-items/FRAME_GENERIC.svg", color: "#b8c6d9", glow: "rgba(184,198,217,.42)" };
const VIP_FRAME = {
  basic: { color: "#67ddff", glow: "rgba(64,205,255,.32)" },
  elite: { color: "#c39aff", glow: "rgba(172,108,255,.35)" },
  royal: { color: "#ffda79", glow: "rgba(255,190,66,.36)" }
};

function readFrame(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
  }
  return { item_code: raw };
}
function frameKey(frame) {
  const value = readFrame(frame);
  return String(value?.item_code || value?.code || value?.name || "").toUpperCase();
}
function visualFor(frame) {
  const key = frameKey(frame);
  return FRAME_VISUALS.find(entry => entry.test.test(key)) || DEFAULT_FRAME;
}
export function getDoriProfileFrameAsset(frame) { return visualFor(frame).asset; }
export function getDoriProfileFrameColor(frame) { return visualFor(frame).color; }
export function getDoriVipProfileTier(level) {
  const value = Number(level) || 1;
  if (value >= 8) return "royal";
  if (value >= 5) return "elite";
  if (value >= 2) return "basic";
  return null;
}
export function applyDoriProfileFrame(target, frame, userLevel = 1) {
  if (!target) return { kind: "default", code: "", tier: null };
  const normalized = readFrame(frame);
  const code = frameKey(normalized);
  const tier = code ? null : getDoriVipProfileTier(userLevel);
  const visual = code ? visualFor(normalized) : (VIP_FRAME[tier] || null);
  const kind = code ? "custom" : tier ? "vip" : "default";
  const host = target.matches?.(".profile-image-wrapper")
    ? target
    : target.parentElement;

  target.classList.toggle("has-profile-frame", kind !== "default");
  host?.classList.toggle("profile-frame-equipped", kind === "custom");
  host?.classList.toggle("profile-vip-frame", kind === "vip");

  if (code) {
    target.dataset.frame = code;
    target.dataset.profileFrameCode = code;
  } else {
    delete target.dataset.frame;
    delete target.dataset.profileFrameCode;
  }
  if (tier) target.dataset.vipTier = tier;
  else delete target.dataset.vipTier;

  target.style.setProperty("--profile-frame-art", code ? 'url("' + visual.asset + '")' : "none");
  target.style.setProperty("--profile-frame-color", visual?.color || "rgba(143,126,255,.55)");
  target.style.setProperty("--profile-frame-glow", visual?.glow || "rgba(143,126,255,.35)");

  const name = normalized && typeof normalized === "object" ? normalized.item_name || normalized.name : "";
  if (name) target.dataset.profileFrameName = String(name);
  else delete target.dataset.profileFrameName;

  return { kind, code, tier, asset: code ? visual.asset : null, color: visual?.color || null };
}
