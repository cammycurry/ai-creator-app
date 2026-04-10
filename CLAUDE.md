# realinfluencer.ai — Claude Code Instructions

## Build & Run
- Package manager: `pnpm` (NOT npm, NOT yarn)
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Prisma migrate: `pnpx prisma migrate dev`
- Prisma generate: `pnpx prisma generate`
- Prisma studio: `pnpx prisma studio`

## Project Overview
Consumer SaaS — create custom AI influencers, generate photos/videos/talking-head content as them. Usage-based credits. Read `docs/STATUS.md` first for full project state.

## Critical Rules
- **Prototype-First CSS** — DO NOT convert to Tailwind. Workspace + Studio use `.css` files with class names from HTML prototypes. Only use Tailwind for new components that never had a prototype.
- **No AI model names in UI** — users see "Photo" / "Video" / "Voice", never "Nano Banana Pro" or "Kling 3.0"
- **No Flux** — banned. Use Gemini (Nano Banana Pro) for all image generation.
- **Usage-based credits** — not flat subscriptions. Every generation costs real API money.
- **Read docs before implementing** — decisions are documented in `docs/specs/`. Don't guess or reinvent.
- **Don't over-design** — simple/original > "elevated". Minimal changes, no premature abstractions.

## Tech Stack
- Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui
- Auth: Clerk (OAuth + email, webhook sync)
- DB: Railway PostgreSQL + Prisma (PrismaPg adapter)
- State: Zustand (3 stores: creator-store, ui-store, studio-store)
- Image gen: Gemini Nano Banana Pro (`gemini-3-pro-image-preview`) — safety filters OFF
- Prompt enhancement: Gemini 2.5 Flash (planned)
- Video: Kling 3.0 via Fal.ai (planned)
- Voice: ElevenLabs Turbo v3 (planned)
- Storage: AWS S3 (planned, currently base64 data: URLs)
- Payments: Stripe (planned)

## File Structure
```
src/app/workspace/         — Workspace pages + workspace.css
src/app/icon.tsx           — Dynamic favicon (generated from brand.ts)
src/app/apple-icon.tsx     — Dynamic apple-touch-icon
src/app/opengraph-image.tsx — Dynamic OG image for social sharing
src/app/manifest.ts        — Web app manifest
src/app/robots.ts          — Crawler rules
src/app/sitemap.ts         — Sitemap for search engines
src/components/workspace/  — Sidebar, header, canvas, creator-list
src/components/studio/     — Creator Studio wizard + studio.css
src/components/ui/         — shadcn/ui components (don't edit directly)
src/server/actions/        — Server actions (workspace, creator, credit, generate)
src/stores/                — Zustand stores
src/types/                 — TypeScript types
src/lib/                   — Utilities (db.ts, utils.ts, brand.ts)
```

## Code Patterns
- Server actions for all mutations (`"use server"`)
- Server components for data loading
- Client components only for interactivity (`"use client"`)
- Prisma queries always through `src/lib/db.ts` singleton
- All auth checks via `auth()` from `@clerk/nextjs/server`
- CSS class names from prototypes — don't rename them
- **No auth-gated pages** — middleware does NOT call `auth.protect()`. Instead, client components check `useAuth().isSignedIn` and show SEO marketing content (WorkspaceGate) to crawlers/logged-out users. See `docs/SEO.md` for the pattern.

## Generation Pipeline
- Creator wizard: `buildCreatorPrompt(traits)` → Nano Banana Pro × 4 parallel → user picks 1 → save
- Prompt pattern: "That woman/man" (NEVER "a woman"), "raw iPhone photography", "visible pores and fine details"
- Content gen (not built yet): user prompt → Gemini Flash enhancement → Nano Banana Pro → S3 → display

## Docs
- `docs/STATUS.md` — master state of everything
- `docs/SEO.md` — SEO & metadata reference (brand constants, assets, per-page metadata)
- `docs/specs/` — PRODUCT-SPEC, TECHNICAL-ARCHITECTURE, IMPLEMENTATION-PLAN
- `docs/plans/2026-03-15-complete-build-plan.md` — current 16-task build plan
- `docs/reference/` — API refs, pipeline docs
- `docs/courses/` — course notes (AIAC master prompts, AI Realism, AI OFM)

## Brand & SEO
- **Brand constants:** `src/lib/brand.ts` — single source of truth for name, colors, tagline, domain
- **All metadata/assets read from brand.ts** — change one file, everything updates
- **Read `docs/SEO.md` before touching metadata** — documents what exists and per-page setup

## Git
- Main branch: `main`
- Commit messages: imperative tense, concise
- Don't commit `.env.local`, `node_modules/`, `.next/`
