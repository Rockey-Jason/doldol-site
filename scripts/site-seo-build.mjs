import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://rockey-jason.github.io/doldol-site/";
const rootArg = process.argv.indexOf("--root");
const SITE_ROOT = path.resolve(rootArg >= 0 ? (process.argv[rootArg + 1] || "_site") : process.cwd());
const CHECK_ONLY = process.argv.includes("--check");
const ERRORS = [];

const PRIVATE_ROUTES = [
  "login.html",
  "signin.html",
  "reset-password.html",
  "settings.html",
  "fixingsettings.html",
  "dori-bank-admin.html",
  "dori-central-bank-admin.html"
];

const DESCRIPTION_FALLBACKS = {
  "daily-missions.html": "돌이사이트의 일일 미션 진행 상황과 보상 정보를 확인할 수 있는 페이지입니다.",
  "doldolcoin.html": "돌돌코인과 돌이사이트에서 사용하는 가상 경제 콘텐츠에 관한 안내를 확인하세요.",
  "doldolcoinmart.html": "돌돌코인 상점에서 제공되는 아이템과 혜택, 기존 구매 정보를 확인하세요.",
  "dori-life.html": "Dori Life에서 돌이의 24시간 생활과 일상 활동, 생활 기록을 확인하세요.",
  "dori-pass.html": "돌이 패스의 진행 현황과 보상 정보, 기존 활동 콘텐츠를 확인하세요.",
  "rockey-clicker.html": "ROCKEY CLICKER의 기존 플레이 화면과 관련 콘텐츠를 확인하세요.",
  "rockey-time-attack.html": "로키 타임 어택의 진행 방식과 기존 도전 콘텐츠를 확인하세요."
};

function fail(message) {
  ERRORS.push(message);
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function extractTitle(html, relativePath) {
  const raw = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || "";
  const title = raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!title) fail(relativePath + ": <title> is missing or empty");
  return title;
}

function extractMeta(html, keyName, keyValue) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const tag = tags.find(value => (readAttribute(value, keyName) || "").toLowerCase() === keyValue.toLowerCase());
  return tag ? readAttribute(tag, "content") : null;
}

function upsertMeta(html, keyName, keyValue, content) {
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd < 0) throw new Error("HTML is missing </head>");
  const head = html.slice(0, headEnd);
  const suffix = html.slice(headEnd);
  const tags = [...head.matchAll(/<meta\b[^>]*>/gi)]
    .filter(match => (readAttribute(match[0], keyName) || "").toLowerCase() === keyValue.toLowerCase());
  const tag = '<meta ' + keyName + '="' + escapeAttribute(keyValue) +
    '" content="' + escapeAttribute(content) + '">';
  let updated = head;
  if (tags.length) {
    updated = updated.replace(tags[0][0], tag);
    for (const duplicate of tags.slice(1)) updated = updated.replace(duplicate[0], "");
  } else {
    updated += "\n" + tag + "\n";
  }
  return updated + suffix;
}

function upsertCanonical(html, canonical) {
  const tag = '<link rel="canonical" href="' + escapeAttribute(canonical) + '">';
  const regex = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi;
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace(/<\/head\s*>/i, tag + "\n</head>");
}

function addWebPageSchema(html, title, canonical, description) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i);
  if (!head) throw new Error("HTML has no head");
  const existing = [...head[1].matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  for (const item of existing) {
    try {
      const data = JSON.parse(item[1]);
      if (data && data["@type"] === "WebPage") return html;
    } catch {
      // Leave unrelated or malformed existing JSON-LD unchanged.
    }
  }
  const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] || "ko";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "url": canonical,
    "description": description,
    "inLanguage": lang,
    "isPartOf": { "@type": "WebSite", "name": "돌이사이트", "url": BASE_URL }
  };
  const json = JSON.stringify(schema).replaceAll("<", "\\u003c");
  return html.replace(/<\/head\s*>/i,
    '<script type="application/ld+json">' + json + '</script>\n</head>');
}

function routeToFile(loc) {
  const url = new URL(loc);
  const base = new URL(BASE_URL);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
    throw new Error("Sitemap URL is outside the canonical site: " + loc);
  }
  let relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const file = path.resolve(SITE_ROOT, relative);
  if (file !== SITE_ROOT && !file.startsWith(SITE_ROOT + path.sep)) {
    throw new Error("Sitemap URL escapes site root: " + loc);
  }
  return { relative: relative.split(path.sep).join("/"), file };
}

function normalizePublicPage(html, relative, canonical) {
  const title = extractTitle(html, relative);
  let description = extractMeta(html, "name", "description");
  if (!description || !description.trim()) description = DESCRIPTION_FALLBACKS[relative] || "";
  if (!description) fail(relative + ": no description and no fallback description are defined");
  if (description.length > 300) fail(relative + ": description is too long (" + description.length + " characters)");

  let output = html;
  output = upsertMeta(output, "name", "description", description);
  output = upsertMeta(output, "name", "robots", "index,follow,max-image-preview:large");
  output = upsertMeta(output, "name", "googlebot", "index,follow,max-image-preview:large");
  output = upsertMeta(output, "property", "og:type", "website");
  output = upsertMeta(output, "property", "og:site_name", "돌이사이트");
  output = upsertMeta(output, "property", "og:title", title);
  output = upsertMeta(output, "property", "og:description", description);
  output = upsertMeta(output, "property", "og:url", canonical);
  output = upsertMeta(output, "property", "og:locale", "ko_KR");
  output = upsertMeta(output, "name", "twitter:card", "summary");
  output = upsertMeta(output, "name", "twitter:title", title);
  output = upsertMeta(output, "name", "twitter:description", description);
  output = upsertMeta(output, "name", "twitter:image:alt", title);
  output = upsertCanonical(output, canonical);
  output = addWebPageSchema(output, title, canonical, description);
  return output;
}

function normalizePrivatePage(html, relative) {
  if (!/<head\b/i.test(html)) throw new Error(relative + ": private page has no head");
  let output = upsertMeta(html, "name", "robots", "noindex,nofollow,noarchive");
  output = upsertMeta(output, "name", "googlebot", "noindex,nofollow,noarchive");
  return output;
}

function validatePublicPage(html, relative, canonical) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim();
  const description = extractMeta(html, "name", "description");
  const robots = extractMeta(html, "name", "robots");
  const canonicalTag = html.match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i)?.[0];
  if (!title) fail(relative + ": output title missing");
  if (!description || description.length < 20) fail(relative + ": output description is missing or too short");
  if (!robots || robots.toLowerCase().includes("noindex") || !robots.toLowerCase().includes("index")) {
    fail(relative + ": public page robots directive is missing or blocks indexing");
  }
  if (!canonicalTag || readAttribute(canonicalTag, "href") !== canonical) {
    fail(relative + ": canonical URL does not match sitemap");
  }
  let hasWebPageSchema = false;
  const schemaScripts = html.matchAll(/<script\\b[^>]*type\\s*=\\s*["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script\\s*>/gi);
  for (const match of schemaScripts) {
    try {
      const schema = JSON.parse(match[1]);
      const types = Array.isArray(schema?.["@type"]) ? schema["@type"] : [schema?.["@type"]];
      if (types.includes("WebPage")) hasWebPageSchema = true;
    } catch {
      // Ignore unrelated JSON-LD blocks that are not valid WebPage data.
    }
  }
  if (!hasWebPageSchema) fail(relative + ": WebPage structured data is missing");
}

function validatePrivatePage(html, relative) {
  const robots = extractMeta(html, "name", "robots");
  const googlebot = extractMeta(html, "name", "googlebot");
  if (!robots || !robots.toLowerCase().includes("noindex")) {
    fail(relative + ": private page must have noindex");
  }
  if (!googlebot || !googlebot.toLowerCase().includes("noindex")) {
    fail(relative + ": private page must have googlebot noindex");
  }
}

function run() {
  const sitemapFile = path.join(SITE_ROOT, "sitemap.xml");
  const robotsFile = path.join(SITE_ROOT, "robots.txt");
  if (!fs.existsSync(sitemapFile)) throw new Error("sitemap.xml is missing");
  if (!fs.existsSync(robotsFile)) throw new Error("robots.txt is missing");
  const sitemap = fs.readFileSync(sitemapFile, "utf8");
  const robots = fs.readFileSync(robotsFile, "utf8");
  if (!robots.includes("User-agent: *") || !robots.includes("Allow: /")) {
    fail("robots.txt must allow public crawling");
  }
  if (!robots.includes(BASE_URL + "sitemap.xml")) fail("robots.txt must declare the canonical sitemap URL");

  const urls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1].trim());
  if (!urls.length) fail("sitemap.xml contains no <loc> URLs");
  if (new Set(urls).size !== urls.length) fail("sitemap.xml contains duplicate URLs");

  let publicCount = 0;
  for (const loc of urls) {
    try {
      const { relative, file } = routeToFile(loc);
      if (!fs.existsSync(file)) {
        fail("Sitemap route does not resolve to a file: " + loc + " (" + relative + ")");
        continue;
      }
      const original = fs.readFileSync(file, "utf8");
      const normalized = normalizePublicPage(original, relative, loc);
      validatePublicPage(normalized, relative, loc);
      if (!CHECK_ONLY && normalized !== original) fs.writeFileSync(file, normalized, "utf8");
      publicCount++;
    } catch (error) {
      fail(String(error));
    }
  }

  for (const relative of PRIVATE_ROUTES) {
    const file = path.join(SITE_ROOT, relative);
    if (!fs.existsSync(file)) {
      fail("Private route is missing: " + relative);
      continue;
    }
    const original = fs.readFileSync(file, "utf8");
    const normalized = normalizePrivatePage(original, relative);
    validatePrivatePage(normalized, relative);
    if (!CHECK_ONLY && normalized !== original) fs.writeFileSync(file, normalized, "utf8");
  }

  if (ERRORS.length) {
    for (const error of ERRORS) console.error("SEO ERROR " + error);
    throw new Error("SEO validation failed with " + ERRORS.length + " error(s)");
  }

  console.log("DORI SITE SEO " + (CHECK_ONLY ? "CHECK" : "BUILD") + " PASSED");
  console.log("Public sitemap pages: " + publicCount);
  console.log("Private noindex pages: " + PRIVATE_ROUTES.length);
}

try {
  run();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
