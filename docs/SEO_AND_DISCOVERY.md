# SEO, Crawling and Search Discovery

## Production identity

- Canonical site root: https://rockey-jason.github.io/doldol-site/
- Sitemap: https://rockey-jason.github.io/doldol-site/sitemap.xml
- Crawler policy: /robots.txt

## What the repository controls

1. A crawlable robots.txt identifies the sitemap and allows public pages to be discovered.
2. sitemap.xml lists the canonical public pages.
3. The publication normalizer adds each public page's title-derived Open Graph data, description fallback where needed, canonical URL, robots directives and WebPage structured data.
4. Account, settings and administrative pages receive noindex,nofollow so they are not intended as search landing pages.
5. The homepage keeps its WebSite structured data and site-level description.

The SEO normalizer runs against the assembled _site directory immediately before the Pages artifact is uploaded. Its --check mode validates the route map and generated metadata rules without modifying source files.

## Google indexing limitations

A sitemap and correct metadata make discovery easier; they do **not** guarantee crawling, indexing, ranking or immediate appearance for a search query. Google chooses whether and when to crawl and index a page.

After deployment, the site owner should:

1. Open Google Search Console and verify ownership of the exact GitHub Pages property.
2. Submit https://rockey-jason.github.io/doldol-site/sitemap.xml in the Sitemaps report.
3. Use URL Inspection for the homepage and important public pages, then request indexing when available.
4. Review Page indexing and sitemap processing reports for crawl errors or exclusions.

These Search Console ownership and submission steps require the site owner's account and cannot be completed merely by changing repository files.

## Rules for future changes

- Public pages listed in the sitemap must resolve to a real HTML file.
- Each sitemap URL must have one matching canonical URL.
- Each public page must have a non-empty title and a meaningful description.
- Authentication, account settings and administration pages must not appear in the sitemap and must be marked noindex.
- Do not block noindex pages in robots.txt; crawlers need to be able to read the noindex directive.
- Do not add fake review ratings, organization details, business addresses, authors, product offers or unsupported SearchAction data to structured metadata.
- Keep sitemap lastmod values tied to real published content changes.
