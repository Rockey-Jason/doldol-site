# Site Architecture and Route Map

## Deployment topology

~~~text
GitHub repository: Rockey-Jason/doldol-site
└── main
    ├── static HTML / CSS / JS / assets
    ├── Supabase migrations and Edge Functions
    ├── site validation scripts
    └── GitHub Actions
         ├── repository quality checks
         ├── client build steps for existing subprojects
         ├── assemble _site
         ├── normalize SEO metadata
         └── deploy GitHub Pages
~~~

Public base URL: https://rockey-jason.github.io/doldol-site/

GitHub Pages serves files statically. There is no general-purpose server-side rendering layer for the root pages. A page's initial HTML is therefore important for crawlers, link previews and accessibility.

## Directory map

| Directory | Responsibility |
|---|---|
| .github/workflows/ | CI, publication, scheduled maintenance and news automation |
| assets/ | Shared site images and item artwork |
| assets/dori-items/ | Existing frames, effects, accessories, currencies and reward artwork |
| assets/dori-life/ | Dori Life character artwork |
| css/ | Shared foundations and page-level stylesheets |
| js/ | Shared browser modules and feature logic |
| docs/, Docs/ | Project context, specifications, audit and implementation notes |
| dori-world/ | Existing world-map and atlas pages |
| doronium-factory/ | Existing factory web experience and its validation resources |
| rockey-client/ | Existing TypeScript client application |
| rockey-server/ | Existing server-side application |
| rockey/ | Published client build output |
| supabase/ | Database migrations and Edge Functions |
| scripts/ | Repository and feature-specific validation |

## Shared browser layers

### Foundation and theme

css/dori-foundation.css owns baseline typography, color tokens, keyboard focus, reduced-motion rules, safe mobile sizing and shared interaction transitions.

css/doldol-theme.css and js/doldol-theme.js provide the established site-wide appearance and navigation/transition behavior. A page-specific stylesheet can refine its layout but should not redefine the global design system without a clear reason.

### Account synchronization

js/dori-cloud-sync.js is a central integration point. Changes to authentication listeners, initial session restoration, account switching or profile hydration must be reviewed against index.html and other pages that load the shared bootstrap.

### Profile frames and notifications

Profile-frame rendering is centralized in js/dori-profile-frame.js and css/dori-profile-frame.css. Notification behavior is shared through js/dori-notification-center.js. Avoid reintroducing page-specific copies of these renderers.

### Service worker

sw.js caches the app shell and handles navigation responses. It may inject shared resources when a page lacks them. Any change to this behavior must account for duplicate script/style loading, cache version changes, hidden-tab behavior and offline startup.

## Page inventory

| Page / route | Public purpose |
|---|---|
| / | Home and entry point |
| Randombox.html | Existing random-box item view |
| daily-missions.html | Existing daily mission page |
| doldolcoin.html | Existing coin information |
| doldolcoinmart.html | Existing coin store |
| doldolstock.html | Existing fictional stock-market page |
| dori-ai.html, dori-ai-lab.html | Existing AI-related pages |
| dori-bank.html | Existing banking interface |
| dori-feedback.html | Existing user feedback channel |
| dori-life.html | Existing Dori Life page |
| dori-pass.html | Existing pass and progress page |
| dori-world/ | Existing world map |
| dori-world/kingdom.html | Existing world atlas |
| dori-world/vip-lounge.html | Existing lounge page |
| doronium-factory/ | Existing Doronium Factory page |
| doronium-museum.html | Existing Doronium archive |
| rockeynews.html, readingrockeynews.html | Existing news listing and reading pages |
| knowledgeofrockey.html | Existing information page |
| gamepage.html, dori-throw.html, dori-full-throttle.html, rockey-clicker.html, rockey-time-attack.html, rockey/, dog-sailer/ | Existing game-related pages; do not change their mechanics during general site maintenance |

## Source of truth

- Route existence: repository tree and actual HTML/index files.
- Shared style behavior: current CSS and JS source.
- Data schema: current Supabase migrations and deployed database policies.
- Build and deployment: current GitHub Actions workflows and their run results.
- Search metadata: sitemap, robots file, page HTML and the publish-time SEO normalizer.

When documentation and implementation conflict, inspect the live implementation and update the documentation after confirming the intended behavior. Never invent a database schema or assert that an untested feature works.
