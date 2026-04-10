# realinfluencer.ai — Product Spec

> The definitive product specification. What we're building, for whom, and how it works.
> Last updated: 2026-03-10

---

## One-Liner

**Create custom AI influencers and generate unlimited content as them — photos, videos, talking-head clips — all from one app.**

---

## The Problem

Creating AI influencer content today requires 5+ separate tools, each with its own interface, pricing, and learning curve. Getting a consistent-looking AI character across scenes is a nightmare of trial and error.

**Our course teaches the manual process. Our app eliminates it.**

---

## Who It's For

**Primary: Course students.** They learn the manual workflow in the course, then use the app to do it 10x faster. The app is the "graduate to this" moment.

**Secondary: Solo operators.** People running AI influencer accounts on Instagram, TikTok, Twitter. They need volume, consistency, and speed. They don't care about the craft — they want results.

**Tertiary: Agencies.** People managing multiple creators who need content at scale. They use the power features — multiple creators, batch generation, higher tiers.

---

## Core Concepts

### The Creator (AI Influencer)

The central object. A Creator is a persistent AI character with:

- **A face** — generated through the wizard, validated for consistency
- **A look** — body type, hair, skin, features, vibe
- **A name** — user-chosen
- **A niche** — fitness, lifestyle, beauty, tech, etc.
- **Reference images** — used to keep the face consistent across all generations
- **A voice** (optional) — ElevenLabs voice profile
- **A content library** — everything ever generated for this creator

You don't use the app without a Creator. The Creator is the anchor. All content is generated FOR a specific Creator.

### Two Ways to Get a Creator

**1. Build Your Own (the wizard)**

Full customization via the Creator Studio — a near-full-screen immersive modal. Users pick traits visually (swatches, chips, thumbnails) across 5 tabs: Basics, Face, Hair, Body, Style. Any trait left blank = AI fills in creatively. Three entry paths:
- **Build from Scratch** — visual pickers (default)
- **Describe It** — type a description, AI pre-fills the pickers
- **Start from Template** — pick a pre-made, jumps to Generate

After picking traits, user hits Generate → picks from 4 variations → validates consistency across 5 test scenes → names and saves.

**2. Pick a Pre-Made Creator**

A library of 20-30 ready-to-go AI influencers we've built, validated, and polished. Browse by niche, vibe, demographics. Zero setup — pick one and start generating immediately.

Pre-mades are shared (multiple users can pick the same one). Custom creators are unique to you. This is a natural upgrade incentive.

### Credits

Everything costs credits. Credits are the universal currency.

**Why credits, not flat subscriptions:**
- Every generation costs real API money
- Different actions cost different amounts
- Casual users shouldn't pay the same as power users
- Credits let people try it cheap and scale up

### Templates

Pre-built content recipes. A template packages a workflow as a one-click experience:
- "Gym mirror selfie" — pick outfit, hair style → generate
- "Product testimonial" — paste product name, talking points → generate video
- "Storytime talking head" — write script → generate video with lip sync

Templates are what make this accessible. Without them it's just a prompt box.

---

## The App Flow

### Onboarding

```
Sign up (email or Google)
    │
    ▼
"Create your first AI influencer"
    │
    ├─→ "Build Your Own" → Creator Studio wizard
    │
    └─→ "Pick a Pre-Made" → Pre-made library
    │
    ▼
Workspace with Creator ready to go
```

New users go straight into creating their first Creator. No empty dashboard.

### Workspace (Chat-First)

The main interface is a chat-based workspace — not a traditional dashboard. You talk to the app like ChatGPT, and it generates content inline.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR (280px)     │  CENTER CANVAS (flex-1)       │
│                      │                                │
│  Creator List        │  Chat / Library / Templates    │
│  ┌──────────────┐    │  (controlled by nav)           │
│  │ ● Sophia     │    │                                │
│  │   Luna       │    │                                │
│  │   Kai        │    │                                │
│  └──────────────┘    │                                │
│                      │                                │
│  + New Creator       │                                │
│  Browse Pre-Made     │                                │
│                      │                                │
│  ─────────────────   │                                │
│  💬 Chat             │                                │
│  🖼️ Library          │                                │
│  📋 Templates        │                                │
│                      │                                │
│  ─────────────────   │                                │
│  73 credits          │                                │
│  ⚙️ Settings         │                                │
└──────────────────────┴────────────────────────────────┘
```

**Sidebar:** Creator list (active highlighted), nav links (Chat/Library/Templates), credits + settings at bottom. Collapses to Sheet on mobile.

**Center canvas:** Switches between Chat, Library, and Templates views based on nav selection.

### Chat View

The primary interaction surface. Users type what they want, the app generates it.

**Input bar:**
- Mode pills: Chat | Image | Video | Talking Head
- Auto-expanding textarea
- Count selector (1-4 images)
- Settings gear (opens generation settings)
- Send button

**Messages:**
- User messages (right-aligned)
- Assistant messages with: text, inline image grids (1-4), action buttons, suggestion chips
- Each generation shows credit cost

**Post-generation actions:**
- Download (free)
- Upscale to 4K (1 credit)
- Make Video — 5s (3 credits) / 10s (5 credits)
- Add Voice (2 credits)
- Lip Sync (5 credits)
- Regenerate (same cost as original)
- Generate Caption (free)

### Three Content Creation Paths

**1. Templates (most users, most of the time)**

Browse by category → pick a template → customize 1-3 options → see credit cost → generate. Template loads into chat with customization options as quick-select buttons.

**2. Describe It (power users)**

Type what you want in the chat input. AI enhances the prompt automatically. User input like "coffee shop, cream sweater, cozy vibes" becomes a full detailed generation prompt.

**3. Recreate from URL (V2+ feature)**

Paste a TikTok/Reel URL → AI analyzes the video (scene, outfit, action, mood) → recreates the concept with your Creator → customize if needed → generate.

### Content Library

Grid view of all content generated for the active Creator. Filter by type (Photos/Videos/Talking Head). Each item shows thumbnail, type badge, date. Click to expand with full preview, original prompt, and action buttons (re-download, regenerate, make video, upscale).

### Template Library

Categorized grid of content recipes:

| Category | Example Templates |
|----------|-------------------|
| Fitness | Gym selfie, workout clip, progress check, protein shake |
| Lifestyle | Morning coffee, outfit of the day, golden hour, apartment |
| Get Ready | GRWM makeup, outfit, hair, skincare |
| Talking Head | Storytime, hot take, advice, reaction, tips |
| Product/UGC | Holding product, unboxing, review, testimonial |
| Thirst/Aesthetic | Mirror selfie, golden hour, beach, POV |
| Trending | Current viral formats (rotated weekly) |

Each template contains: scene prompt, customization options (1-3), output type, video motion prompt, suggested captions, credit cost, example outputs.

### Creator Studio (Wizard)

Near-full-screen modal (~95vw × 92vh) with two-panel layout:

**Left panel (~35%):** Preview area
- Phase 1 (customizing): Silhouette placeholder + text summary of selections
- Phase 2 (generated): 2×2 grid of 4 images, click to select
- Phase 3 (validating): Base image + 5 test scenes (side profile, 3/4 angle, outfit change, outdoor, close-up)
- Phase 4 (finishing): Final image large + name/niche input

**Right panel (~65%):** 5 tabbed trait picker
- **Basics**: Gender, Age, Ethnicity, Skin Tone (gradient swatches)
- **Face**: Eye Color (circles), Eye Shape, Face Shape, Lips, Distinctive Features
- **Hair**: Color (swatches), Length, Texture
- **Body**: Build, Chest Size (female), Height
- **Style**: Vibe (multi-select, max 3), Expression

Any trait left blank = AI fills in creatively ("Leave any field blank — AI will surprise you").

**Mobile:** Single-column, preview stacks above picker, tabs become horizontal scroll bar.

### Creator Profile

Accessible by clicking Creator name in sidebar. Shows:
- Base image, name, niche, creation date, content count
- Reference images grid (validation images)
- Edit name/niche, change voice, view references
- Delete with confirmation

---

## Pricing & Credits

### Credit Costs

| Action | Credits | Why |
|--------|---------|-----|
| Create new Creator (wizard + validation) | 5 | Multiple generations |
| Generate images (4 variations) | 2 | Base image gen |
| Upscale to 4K | 1 | Upscaler API call |
| Generate video — 5 seconds | 3 | Video gen |
| Generate video — 10 seconds | 5 | Longer = more compute |
| Voice generation (per clip) | 2 | ElevenLabs API |
| Lip sync video | 5 | Most expensive pipeline |
| Prompt enhancement | 0 | Free (we eat it) |
| Video analysis (Recreate) | 1 | Vision API call |
| Caption generation | 0 | Free |
| Download with metadata strip | 0 | Free (our differentiator) |

### Plans

| Plan | Price | Credits/mo | Custom Creators | Key Features |
|------|-------|-----------|-----------------|--------------|
| Free | $0 | 10 | Pre-mades only | Watermark, basic templates |
| Starter | $19/mo | 100 | 3 custom | No watermark, all templates, metadata strip |
| Pro | $49/mo | 300 | 10 custom | Priority gen, video templates, voice, Recreate |
| Unlimited | $99/mo | 1000 | Unlimited | Everything, batch gen, API access, priority queue |

*Pricing is preliminary and may change.*

### Credit Packs

| Pack | Price | Credits | Per Credit |
|------|-------|---------|------------|
| Small | $5 | 25 | $0.20 |
| Medium | $15 | 100 | $0.15 |
| Large | $40 | 350 | $0.11 |
| XL | $80 | 800 | $0.10 |

Pack credits don't expire. Monthly plan credits reset each billing cycle.

### Course Bundles

| Bundle | Price | Includes |
|--------|-------|----------|
| Course only | $197 | Just the course |
| Course + Starter (3 months) | $247 | Course + 3 months Starter |
| Course + Pro (3 months) | $297 | Course + 3 months Pro |
| Course + Pro (lifetime) | $497 | Course + lifetime Pro |

---

## Feature Phases

### Phase 1: MVP (Launch with course)
- Next.js scaffold with brand theme
- Auth (Clerk) + onboarding
- Creator Studio wizard (full visual builder)
- Pre-made Creator library (20-30 creators)
- Image generation with Creator consistency
- 15-20 templates across 4 categories
- Chat-first workspace (sidebar + chat + library + templates)
- Content library (saved per Creator)
- Credit system (balance, deductions, display)
- Stripe integration (plans + credit packs)
- Metadata stripping on all downloads
- Mobile responsive

### Phase 2: Video & Voice
- Image-to-video generation (5s, 10s)
- Voice generation (ElevenLabs integration)
- Lip sync for talking-head content
- Video + talking head templates
- Prompt enhancement (AI improves descriptions)
- "Describe It" freeform mode

### Phase 3: Growth
- "Recreate" mode (URL → analyze → regenerate)
- 50+ templates, trending rotation
- Caption generator
- Batch generation
- Creator variations (same person, different default looks)
- Analytics (content generated, template usage)

### Phase 4: Marketplace Foundation
- Public Creator profiles / portfolios
- "Available for hire" toggle
- Brand accounts + brief posting
- Campaign management
- Agentic content fulfillment

---

## Content Moderation

### What We Prevent
- Nudity/explicit content
- Hate/violence
- Impersonation of real people
- Copyright violation

### How
- Input prompt filtering
- Output image scanning (model-level safety checks)
- User reporting
- Account suspension for violations

---

## Key Differentiators

1. **Custom AI influencers, not stock actors.** You build YOUR character — it's yours, consistent, not a face 10,000 others use.
2. **Full pipeline.** Image → video → voice → lip sync → metadata strip → download. Finished product, not "go edit it in CapCut."
3. **Persistence.** Your Creator lives on your dashboard. You build their content library over time.
4. **Course flywheel.** Training pipeline feeding users into the product.
5. **Usage-based pricing.** See exactly what each action costs before you do it.
6. **Metadata stripping.** Every download comes clean. No AI fingerprints. Looks like it came from an iPhone.

---

## Competitive Positioning

| | Arcads | HeyGen | MakeUGC | Us |
|--|--------|--------|---------|-----|
| Characters | 1000+ stock | Stock avatars | Limited stock | Custom-built from scratch |
| Persistence | One-off | Per-project | One-off | Permanent, growing library |
| Content types | Talking-head ads | Video only | UGC ads | Photos, video, talking-head, lifestyle |
| Consistency | None | Per-avatar | Limited | Reference-image system |
| Pipeline | Script → video | Script → video | Ad-focused | Image → video → voice → lip sync → metadata strip |
| Target | Performance marketers | Enterprise video | D2C brands | Creators, operators, agencies, students |
| Price | $11/video | $29+/mo | $29/mo | $19-99/mo credits |

---

*This is the source of truth for what we're building.*
*Technical architecture: see TECHNICAL-ARCHITECTURE.md*
*Implementation plan: see IMPLEMENTATION-PLAN.md*
