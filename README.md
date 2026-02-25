# AI Influencer Academy — Creator App

> One-click AI influencer creation and viral content generation

---

## Overview

The companion app for **AI Influencer Academy** — a course teaching people to build AI-powered faceless influencer businesses.

**Course teaches the craft → App gives the results**

| Course | App |
|--------|-----|
| Learn how it works | Just click and generate |
| Manual prompting | Visual wizard |
| 5+ separate tools | All-in-one platform |
| Build the skill | Get the output |

---

## Project Structure

```
ai-creator-app/
├── README.md              ← You are here
├── brand-kit/             ← Visual identity & design system
│   ├── BRAND-GUIDE.md     ← Colors, typography, components
│   └── AI-Influencer-Academy-Brand-Kit.html
├── docs/                  ← Specs and flows
│   ├── APP-SPEC-V1.md     ← Feature spec
│   ├── CREATOR-FLOW.md    ← Avatar creation wizard
│   └── CONTENT-FLOW.md    ← Content generation flows
├── workflows/             ← Generation pipelines
├── research/              ← Competitor/tech research
├── src/                   ← Code (when built)
└── assets/                ← Images, templates
```

---

## Core Features

### 1. Create Your Creator
Visual wizard to build AI avatar — no prompting skills needed.
- Pick features (face, hair, body, style)
- Generate variations
- Validate across scenes
- Save to library

### 2. Make Content
Template library + custom generation.
- Pre-built viral templates
- One-click generation
- Image + video output
- Caption/hashtag suggestions

### 3. Voice & Talking Content
Add personality with voice.
- Voice style selection
- Lip-sync videos
- Script-to-video

### 4. Post & Track (Future)
Schedule and analyze.
- Direct posting (IG, TikTok)
- Analytics dashboard
- Content calendar

---

## Tech Stack (Planned)

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| Storage | Cloudflare R2 |
| Image Gen | Fal.ai / Replicate |
| Video Gen | Kling / Runway |
| Voice | ElevenLabs |
| Lip Sync | Sync Labs / Hedra |
| Payments | Stripe |
| Queue | Inngest |

---

## Brand

See `/brand-kit/BRAND-GUIDE.md` for:
- Color palette (Cream, Charcoal, pastels)
- Typography (Playfair Display, DM Sans, JetBrains Mono)
- Logo usage
- UI guidelines

---

## Related Projects

| Project | Path | Purpose |
|---------|------|---------|
| Course Content | `/ai-content-course` | Scripts, resources, research |
| Legacy Platform | `/ai-creator-mgmt` | Existing DB, scraping tools |

---

## Pricing Model (Draft)

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 creator, 5 gens/mo, watermark |
| **Pro** | $29/mo | 3 creators, 100 gens/mo, no watermark |
| **Business** | $79/mo | Unlimited, priority, API access |

**Course Bundle:** $297 = Course ($197) + 3 months Pro app

---

## Status

- [x] Spec written
- [x] Creator flow designed
- [x] Content flow designed
- [x] Brand kit created
- [ ] Tech stack scaffolded
- [ ] MVP built
- [ ] Beta launch

---

*Project started: 2026-02-24*
*Brand: AI Influencer Academy*
