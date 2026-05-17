# Project documentation index

This folder contains all operational and reference documentation. See the root [README.md](../README.md) for a project overview.

---

## Documentation files

| File | Purpose |
|---|---|
| [docs/README.md](README.md) | This index |
| [docs/vps-setup.md](vps-setup.md) | **First-time VPS setup** — provision Ubuntu, install Docker, issue SSL cert, create deploy dir |
| [docs/docker.md](docker.md) | **Build workflow** — how to build the linux/amd64 image and push it to the registry |
| [docs/deploy.md](deploy.md) | **Deployment cookbook** — how to ship a change to the live VPS (code-only or schema change) |
| docs/production.md | **Live state tracker** — VPS IP, running image, cert expiry, remaining action items. Gitignored (contains real IP); lives on your local machine only |

---

## Deployment and infrastructure

| File | Purpose |
|---|---|
| [Dockerfile](../Dockerfile) | Multi-stage build: deps → builder → runner. Produces a `linux/amd64` standalone Next.js image running as non-root user `nextjs` (UID 1001) |
| [docker-compose.yml](../docker-compose.yml) | Local development compose — builds image from source, exposes Postgres on `127.0.0.1:5433` |
| [docker-compose.registry.yml](../docker-compose.registry.yml) | Production VPS compose — pulls pre-built image from registry, runs postgres + app + nginx with SSL |
| [nginx/default.conf](../nginx/default.conf) | Nginx reverse proxy — HTTP→HTTPS redirect, Let's Encrypt SSL, www→apex canonical redirect, WebSocket support |
| [scripts/docker-build-amd64.sh](../scripts/docker-build-amd64.sh) | Cross-platform build helper — builds `linux/amd64` image from Mac ARM via `docker buildx` |
| [.env.example](../.env.example) | Environment variable reference with descriptions and safe example values |

---

## Application source

### Entry points

| File | Purpose |
|---|---|
| [src/payload.config.ts](../src/payload.config.ts) | Root Payload CMS configuration — database adapter, collections, globals, plugins, jobs |
| [src/payload-types.ts](../src/payload-types.ts) | Auto-generated TypeScript types from Payload schema — **do not edit manually**, regenerate with `pnpm generate:types` |
| [src/environment.d.ts](../src/environment.d.ts) | TypeScript declarations for `process.env` — documents required environment variables |

### Collections (`src/collections/`)

Payload CMS collections define the data model, access control, hooks, and admin UI for each content type.

| Collection | Purpose |
|---|---|
| `Articles/` | Primary content — versioning, drafts, slug generation, SEO, Lexical rich text, ISR revalidation hooks |
| `Categories/` | Taxonomy — used to tag and filter articles |
| `Pages/` | Layout-builder pages — drafts enabled, hero + block system |
| `Media.ts` | File uploads — pre-configured image sizes via Sharp, local disk storage |
| `Users/` | Authentication — role-based access control (`admin` / `editor`) |

### Blocks (`src/blocks/`)

19 layout builder blocks used by Pages and Articles. Each block has a config (`*.config.ts`) and a React component.

| Block | Purpose |
|---|---|
| `Archive/` | Paginated article listing |
| `BreakingNewsBar/` | Highlighted breaking news banner |
| `CallToAction/` | CTA with heading, body, and link buttons |
| `CategoryFeed/` | Articles filtered by category |
| `Code/` | Syntax-highlighted code block |
| `Content/` | Multi-column rich text |
| `Divider/` | Visual separator |
| `EmbedBlock/` | External embed (video, tweet, etc.) |
| `Form/` | Form builder integration |
| `LatestHeadlines/` | Auto-fetched latest articles |
| `ManualStoryGrid/` | Hand-curated article grid |
| `MediaBlock/` | Full-width image or video |
| `NewsletterSignup/` | Email capture form |
| `PartnerLogoRow/` | Sponsor/partner logo strip |
| `RelatedArticles/` | Manually linked related content |
| `SectionHeader/` | Section title and subtitle |

### Routes (`src/app/`)

| Route group | Purpose |
|---|---|
| `src/app/(frontend)/` | Public website — home (`/`), articles (`/articles`, `/articles/[slug]`), pages (`/[slug]`), sitemaps |
| `src/app/(payload)/` | Payload admin panel (`/admin`) and REST/GraphQL API (`/api`) |

### Globals (`src/globals/`)

| File | Purpose |
|---|---|
| `Header/` | Site header — navigation links, managed in Payload admin |
| `Footer/` | Site footer — nav items and legal copy |

### Supporting source

| Path | Purpose |
|---|---|
| `src/access/` | Access control functions — `anyone`, `authenticated`, `authenticatedOrPublished` |
| `src/hooks/` | Payload lifecycle hooks — `populatePublishedAt`, `revalidateRedirects` |
| `src/fields/` | Reusable field configs — `link`, `linkGroup`, `defaultLexical` |
| `src/heros/` | Hero section variants and render logic |
| `src/providers/` | React context providers |
| `src/utilities/` | Shared helpers — URL resolution, metadata generation, debounce, date formatting |
| `src/migrations/` | PostgreSQL migration files — applied manually via `pnpm payload migrate` (see [deploy.md](deploy.md)) |
| `src/plugins/` | Payload plugin registrations — SEO, redirects |

---

## Configuration files

| File | Purpose |
|---|---|
| [package.json](../package.json) | Dependencies and pnpm scripts (`dev`, `build`, `start`, `lint`, `generate:types`, `payload migrate`) |
| [next.config.ts](../next.config.ts) | Next.js config — `output: 'standalone'`, image domains, Turbopack, `withPayload` wrapper |
| [tailwind.config.mjs](../tailwind.config.mjs) | Tailwind CSS — custom tokens, content paths |
| [tsconfig.json](../tsconfig.json) | TypeScript config |
| [eslint.config.mjs](../eslint.config.mjs) | ESLint rules |
| [next-sitemap.config.cjs](../next-sitemap.config.cjs) | Sitemap generation — runs after `next build` |
| [components.json](../components.json) | shadcn/ui component config |
| [vitest.config.mts](../vitest.config.mts) | Vitest integration test config |
| [playwright.config.ts](../playwright.config.ts) | Playwright E2E test config |
| [.dockerignore](../.dockerignore) | Files excluded from Docker build context — secrets, node_modules, media uploads |
| [.gitignore](../.gitignore) | Files excluded from git — `.env`, `.next`, `node_modules`, `public/media` |
| [.prettierrc.json](../.prettierrc.json) | Prettier formatting rules |
| [redirects.ts](../redirects.ts) | Static redirect definitions |

---

## AI and IDE context files

These files stay at the **repo root** so tooling picks them up automatically.

| File | Purpose |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | Claude Code project instructions — read by the Claude Code CLI from the repo root |
| [AGENTS.md](../AGENTS.md) | PayloadCMS patterns reference — detailed rules for type safety, hooks, queries, access control |
| [.cursor/rules/](../.cursor/rules/) | Cursor IDE rules — Payload-specific patterns split by topic (hooks, collections, access control, security, etc.) |
