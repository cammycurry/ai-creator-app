# realinfluencer.ai

Create custom AI influencers and generate unlimited content as them — photos, videos, talking-head clips — all from one app.

## What This Is

A consumer SaaS where users build custom AI influencer personas, then generate photos, videos, and talking-head content as those personas. Usage-based credits because every generation costs real API money.

**Three-layer business:**
1. **Course** ($197) — teaches manual AI influencer creation
2. **App** (this project) — consumer tool, the current build focus
3. **Marketplace** (future) — connects AI creators with brands

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Styling | Prototype CSS + Tailwind v4 |
| Components | shadcn/ui |
| Auth | Clerk |
| Database | Railway PostgreSQL + Prisma |
| State | Zustand |
| Image Gen | Gemini Nano Banana Pro (`gemini-3-pro-image-preview`) |
| Video Gen | Kling 3.0 via Fal.ai (planned) |
| Voice | ElevenLabs Turbo v3 (planned) |
| Storage | AWS S3 (planned) |
| Payments | Stripe (planned) |
| Hosting | Vercel Pro |

## Project Structure

```
src/                        # Application code
  app/                      # Next.js App Router pages
  components/               # React components
    workspace/              # Sidebar, header, canvas
    studio/                 # Creator Studio wizard
    ui/                     # shadcn/ui components
  server/actions/           # Server actions (CRUD, generation, credits)
  stores/                   # Zustand stores
  types/                    # TypeScript types
  lib/                      # Utilities (db, cn)

docs/                       # Documentation
  STATUS.md                 # Master project state summary
  VISION.md                 # Strategic vision
  specs/                    # V2 product & technical specs
  plans/                    # Build plans
  reference/                # API references & pipeline docs
  courses/                  # Course notes (AIAC, AI Realism, AI OFM)

research/                   # Competitor research (Arcads teardown)
archive/                    # Superseded files (old brand kit, prototypes, old docs)
prisma/                     # Database schema & migrations
```

## Docs Quick Reference

| Doc | What |
|-----|------|
| `docs/STATUS.md` | Current state of everything |
| `docs/specs/PRODUCT-SPEC.md` | What to build and why |
| `docs/specs/TECHNICAL-ARCHITECTURE.md` | How to build it |
| `docs/plans/2026-03-15-complete-build-plan.md` | 16-task build plan to ship |
| `docs/reference/GENERATION-PIPELINE.md` | Model costs & pipeline details |
| `docs/courses/COURSE-RESEARCH.md` | Key learnings from all courses |

## Development

```bash
pnpm install
pnpm dev
```

Requires `.env.local` with Clerk, Database, and Gemini API keys. See `docs/specs/TECHNICAL-ARCHITECTURE.md` for full env var list.
