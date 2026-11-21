import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules", "_site", "dist", "build", "coverage"]);
const errors = [];
const warnings = [];
const stats = { html: 0, scripts: 0, stylesheets: 0, json: 0, inlineScripts: 0, tests: 0 };

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function getAttr(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp("(?:^|\\s)" + escaped + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function checkNodeSource(source, label, module = false) {
  if (module) {
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], {
      input: source, encoding: "utf8", cwd: ROOT
    });
    if (result.status !== 0) {
      errors.push(label + ": module syntax error\n" + (result.stderr || result.stdout || "node --check failed"));
    }
  } else {
    try {
      new vm.Script(source, { filename: label });
    } catch (error) {
      errors.push(label + ": JavaScript syntax error\n" + (error?.stack || String(error)));
    }
  }
}

function resolveLocalAsset(fromFile, rawValue, label) {
  const value = String(rawValue || "").trim();
  if (!value || value.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return;
  if (/[{}<>]/.test(value) || value.includes("$(") || value.includes("${") || value.includes(" + ")) return;
  let pathname = value.split("#", 1)[0].split("?", 1)[0];
  if (!pathname) return;
  try { pathname = decodeURIComponent(pathname); } catch { errors.push(label + ": malformed URL encoding in " + value); return; }
  pathname = pathname.replace(/\\/g, "/");
  let candidate;
  if (pathname.startsWith("/")) {
    pathname = pathname.replace(/^\/+/, "");
    if (pathname.startsWith("doldol-site/")) pathname = pathname.slice("doldol-site/".length);
    candidate = path.resolve(ROOT, pathname);
    if (!fs.existsSync(candidate)) {
      const pageRelative = path.resolve(path.dirname(fromFile), pathname);
      if (fs.existsSync(pageRelative)) candidate = pageRelative;
    }
  } else {
    candidate = path.resolve(path.dirname(fromFile), pathname);
  }
  if (!candidate.startsWith(ROOT + path.sep) && candidate !== ROOT) {
    errors.push(label + ": local path escapes repository: " + value);
    return;
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) candidate = path.join(candidate, "index.html");
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    errors.push(label + ": missing local asset " + value + " (resolved to " + relative(candidate) + ")");
  }
}

const files = walk(ROOT);
const htmlFiles = files.filter(file => /\.html?$/i.test(file));
const jsFiles = files.filter(file => /\.js$/i.test(file) && !relative(file).startsWith("rockey/assets/") && relative(file) !== "js/supabase.min.js");
const cssFiles = files.filter(file => /\.css$/i.test(file) && !relative(file).startsWith("rockey/assets/"));
const jsonFiles = files.filter(file => /\.json$/i.test(file));
const tests = files.filter(file => /\.test\.mjs$/i.test(file) && relative(file).startsWith("doronium-factory/"));

for (const file of htmlFiles) {
  const name = relative(file);
  const html = fs.readFileSync(file, "utf8");
  stats.html++;

  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    const attrs = match[1] || "";
    const source = match[2] || "";
    if (getAttr(attrs, "src") || !source.trim()) continue;
    const type = (getAttr(attrs, "type") || "").trim().toLowerCase();
    if (type && !["module", "text/javascript", "application/javascript", "text/ecmascript", "application/ecmascript"].includes(type)) continue;
    checkNodeSource(source, name + ":inline-script-" + (++stats.inlineScripts), type === "module");
  }

  const resourceTags = /<(script|img|iframe|source|video|audio|track|input|link|object)\b([^>]*)>/gi;
  for (const match of html.matchAll(resourceTags)) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || "";
    let attrName = null;
    if (["script", "img", "iframe", "source", "audio", "track"].includes(tag)) attrName = "src";
    if (tag === "video") attrName = "src";
    if (tag === "object") attrName = "data";
    if (tag === "input" && (getAttr(attrs, "type") || "").toLowerCase() === "image") attrName = "src";
    if (tag === "link") {
      const rel = (getAttr(attrs, "rel") || "").toLowerCase().split(/\s+/);
      if (rel.some(value => ["stylesheet", "icon", "manifest", "apple-touch-icon", "mask-icon", "preload", "modulepreload"].includes(value))) attrName = "href";
    }
    if (attrName) {
      const value = getAttr(attrs, attrName);
      if (value !== null) resolveLocalAsset(file, value, name);
    }
    if (tag === "video") {
      const poster = getAttr(attrs, "poster");
      if (poster !== null) resolveLocalAsset(file, poster, name);
    }
  }

  const markupOnly = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  const ids = new Map();
  for (const match of markupOnly.matchAll(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)) {
    const id = match[1] ?? match[2] ?? match[3];
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  for (const [id, count] of ids) {
    if (count > 1) warnings.push(name + ": duplicate static id '" + id + "' (" + count + " occurrences)");
  }
}


/* Core product pages must stay connected to the shared Dori UI layer.
   Full-screen game runtimes with intentionally independent art direction are excluded. */
const sharedUiPages = [
  "index.html",
  "dori-life.html",
  "dori-throw.html",
  "dori-full-throttle.html",
  "gamepage.html",
  "dori-bank.html",
  "doldolstock.html",
  "readingrockeynews.html",
  "dori-pass.html",
  "settings.html",
  "Randombox.html",
  "dori-issues.html",
  "dori-feedback.html",
  "dori-ai.html",
  "dori-world/index.html"
];
for (const page of sharedUiPages) {
  const absolute = path.resolve(ROOT, page);
  if (!fs.existsSync(absolute)) {
    errors.push("Shared UI page is missing: " + page);
    continue;
  }
  const html = fs.readFileSync(absolute, "utf8");
  const hasSharedUi = ["doldol-theme.css", "dori-foundation.css", "doldol-theme.js"]
    .some(token => html.toLowerCase().includes(token));
  if (!hasSharedUi) {
    errors.push(page + ": missing the shared Dori UI foundation or transition engine");
  }
}

/* Account switches must rehydrate the main page from the new session.
   This protects profile, coin balance, achievements, frames, and admin visibility
   from retaining data loaded for the previous account. */
const mainIndex = fs.readFileSync(path.resolve(ROOT, "index.html"), "utf8");
const accountSwitchChecks = [
  ["initial auth session tracking", 'if (event === "INITIAL_SESSION")'],
  ["signed-in account identity comparison", "if (마지막인증사용자ID !== 새사용자ID)"],
  ["fresh account rehydration", "window.location.reload();"],
  ["logout clears remembered account", "마지막인증사용자ID = null;"]
];
for (const [label, token] of accountSwitchChecks) {
  if (!mainIndex.includes(token)) {
    errors.push("index.html: missing account-switch safety invariant: " + label);
  }
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8", cwd: ROOT });
  if (result.status !== 0) {
    errors.push(relative(file) + ": JavaScript syntax error\n" + (result.stderr || result.stdout || "node --check failed"));
  } else {
    stats.scripts++;
  }
}

for (const file of cssFiles) {
  const name = relative(file);
  const css = fs.readFileSync(file, "utf8");
  stats.stylesheets++;
  const urls = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  for (const match of css.matchAll(urls)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!value || /^var\(/i.test(value)) continue;
    resolveLocalAsset(file, value, name);
  }
}

for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
    stats.json++;
  } catch (error) {
    errors.push(relative(file) + ": invalid JSON: " + error.message);
  }
}

if (tests.length) {
  const result = spawnSync(process.execPath, ["--test", ...tests], { encoding: "utf8", cwd: ROOT });
  stats.tests = tests.length;
  if (result.status !== 0) errors.push("Doronium Factory unit tests failed\n" + (result.stdout || "") + (result.stderr || ""));
}

console.log("DORI SITE QUALITY CHECK");
console.log(JSON.stringify(stats, null, 2));
for (const warning of warnings) console.warn("WARN " + warning);
for (const error of errors) console.error("ERROR " + error);
if (errors.length) {
  console.error("\nQuality check failed with " + errors.length + " error(s).");
  process.exitCode = 1;
} else {
  console.log("\nStatic site checks passed. Warnings are advisory and do not block publication.");
}
