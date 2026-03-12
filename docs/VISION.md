# AI Influencer Academy — Product Vision

> One document. The full picture. What we're building, why, and how everything connects.

---

## The One-Liner

**A platform that lets anyone create, manage, and monetize AI-generated influencers — paired with a course that teaches the craft.**

---

## The Problem

Creating AI influencer content today requires juggling 5+ separate tools:

- **OpenArt / Midjourney** — generate the base image
- **Lupa / Real-ESRGAN** — upscale to high resolution
- **Kling / Runway** — turn images into video
- **ElevenLabs** — generate voice/speech
- **CapCut** — edit everything together

Each tool has its own interface, pricing, learning curve, and quirks. Getting a consistent-looking AI character across scenes is a nightmare of trial and error. Most people give up before they get good.

**Our course teaches the manual process. Our app eliminates it.**

---

## The Three Layers

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  LAYER 1: THE COURSE                              │
│  "Learn to create AI influencers"                 │
│                                                   │
│  - Teaches the manual craft (tools, prompts,      │
│    consistency, content strategy)                  │
│  - Ava = AI instructor (proof the system works)   │
│  - $197 standalone                                │
│  - Acquisition engine for the app                 │
│                                                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  LAYER 2: THE APP                                 │
│  "Create content with your AI influencer"         │
│                                                   │
│  - Visual wizard to build AI creators             │
│  - One-click content templates                    │
│  - Full generation pipeline (image → video →      │
│    voice → edited output)                         │
│  - Self-serve SaaS ($29-79/mo)                    │
│  - What we're building NOW                        │
│                                                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  LAYER 3: THE MARKETPLACE (future)                │
│  "Get paid for your AI content"                   │
│                                                   │
│  - Brands post briefs, AI creators fulfill them   │
│  - Course grads = trained supply side             │
│  - App = the tool they use to deliver             │
│  - Evolves naturally from Layer 2                 │
│                                                   │
└──────────────────────────────────────────────────┘
```

Each layer feeds the next. Course creates creators. App gives them tools. Marketplace gives them income. The flywheel is the moat.

---

## Layer 2: The App (Current Focus)

### What It Does

Users create an AI character ("creator") and then generate unlimited content with that character — photos, videos, talking-head clips — across different scenes, outfits, and vibes. It's like having a virtual model on-demand.

### Who It's For

**Primary: Course students.** They learn the manual process in the course, then use the app to do it 10x faster. The app is the "graduate to this" moment.

**Secondary: Solo operators.** People running AI influencer accounts on Instagram, TikTok, Twitter. They need volume, consistency, and speed. They don't care about learning the craft — they want results.

**Tertiary: Agencies/OFM.** People managing multiple creators (real or AI) who need content at scale. They'd use the more powerful features — multiple creators, batch generation, workflows.

### Core Flow

```
1. CREATE YOUR AI CREATOR
   Visual wizard → pick gender, face, hair, body, vibe
   → generate 4 options → pick favorite
   → validate consistency across scenes
   → save as your creator

2. MAKE CONTENT
   Three paths:

   a) TEMPLATES (easy)
      Browse pre-built viral formats
      "Gym mirror selfie" / "GRWM" / "Coffee run" / "Storytime"
      Pick one → customize 1-2 options → generate → done

   b) DESCRIBE IT (medium)
      Write what you want in plain english
      "She's at a rooftop bar in a black dress, golden hour"
      AI enhances your prompt → generate → done

   c) STEAL THIS VIDEO (magic)
      Paste a viral video URL
      AI analyzes it → recreates the concept with your creator
      Same vibe, different face

3. MAKE IT A VIDEO
   Take any generated image → add motion, duration
   Add voice/speech (ElevenLabs integration)
   Add text overlays, captions
   Lip sync for talking-head content

4. EXPORT
   Download ready-to-post content
   Metadata stripped (no AI fingerprints)
   iPhone EXIF injected (looks like real photos)
   Schedule or post (future)
```

### What Powers It Underneath

The app is a consumer-friendly shell on top of the AI Creator Engine (`ai-creator-mgmt`):

- **90+ AI models** across image, video, text, audio, lipsync
- **Node-based workflow engine** — templates are pre-built workflows the user never sees
- **App Mode** — any workflow becomes a one-click form
- **Reference image system** — keeps faces consistent across scenes
- **Metadata service** — strips AI markers, injects realistic device data
- **Multi-provider** — Fal.ai, WaveSpeed, Gemini native, Grok

Users see simple templates. The engine does the heavy lifting.

### Pricing

| Tier | Price | What You Get |
|------|-------|-------------|
| Free | $0 | 1 creator, 5 generations/month, watermarked |
| Pro | $29/mo | 3 creators, 100 generations, no watermark, all templates |
| Business | $79/mo | Unlimited creators, unlimited generations, priority, API access |

**Bundles with course:**
- Course only: $197
- Course + 3 months Pro: $297
- Course + lifetime access: $497

---

## Layer 3: The Marketplace (Future)

### The Opportunity

The deep research validated this:
- **$6B market today → $46B by 2030** (virtual influencer + AI content)
- **71% of brands** believe AI influencers deliver higher ROI than human creators
- **90%+ cost reduction** vs traditional UGC ($5-10/video vs $150-300)
- **No dominant marketplace** connects AI content creators with paying brands

SideShift proved brands pay for UGC at scale ($2.4M ARR, 1K+ brands). TRIBE proved enterprise brands pay premium for managed creator campaigns ($12.8M funded, Disney/Unilever/L'Oréal). Neither serves AI content creators.

### How It Evolves From The App

The marketplace doesn't need to be built separately. It grows out of the app:

1. **Users create AI influencers and make content** (app, Layer 2)
2. **Some users get really good** and realize they could do this for money
3. **We add "available for hire" to creator profiles** — now it's a marketplace
4. **Brands browse creators and post briefs** — supply already exists from step 1
5. **Course keeps feeding trained creators in** — the flywheel

### The Endgame: Autonomous AI Agents

This is the big swing. The marketplace doesn't just connect humans who use AI tools with brands. It gives **AI agents themselves** the ability to:

- **Receive brand briefs** autonomously
- **Generate content** (images, video, talking-head clips) that matches the brief
- **Post directly** to social platforms
- **Manage campaigns** end-to-end without a human in the loop

Think about it: a brand posts a brief on the marketplace. An AI agent picks it up, generates 20 variations using our engine, posts the top performers, optimizes based on engagement data, and reports back results. No human creator needed at all.

**Why this is massive:**
- It's the logical endpoint of everything we're building
- Fully autonomous AI content creation for brands at near-zero marginal cost
- Could go viral as a concept — "the first marketplace where AI agents work for brands"
- Revenue scales with compute, not with human labor
- Positions us at the frontier of AI advancement, not just another tool

**The progression:**
```
Phase 1: Humans use AI tools to make content (the app)
Phase 2: Humans use AI tools to fulfill brand briefs (marketplace v1)
Phase 3: AI agents fulfill brand briefs autonomously (marketplace v2)
```

Each phase is a bigger market and a bigger story. Phase 3 is what makes us a platform, not just a tool.

### The Three-Sided Model (Phases 1-2)

**AI Creators (supply):** People who build and manage AI personas. They came through the course, got good with the app, and now want to get paid. They maintain portfolios of AI characters and fulfill brand briefs.

**Brands (demand):** DTC e-commerce, agencies, anyone who needs content at volume. They post briefs, browse AI creator portfolios, and pay for deliverables. 10x more content for the same budget.

**The platform (us):** Handles matching, campaign management, payments, quality control. Takes 10-15% transaction fee (not TRIBE's 30% — that causes creator resentment).

### The Two-Sided Model (Phase 3 — Agentic)

**Brands (demand):** Post briefs, set budgets, approve outputs.

**AI Agents (supply):** Autonomous agents powered by our engine. They generate, post, optimize. The platform IS the supply side. No human middleman.

**Revenue:** Per-generation fees + percentage of ad spend managed. This is where the real money is — we're not taking a cut of creator payments, we're charging for the AI labor itself.

### Revenue Model (When Marketplace Launches)

- **Transaction fee:** 10-15% on completed projects (brand-side)
- **Creator subscriptions:** Free / Pro $29/mo / Studio $99/mo
- **Brand subscriptions:** $199/mo (self-serve) / $999/mo (enterprise)
- **Content licensing:** Pre-made AI content library ($10-50/piece)
- **Course bundle:** Course includes 3 months Pro on the marketplace

---

## The Competitive Landscape

### Human Creator Marketplaces (our future competitors)

| Platform | Scale | Model | Our Advantage |
|----------|-------|-------|--------------|
| **SideShift** | 800K creators, $2.4M ARR | Brands hire Gen Z creators for UGC | AI = 10x faster, 90% cheaper, unlimited scale |
| **TRIBE** | 70-80K creators, $12.8M funded | Pitch-first, 30% margin, enterprise clients | No 30% margin, instant delivery, unlimited variation |
| **Billo** | Established UGC marketplace | Human creators film content | Same advantages as above |
| **Insense** | Influencer + UGC | Brand-creator collaboration | AI creators don't ghost, don't miss deadlines |

### AI Content Tools (our current competitors)

| Platform | What They Do | Our Advantage |
|----------|-------------|--------------|
| **MakeUGC** | AI UGC ad generation | We're a full platform, not just an ad tool |
| **HeyGen** | Stock AI avatars for video | We build custom creators from scratch, not stock faces |
| **Creatify** | AI UGC + avatar creator | Ad-focused. We're influencer-focused + marketplace |
| **Higgsfield** | AI UGC builder | Newer, less mature. We have a working engine |
| **Argil** | Clone yourself for AI UGC | Clone-based. We create original AI personas |

### Why We Win

1. **Course → App → Marketplace flywheel.** Nobody else has a built-in creator training pipeline.
2. **The engine.** 90+ models, node workflows, metadata stripping. Real infrastructure, not a wrapper around one API.
3. **Custom creators, not stock avatars.** Your AI person, your face, your brand — not picking from a dropdown of 1000 preset faces.
4. **Full pipeline.** Image → video → voice → lip sync → edited output → metadata stripped → post-ready. Not "here's an image, go figure out the rest."
5. **Metadata service.** Strips AI fingerprints, injects iPhone EXIF. Nobody else does this.

---

## The Business Context

### Related Assets

| Asset | What | Status |
|-------|------|--------|
| **AI Creator Engine** (`ai-creator-mgmt`) | Internal power tool with full generation pipeline | Built, deployed |
| **AI Influencer Academy Course** (`ai-content-course`) | Video course teaching the manual craft | Scripts done, in production |
| **Brand Kit** | Visual identity, colors, typography | Complete |

### Network / Opportunities

- **OFM agencies:** Know operators doing $60K+/mo managing real OnlyFans creators. They need AI content to scale their social media marketing. Potential services clients using the engine directly.
- **SideShift:** Two intro paths to the founders. Potential partnership — AI UGC as a new tier on their marketplace, or competitive intelligence for building our own.
- **TRIBE model:** Proven that enterprise brands (Disney, Unilever) pay for managed creator campaigns. Our marketplace could serve this tier with AI content.

### The Services Angle (Parallel Revenue)

While building the app, the engine can generate revenue through services:
- Offer AI content generation to OFM agencies and content operators
- Use `ai-creator-mgmt` to deliver (they see output, not the tool)
- Proves the tech in production, generates cash flow, creates case studies
- Not the main play — but funds development of the real product

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (New York style) |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| Storage | AWS S3 (us-east-1) |
| Payments | Stripe |
| Background Jobs | Vercel Fluid Compute |
| Hosting | Vercel (Pro) |
| AI Engine | ai-creator-mgmt (90+ models, Fal.ai, WaveSpeed, Gemini, Grok) |

---

## What To Build (In Order)

### Phase 1: The App (MVP)
- [ ] Scaffold Next.js project with brand theme
- [ ] Creator wizard (full flow: basics → face → hair → body → vibe → generate → validate → save)
- [ ] Template library (10-20 pre-built viral content templates)
- [ ] Image generation with creator consistency
- [ ] Basic video generation (image-to-video)
- [ ] Content download (metadata stripped)
- [ ] Auth + subscription (Clerk + Stripe)
- [ ] Free tier + Pro tier

### Phase 2: Full Content Pipeline
- [ ] Voice setup (ElevenLabs integration)
- [ ] Talking-head / lip sync videos
- [ ] "Steal this video" (URL → analysis → recreation)
- [ ] More templates (50+)
- [ ] Prompt enhancement (AI improves user descriptions)
- [ ] Content library (saved content per user)

### Phase 3: Marketplace Foundation
- [ ] Creator profiles (public portfolios of AI personas)
- [ ] "Available for hire" toggle
- [ ] Brand accounts + brief posting
- [ ] Simple matching (browse + apply)
- [ ] Campaign management (brief → submit → review → approve → pay)
- [ ] Transaction payments (Stripe Connect)

### Phase 4: Marketplace Scale
- [ ] AI-powered creator-brand matching
- [ ] Content quality scoring
- [ ] Pre-made content licensing library
- [ ] Analytics dashboards (brands + creators)
- [ ] Enterprise tier with managed service
- [ ] API access for agencies

---

*Last updated: 2026-03-01*
*This is the source of truth. Other docs in /docs/ contain implementation details and research.*
