import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const html = read("index.html");
const css = read("css/home.css");
const worker = read("sw.js");

const navOpen = html.match(/<nav class="dori-search-discovery"[^>]*>/);
const navMatch = html.match(/<nav class="dori-search-discovery"[^>]*>([\s\S]*?)<\/nav>/);
assert.ok(navOpen && navMatch, "Homepage service discovery navigation must exist.");
assert.match(navOpen[0], /aria-labelledby="dori-discovery-title"/, "Navigation must have an accessible name.");
const nav = navMatch[1];
assert.match(nav, /<h2 id="dori-discovery-title">/, "Navigation must have a visible section heading.");

const groups = [...nav.matchAll(/<section class="dori-search-discovery-group"[^>]*>([\s\S]*?)<\/section>/g)];
assert.ok(groups.length >= 5, "Service links must be grouped into at least five categories.");

const groupNames = [];
const hrefs = [];
for (const [, groupHtml] of groups) {
  const heading = groupHtml.match(/<h3 id="[^"]+">([^<]+)<\/h3>/);
  assert.ok(heading, "Every service group must have a heading.");
  groupNames.push(heading[1].trim());

  const list = groupHtml.match(/<ul class="dori-search-discovery-links">([\s\S]*?)<\/ul>/);
  assert.ok(list, "Every service group must use a semantic link list.");
  const links = [...list[1].matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  assert.ok(links.length > 0, "Every service group must have at least one link.");

  for (const [, href, label] of links) {
    assert.ok(href.startsWith("./"), "Service links must be site-relative.");
    assert.ok(!href.startsWith("../"), "Service links must remain inside the site.");
    hrefs.push(href);

    const relativeTarget = href.slice(2).split(/[?#]/, 1)[0];
    const absoluteTarget = path.resolve(root, relativeTarget || ".");
    assert.ok(existsSync(absoluteTarget), "Service link target must exist: " + href);
    if (statSync(absoluteTarget).isDirectory()) {
      assert.ok(existsSync(path.join(absoluteTarget, "index.html")), "Directory route must have index.html: " + href);
    }
  }
}
assert.equal(new Set(groupNames).size, groupNames.length, "Service group headings must be unique.");
assert.equal(new Set(hrefs).size, hrefs.length, "Service destinations must not be duplicated.");
assert.ok(hrefs.length >= 20, "Service discovery must expose at least 20 established routes.");

const description = html.match(/<meta name="description" content="([^"]+)">/);
assert.ok(description && description[1].length >= 70, "Homepage description must be meaningful.");
assert.match(html, /<link rel="canonical" href="https:\/\/rockey-jason\.github\.io\/doldol-site\/">/);
assert.match(html, /<meta property="og:image:alt" content="[^"]+">/);

const homeCssVersion = html.match(/href="css\/home\.css\?v=([^"]+)"/)?.[1];
assert.ok(homeCssVersion, "Homepage stylesheet must use an explicit version.");
assert.ok(worker.includes("css/home.css?v=" + homeCssVersion), "Service worker must cache the exact homepage stylesheet version.");
assert.match(css, /@media\s*\(max-width:\s*460px\)/, "Grouped navigation needs a narrow-screen layout.");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "Homepage motion must respect reduced-motion preferences.");
assert.match(css, /:focus-visible/, "Homepage navigation must expose keyboard focus.");
assert.match(css, /--accent:\s*#d9bd82/i, "Homepage brand accent must use the navy-and-gold palette.");

console.log("Homepage experience validation passed: " + groups.length + " categories, " + hrefs.length + " valid internal links, responsive/accessibility/SEO/cache checks passed.");
