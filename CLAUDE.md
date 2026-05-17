# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A journalism portfolio/publishing platform built with **Payload CMS v3** (headless CMS) and **Next.js 16** (App Router), served from the same Node.js process. PostgreSQL is the database. The frontend and admin panel coexist under one Next.js instance.

## Commands

```bash
pnpm dev                     # Start dev server
pnpm build                   # Build (runs next build + sitemap generation)
pnpm start                   # Start production server
pnpm lint                    # ESLint
pnpm lint:fix                # ESLint with auto-fix
pnpm test:int                # Vitest integration tests
pnpm test:e2e                # Playwright E2E tests
pnpm generate:types          # Regenerate payload-types.ts after schema changes
pnpm generate:importmap      # Regenerate admin import map after adding components
pnpm payload migrate:create  # Create a new DB migration
pnpm payload migrate         # Run pending migrations
tsc --noEmit                 # Validate TypeScript correctness
```

**After any Payload schema change**, run `generate:types` to keep `payload-types.ts` in sync.
**After adding or modifying admin components**, run `generate:importmap`.

## Architecture

### Route Groups

- `src/app/(frontend)/` — Public-facing website (home, articles, pages, sitemaps)
- `src/app/(payload)/` — Payload admin panel and REST/GraphQL API

### Key Directories

| Path | Purpose |
|---|---|
| `src/collections/` | Payload collection configs (Articles, Pages, Categories, Media, Users) |
| `src/globals/` | Global configs (Header, Footer) |
| `src/blocks/` | 19 layout builder blocks used by Pages and Articles |
| `src/fields/` | Reusable field configurations |
| `src/access/` | Access control functions |
| `src/hooks/` | Payload lifecycle hooks |
| `src/endpoints/` | Custom API endpoints |
| `src/migrations/` | PostgreSQL migrations |
| `src/heros/` | Hero section variants |
| `src/providers/` | React context providers |
| `src/utilities/` | Shared helpers |
| `src/payload.config.ts` | Main Payload configuration |
| `src/payload-types.ts` | Auto-generated types (do not edit manually) |

### Collections

- **Articles** — Primary content; versioning + drafts enabled, slug auto-generation, SEO metadata, Lexical rich text, ISR revalidation hooks
- **Pages** — Layout builder pages; drafts enabled
- **Categories** — Taxonomy for articles
- **Media** — File uploads with pre-configured image sizes
- **Users** — Authentication with role-based access control

### Plugins

- `@payloadcms/plugin-redirects` — URL redirect management with revalidation
- `@payloadcms/plugin-seo` — SEO metadata with auto-generated titles/URLs (site title: "Journalism portfolio")

### Data Flow

Server Components fetch data directly via the Payload Local API (`getPayload({ config })`). ISR revalidation is triggered from Payload `afterChange` hooks when content is published.

## Critical Payload Patterns

### Local API Access Control

The Local API bypasses access control by default. When a `user` is passed, always set `overrideAccess: false`:

```typescript
// ❌ Access control bypassed — runs as admin
await payload.find({ collection: 'posts', user: someUser })

// ✅ Enforces user permissions
await payload.find({ collection: 'posts', user: someUser, overrideAccess: false })
```

### Transaction Safety in Hooks

Always pass `req` to nested operations inside hooks to keep them in the same transaction:

```typescript
// ✅ Atomic — same transaction
afterChange: [async ({ doc, req }) => {
  await req.payload.create({ collection: 'audit-log', data: { docId: doc.id }, req })
}]
```

### Prevent Infinite Hook Loops

Use a context flag to guard against hooks re-triggering themselves:

```typescript
afterChange: [async ({ doc, req, context }) => {
  if (context.skipHooks) return
  await req.payload.update({ ..., context: { skipHooks: true }, req })
}]
```

### Getting the Payload Instance

```typescript
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
```

## Docker & Deployment

`docker-compose.yml` runs three services: `postgres:16-alpine`, the Next.js `app`, and `nginx:1.27-alpine` as a reverse proxy.

**Critical build requirement**: PostgreSQL must be running and migrations must be applied _before_ `next build`, because the build connects to the database. See `DOCKER.md` for the full workflow including cross-platform amd64 builds.

For dev/local migrations vs. production migrations, see the `DOCKER.md` notes on "clearing dev push migrations" (batches with `batch = -1`).

## Environment Variables

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `PAYLOAD_SECRET` — Min 32 characters (`openssl rand -base64 48`)
- `NEXT_PUBLIC_SERVER_URL` — Public site URL

Optional:
- `PREVIEW_SECRET` — Draft preview token
- `CRON_SECRET` — Bearer token for scheduled publish jobs
- `DOCKER_IMAGE` — Docker image name/tag

## Additional Reference

- `.cursor/rules/` — Detailed Payload CMS patterns (security, hooks, queries, components, plugins, etc.) — these are authoritative references for Payload-specific implementation details
- `AGENTS.md` — Condensed Payload development rules and type safety guidance
- `DOCKER.md` — Step-by-step Docker build and deployment workflow
