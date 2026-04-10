# realinfluencer.ai — Project Status & Master Summary

> **Last updated:** 2026-03-25
> **One-liner:** Create custom AI influencers and generate unlimited content as them.

---

## What This App Is

A consumer SaaS where users build custom AI influencer personas, then generate photos, videos, and talking-head content as those personas. Usage-based credits (not flat subscriptions) because every generation costs real API money.

**Three-layer business:**
1. **Course** ($197) — teaches manual AI influencer creation
2. **App** (this project, $19-99/mo) — consumer tool, the current build focus
3. **Marketplace** (future) — connects AI creators with brands, fully agentic

---

## Current Build State (March 21, 2026)

### What's Working
| Feature | Status | Details |
|---------|--------|---------|
| Auth (Clerk) | **Working** | Sign-in/up with OAuth + email, user sync webhook |
| Database (Railway) | **Working** | Prisma schema with 5 models, migrations applied |
| Workspace UI | **Working** | Sidebar, header, canvas, creator list — prototype CSS |
| Creator Studio wizard | **Working** | 5-tab visual picker, 5-phase flow (customize→generate→pick→finish) |
| Image generation | **Working** | Gemini NBPro, sequential gen (1 base + 3 variations), silhouette template, V3 prompts |
| Credit system (backend) | **Working** | Deduction, refunds, grants, transaction logging |
| Creator CRUD | **Working** | Create, read, update, delete with plan limit enforcement |
| Loading skeletons | **Working** | Shimmer animations for sidebar + header + canvas |
| S3 image storage | **Working** | Upload to S3, signed URLs for display, no more base64 |
| Content generation pipeline | **Working** | Floating input → prompt enhance → Gemini gen → S3 → display |
| Content grid | **Working** | Gallery with cards, filter bar, search, sort, click-to-expand |
| Content detail | **Working** | Full-size dialog with download (blob), delete, prompt display |
| Templates | **Working** | 14 templates across 4 categories, customizable fields, wired to gen pipeline |
| Prompt enhancement | **Working** | Gemini 2.5 Flash, director-style enhancement, graceful fallback |
| Creator validation | **Working** | 5 validation angles after wizard (side, 3/4, outfit, close-up) |
| Onboarding | **Working** | Two-path: "Build Your Own" or "Pick a Pre-Made" |
| Stripe billing | **Working** | Plans, credit packs, webhooks, billing portal |
| Credit UI | **Working** | Balance in sidebar with color-coded status, links to billing |
| Landing page | **Working** | Full landing: hero, features bento, how-it-works, pricing, CTA, footer |
| Pre-made library | **Working** | 12 creators across 5 niches, filter/select/adopt flow |
| Creator profile | **Working** | Sheet with editable name, stats, delete with confirmation |
| Metadata stripping | **Working** | Sharp re-encode strips C2PA/SynthID, adds iPhone EXIF |
| Mobile responsive | **Working** | Media queries for 768px, 640px, 390px breakpoints |
| Settings page | **Working** | Account (Clerk profile), credits, generation defaults, about |
| Billing page | **Working** | Current plan, plan cards, credit pack purchase buttons |
| SEO & metadata | **Working** | Dynamic favicon, apple-icon, OG image, manifest, robots, sitemap, JSON-LD, per-page titles, canonical URLs — all from `src/lib/brand.ts` |
| Vercel deployment | **Working** | Live at realinfluencer.ai (needs production Clerk keys for auth) |

### What's Stubbed / Not Built
| Feature | Status | What's Needed |
|---------|--------|---------------|
| Video generation | **Not built** | Kling 3.0 integration via Fal.ai |
| Voice/TTS | **Not built** | ElevenLabs Turbo v3 integration |
| Lip sync | **Not built** | Hedra/MuseTalk via Fal.ai |
| Upscaling | **Not built** | Clarity Upscaler via Fal.ai |
| Chat-first workspace | **Not built** | V2 spec chat-style interface (current workspace works fine) |
| Custom OG images per page | **Not done** | Sign-up, blog posts, etc. |

### Known Issues
1. **Video/Voice/Lip sync modes are disabled** — buttons visible but grayed out, need API integrations
2. **Hero preview is placeholder** — "App screenshot / demo video goes here"
3. **Pre-made creator avatars are initials only** — no real preview images
4. **Gallery search/sort is decorative** — UI present but not wired to filtering logic

---

## Tech Stack (Confirmed)

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router) | Server Actions for backend |
| Styling | Prototype-First CSS + Tailwind v4 | **DO NOT convert to Tailwind** |
| UI Components | shadcn/ui | Modals/forms only, not core layout |
| Auth | Clerk | OAuth + email, webhooks for sync |
| Database | Railway PostgreSQL + Prisma | PrismaPg adapter |
| State | Zustand | 3 stores: creator, ui, studio |
| Image Gen | Google Gemini (Nano Banana Pro) | gemini-3-pro-image-preview |
| Prompt Enhancement | Gemini 2.5 Flash | Director-style prompt rewriting |
| Video Gen | Kling 3.0 (planned) | Via Fal.ai |
| Voice | ElevenLabs Turbo v3 (planned) | Direct API |
| Lip Sync | MuseTalk 1.5 / Hedra (planned) | Via Fal.ai |
| Storage | AWS S3 | Bucket: realinfluencer-media, signed URLs |
| Payments | Stripe | Plans + credit packs, webhook sync |
| Metadata | Sharp | Strip AI fingerprints, add iPhone EXIF |
| Hosting | Vercel Pro | Not yet deployed |

---

## File Structure

```
src/
├── app/
│   ├── globals.css              # Tailwind @theme + base resets
│   ├── landing.css              # Landing page styles
│   ├── layout.tsx               # Root layout (Clerk, fonts, full metadata)
│   ├── page.tsx                 # Landing page + JSON-LD
│   ├── icon.tsx                 # Dynamic favicon (32×32, from brand.ts)
│   ├── apple-icon.tsx           # Dynamic apple-touch-icon (180×180)
│   ├── opengraph-image.tsx      # Dynamic OG image (1200×630)
│   ├── manifest.ts              # Web app manifest
│   ├── robots.ts                # Crawler rules
│   ├── sitemap.ts               # Sitemap for search engines
│   ├── sign-in/[[...sign-in]]/  # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/  # Clerk sign-up
│   ├── workspace/
│   │   ├── layout.tsx           # Workspace shell + Creator Studio
│   │   ├── page.tsx             # Renders WorkspaceCanvas
│   │   ├── workspace.css        # All workspace styles (from prototype)
│   │   ├── billing/page.tsx     # Billing & plans page
│   │   └── settings/page.tsx    # Settings page
│   └── api/webhooks/
│       ├── clerk/               # User sync webhook
│       └── stripe/              # Stripe event webhook
├── components/
│   ├── workspace/
│   │   ├── workspace-init.tsx   # Loads data on mount
│   │   ├── app-sidebar.tsx      # Logo, creators, credits
│   │   ├── workspace-header.tsx # Creator info + actions
│   │   ├── workspace-canvas.tsx # Content grid + floating input
│   │   ├── creator-list.tsx     # Creator list items
│   │   ├── content-detail.tsx   # Full-size content dialog
│   │   ├── creator-profile.tsx  # Creator edit/delete sheet
│   │   ├── premade-library.tsx  # Pre-made creator browser
│   │   ├── templates-view.tsx   # Template category grid
│   │   └── template-customize.tsx # Template customization dialog
│   ├── studio/
│   │   ├── studio.css           # All studio styles (from prototype)
│   │   ├── creator-studio.tsx   # Modal wrapper
│   │   ├── studio-tabs.tsx      # Tab navigation
│   │   ├── studio-preview.tsx   # Live preview panel
│   │   ├── studio-footer.tsx    # Action buttons
│   │   └── tabs/                # Basics, Face, Hair, Body, Style
│   └── ui/                      # shadcn/ui components
├── data/
│   ├── premade-creators.ts      # 12 pre-made creator definitions
│   └── templates.ts             # 14 template definitions
├── server/actions/
│   ├── workspace-actions.ts     # Load workspace data
│   ├── creator-actions.ts       # Creator CRUD + adopt pre-made
│   ├── credit-actions.ts        # Credit deduction/refund/grant
│   ├── content-actions.ts       # Content gen + delete
│   ├── generate-actions.ts      # Gemini image gen + validation + finalize
│   └── stripe-actions.ts        # Stripe checkout + portal sessions
├── stores/
│   ├── creator-store.ts         # Active creator, creators list, credits, content
│   ├── ui-store.ts              # Active view, studio open flag
│   └── studio-store.ts          # Wizard phase, tabs, traits, images
├── types/
│   ├── creator.ts               # Creator type
│   ├── content.ts               # Content type + enums
│   ├── credits.ts               # Credit types + cost map
│   └── template.ts              # Template types
├── hooks/use-mobile.ts          # Mobile breakpoint hook
├── lib/
│   ├── brand.ts                 # Brand constants (name, colors, tagline, domain)
│   ├── db.ts                    # PrismaClient with PrismaPg
│   ├── s3.ts                    # S3 upload + signed URLs
│   ├── stripe.ts                # Stripe client + plans + checkout
│   ├── utils.ts                 # cn() helper
│   └── ai/
│       ├── prompt-enhancer.ts   # Gemini Flash prompt enhancement
│       └── metadata-strip.ts    # Sharp metadata strip + iPhone EXIF
└── proxy.ts                     # Clerk middleware
```

---

## Generation Pipeline

### Creator Wizard
```
User fills 5 tabs → buildWizardPrompt() → 1× base image (silhouette template) → 3× variations (base as ref) → user picks one → refine/validate → finalize + save
```
**Model:** gemini-3-pro-image-preview (Nano Banana Pro)
**Prompts:** `src/lib/prompts.ts` (central, documented)
**Research:** `docs/reference/PROMPT-ENGINEERING-RESEARCH.md`
**Cost:** 5 credits
**Safety filters:** All disabled (BLOCK_NONE)

### Content Generation (Working)
```
User prompt → Gemini Flash enhancement → buildContentPrompt(settings, enhanced) → N× Gemini Nano Banana Pro → metadata strip → S3 upload → DB record → display
```
**Cost:** 1 credit per image, user picks count 1-4

### Not Yet Built
```
Pipeline B (Video):   Pipeline A + Image-to-Video (Kling 3.0)
Pipeline C (Talking): Script → Voice (ElevenLabs) → Image → Lip Sync (MuseTalk/Hedra)
```

---

## Pricing Model

| Plan | Price | Credits/mo | Custom Creators |
|------|-------|-----------|-----------------|
| Free | $0 | 10 | 0 (pre-mades only) |
| Starter | $19/mo | 100 | 3 |
| Pro | $49/mo | 300 | 10 |
| Unlimited | $99/mo | 1,000 | Unlimited |

**Credit costs:** Images=1, Creator wizard=5 | Video, Voice, Upscale = not yet implemented

**Credit packs:** 25 ($5), 100 ($15), 350 ($45), 800 ($89)

---

## Documentation Map

```
docs/
  STATUS.md                              ← This file (master state)
  SEO.md                                 ← SEO & metadata reference
  VISION.md                              ← Strategic vision
  specs/
    PRODUCT-SPEC.md                      ← What to build and why
    TECHNICAL-ARCHITECTURE.md            ← How to build it
    IMPLEMENTATION-PLAN.md               ← Original V2 build order
  plans/
    2026-03-15-complete-build-plan.md    ← 16-task build plan (mostly complete)
  reference/
    GENERATION-PIPELINE.md               ← Model costs & pipeline details
    TOOLS-MODELS-REFERENCE.md            ← Raw model names and specs
    nano-banana-api.md                   ← Gemini image gen API reference
    gemini-grok-api.md                   ← Full Gemini + Grok API reference
    PROMPT-ENGINEERING-RESEARCH.md       ← Prompt research, course learnings, test results
  courses/
    COURSE-RESEARCH.md                   ← Synthesis of all course learnings

research/                                ← Competitor teardowns (Arcads)
archive/                                 ← Superseded: old brand-kit, design-system,
                                           prototypes, old docs, old README
```
