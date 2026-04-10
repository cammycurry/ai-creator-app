# AI Creator App — Full Product Plan

> This is the plan for ONE product: the consumer app.
> Not the engine. Not the marketplace. Not the course. Just the app.

---

## What Is This

An app where you create custom AI influencers and generate content as them. Think Arcads — but instead of picking from stock AI actors and making one-off ad videos, you build a persistent AI character and create all types of content: social posts, UGC ads, talking-head videos, lifestyle photos, stories, reels.

**Arcads says:** "Pick an actor, paste a script, get an ad."
**We say:** "Build your influencer, create their whole content universe."

---

## How It's Different From Arcads


|               | Arcads                               | Us                                                         |
| ------------- | ------------------------------------ | ---------------------------------------------------------- |
| Characters    | 1000+ stock actors, pick from a list | You build your own from scratch                            |
| Persistence   | One-off videos, no continuity        | Same face, same persona, forever                           |
| Content types | Talking-head ad videos only          | Images, video, talking-head, lifestyle, UGC, stories       |
| Consistency   | Different actors per video           | Same character across all content                          |
| Use case      | Direct-response ads                  | Social content, brand deals, UGC, full influencer presence |
| Editing       | No built-in editor, need CapCut      | Full pipeline — generation through finished output         |
| Target user   | Performance marketers                | Creators, influencer operators, agencies, course students  |
| Price         | $11/video ($110/mo for 10)           | Usage-based credits (see below)                            |


---

## Core Concepts

### The Creator (AI Influencer)

This is the central object in the app. A Creator is a persistent AI character with:

- **A face** — generated through the wizard, validated for consistency
- **A look** — body type, hair, skin, features, vibe
- **A name** — user-chosen
- **A niche** — fitness, lifestyle, beauty, tech, etc.
- **Reference images** — the system uses these to keep the face consistent
- **A voice** (optional) — ElevenLabs voice profile
- **A content library** — everything ever generated for this creator

You don't use the app without a Creator. The Creator is the anchor. All content is generated FOR a specific Creator.

### Two Ways To Get A Creator

**1. Build Your Own (the wizard)**
Full customization. Pick every feature, generate, validate, save. This is the premium experience — your unique AI influencer that nobody else has.

**2. Pick A Pre-Made Creator**
A library of ready-to-go AI influencers. These are characters we've already built, validated, and polished. Users can browse by:

- **Niche** — fitness, lifestyle, beauty, fashion, tech, travel
- **Vibe** — girl next door, glamorous, edgy, soft/cute, sophisticated
- **Demographics** — age range, ethnicity, body type
- **Gender** — female, male, non-binary

Each pre-made Creator comes with:

- A name and persona (but users can rename)
- Reference images already validated for consistency
- A few example content pieces so you can see what they look like in action
- Ready to generate content immediately — zero setup

**Why pre-mades matter:**

- **Kills onboarding friction.** New user → pick a Creator → make content in 60 seconds. No 8-step wizard on day one.
- **Free tier hook.** Free users get access to pre-made Creators only. Want to build your own custom one? That's Starter tier.
- **Showcases quality.** Pre-mades are our best work. They show new users what's possible before they invest time building their own.
- **Like Arcads' stock actors but better.** They're persistent, consistent, and have a real persona — not just a face from a dropdown.

**The library should launch with 20-30 pre-made Creators** across a range of niches, vibes, and demographics. Add more over time — this is also content marketing (showcase new Creators on social to attract users).

**Important:** Pre-made Creators are shared — multiple users can pick the same one. Custom Creators are unique to you. This is a natural upgrade incentive: "Want a face nobody else has? Build your own."

### Credits

Everything costs credits. Credits are the universal currency.

**Why credits, not flat subscriptions:**

- Every generation costs us real API money (Fal.ai, Gemini, ElevenLabs, etc.)
- Different actions cost different amounts (an image is cheap, a 10s video is expensive)
- Users who generate 5 things/month shouldn't pay the same as someone generating 500
- Credits let casual users try it cheap and power users scale up

### Templates

Pre-built content recipes. A template is a workflow packaged as a one-click (or few-click) experience:

- "Gym mirror selfie" — pick outfit, hair style → generate
- "GRWM morning routine" — pick setting, products → generate image series
- "Product testimonial" — paste product name, talking points → generate video
- "Storytime talking head" — write/paste script → generate video with lip sync

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
    ▼
Creator Wizard (5 steps)
    │
    ▼
Dashboard with your Creator ready to go
```

New users go straight into creating their first Creator. No empty dashboard. No "what do I do." The wizard IS the onboarding.

### Creator Wizard

**Step 1: Basics**

- Gender (Female / Male / Non-binary)
- Age range (18-22, 23-27, 28-35, 35-45, 45+)
- Ethnicity

**Step 2: Face & Skin**

- Skin tone (visual picker, light → dark)
- Eye color + shape
- Face shape
- Lip size
- Distinctive features (freckles, beauty mark, dimples)

**Step 3: Hair**

- Color
- Length
- Texture (straight, wavy, curly, coily)

**Step 4: Body**

- Build (slim, athletic, average, curvy, plus-size)
- Height impression
- Chest size (if applicable)

**Step 5: Vibe & Style**

- Vibe tags (girl next door, glamorous, edgy, fitness, soft/cute, etc.)
- Expression (warm, confident, mysterious, playful)
- Niche (fitness, lifestyle, beauty, tech, fashion)

**Step 6: Generate & Pick**

- Generate 4 base images
- User picks favorite
- Option to regenerate or tweak

**Step 7: Validate**

- Auto-generate test images: side profile, 3/4 angle, different outfit, outdoor, close-up
- "Does this look like the same person across all images?"
- If yes → save. If no → tweak and regenerate.

**Step 8: Name & Save**

- Name your Creator
- Choose niche/category
- Creator saved to dashboard

**Credit cost:** Creating a Creator = 5 credits (covers generation + validation suite)

### Dashboard

Once they have a Creator, the dashboard shows:

```
┌─────────────────────────────────────────────────┐
│  [Creator avatar]  Sophia                        │
│  Fitness & Lifestyle · 47 posts created          │
│                                                   │
│  [Make Content]  [Edit Creator]  [Switch Creator]│
├─────────────────────────────────────────────────┤
│                                                   │
│  RECENT CONTENT                                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│  │    │ │    │ │    │ │    │ │    │            │
│  └────┘ └────┘ └────┘ └────┘ └────┘            │
│                                                   │
│  TEMPLATES                                        │
│  [🔥 Trending] [💪 Fitness] [☕ Lifestyle]       │
│  [🎤 Talking Head] [📦 UGC/Product]             │
│                                                   │
│  CREDITS: 73 remaining  [Buy More]               │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Content Creation

Three paths (same as CONTENT-FLOW.md but refined):

**1. Templates (most users, most of the time)**

- Browse by category
- Pick a template
- Customize 1-3 options (outfit, setting, mood)
- Pick output type: image only, image + video, video with voice
- Generate
- Credit cost shown before you hit generate

**2. Describe It (power users)**

- Text box: describe what you want
- AI enhances the prompt automatically
- Same output type selection
- Generate

**3. Recreate (paste a URL)**

- Paste a TikTok/Reel URL
- AI analyzes the video: scene, outfit, action, vibe
- Recreate the concept with your Creator
- Customize if needed
- Generate

### Post-Generation

Every generation lands in a result screen:

```
┌─────────────────────────────────────────────────┐
│  4 variations generated                          │
│                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │      │ │      │ │      │ │      │           │
│  │  1   │ │  2   │ │  3   │ │  4   │           │
│  │      │ │      │ │      │ │      │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│     ○        ●        ○        ○                │
│                                                   │
│  NEXT STEPS:                                     │
│  [📥 Download]      — free, image only           │
│  [🎬 Make Video]    — 3 credits (5s)             │
│  [🗣️ Add Voice]     — 2 credits                  │
│  [👄 Lip Sync]      — 5 credits                  │
│  [✏️ Upscale 4K]    — 1 credit                   │
│  [🔄 Regenerate]    — costs same as original     │
│                                                   │
│  [💬 Generate Caption]  [📋 Copy Prompt]         │
│                                                   │
└─────────────────────────────────────────────────┘
```

Every action shows its credit cost BEFORE the user commits. No surprises.

---

## Pricing & Credits

### Credit Costs


| Action                                   | Credits | Why                              |
| ---------------------------------------- | ------- | -------------------------------- |
| Create new Creator (wizard + validation) | 5       | Multiple generations             |
| Generate images (4 variations)           | 2       | Base image gen                   |
| Upscale to 4K                            | 1       | Upscaler API call                |
| Generate video — 5 seconds               | 3       | Video gen is expensive           |
| Generate video — 10 seconds              | 5       | Longer = more compute            |
| Voice generation (per clip)              | 2       | ElevenLabs API                   |
| Lip sync video                           | 5       | Most expensive pipeline          |
| Prompt enhancement                       | 0       | Free (cheap LLM call, we eat it) |
| "Recreate" video analysis                | 1       | Vision API call                  |
| Caption generation                       | 0       | Free (cheap LLM call)            |
| Download with metadata strip             | 0       | Free (our differentiator)        |


### Plans


| Plan          | Price  | Credits/Month | Creators                         | Key Features                                                 |
| ------------- | ------ | ------------- | -------------------------------- | ------------------------------------------------------------ |
| **Free**      | $0     | 10            | Pre-mades only                   | Watermark, basic templates, browse pre-made Creators         |
| **Starter**   | $19/mo | 100           | 3 custom + all pre-mades         | No watermark, all templates, metadata strip                  |
| **Pro**       | $49/mo | 300           | 10 custom + all pre-mades        | Priority generation, video templates, voice, "Recreate" mode |
| **Unlimited** | $99/mo | 1000          | Unlimited custom + all pre-mades | Everything, batch generation, API access, priority queue     |


### Credit Packs (Buy Anytime)


| Pack   | Price | Credits | Per Credit |
| ------ | ----- | ------- | ---------- |
| Small  | $5    | 25      | $0.20      |
| Medium | $15   | 100     | $0.15      |
| Large  | $40   | 350     | $0.11      |
| XL     | $80   | 800     | $0.10      |


Credits from packs don't expire. Monthly plan credits reset each billing cycle.

### Course Bundles


| Bundle                      | Price | Includes                       |
| --------------------------- | ----- | ------------------------------ |
| Course only                 | $197  | Just the course                |
| Course + Starter (3 months) | $247  | Course + 3 months Starter plan |
| Course + Pro (3 months)     | $297  | Course + 3 months Pro plan     |
| Course + Pro (lifetime)     | $497  | Course + lifetime Pro access   |


### Price Positioning

- **Arcads:** $11/video, $110/mo for 10 videos. No images, no custom characters.
- **MakeUGC:** $29/mo flat.
- **Creatify:** $19-49/mo with credits.
- **Us:** $19-99/mo with credits. Create your own persistent AI influencer + full content pipeline. More value at every tier because we do images AND video AND voice AND custom characters.

---

## Content Library

Every piece of content gets saved automatically:

```
Creator: Sophia
├── Gym mirror selfie (Feb 28) — image + video
├── Coffee run lifestyle (Feb 27) — image
├── GRWM morning routine (Feb 26) — image series
├── Product testimonial: Protein (Feb 25) — video + voice
└── ... 43 more items
```

Users can:

- View all content per Creator
- Filter by type (image, video, voice)
- Re-download any past content
- Regenerate variations of past content
- See which template/prompt was used

---

## Template System

### Categories


| Category             | Example Templates                                                   | Output Type          |
| -------------------- | ------------------------------------------------------------------- | -------------------- |
| **Fitness**          | Gym selfie, workout clip, progress check, protein shake, running    | Image + Video        |
| **Lifestyle**        | Morning routine, coffee run, outfit check, apartment vibes, cooking | Image + Video        |
| **Get Ready**        | GRWM makeup, GRWM outfit, hair routine, skincare                    | Image Series + Video |
| **Talking Head**     | Storytime, hot take, advice, reaction, tips                         | Video + Voice        |
| **Product/UGC**      | Holding product, unboxing, review, testimonial                      | Video + Voice        |
| **Thirst/Aesthetic** | Mirror selfie, golden hour, beach, POV                              | Image + Video        |
| **Trending**         | Current viral formats (rotated weekly)                              | Varies               |


### Template Anatomy

Each template contains:

- **Scene prompt** — what the AI generates (with Creator injected)
- **Customization options** — 1-3 things the user can tweak (outfit, setting, mood)
- **Output type** — image, video, or both
- **Video motion prompt** — how the video should move/feel
- **Suggested captions** — ready to copy
- **Credit cost** — shown upfront
- **Example outputs** — so the user knows what to expect

### Template Freshness

New templates added regularly, especially:

- Trending viral formats (monitor TikTok/IG trends weekly)
- Seasonal content (summer, holidays, etc.)
- User-requested templates (feedback loop)

---

## Technical Architecture

### Frontend

- Next.js 14+ (App Router)
- Tailwind CSS + shadcn/ui
- Clerk for auth
- Stripe for payments + credit management

### Backend / Engine

The app calls `ai-creator-mgmt` engine for all generation:

- Templates = pre-built workflows in the engine, exposed via App Mode or API
- Creator wizard = workflow that handles prompt assembly + generation + validation
- The consumer app never exposes the node editor or workflow complexity

### Data Model (Simplified)

```
User
├── subscription (plan, credits remaining, credit packs purchased)
├── Creators[]
│   ├── name, niche, settings (all wizard inputs)
│   ├── baseImage, referenceImages[]
│   ├── voiceId (optional)
│   └── Content[]
│       ├── type (image/video/voice)
│       ├── templateUsed
│       ├── prompt
│       ├── outputUrls[]
│       ├── creditCost
│       └── createdAt
└── CreditTransactions[]
    ├── type (plan_grant / purchase / spend)
    ├── amount (+100 or -3)
    ├── description ("Generated 5s video for Sophia")
    └── createdAt
```

### Key Technical Decisions

- **Credits tracked in database, not Stripe.** Stripe handles billing. We track credit balance, deductions, and grants ourselves. Simpler, more flexible.
- **Generation is async.** User hits generate → job queued → poll for completion → show results. No blocking UI.
- **All outputs stored in S3.** Users can re-download anytime. We store everything.
- **Metadata stripping on every download.** Automatic. No toggle. It's a feature, not an option.
- **Two apps, one database?** TBD — the consumer app could share the engine's database or have its own with API calls to the engine. Separate databases is cleaner for isolation.

---

## What Makes This Win

1. **Custom AI influencers, not stock actors.** You build YOUR character. It's yours. It's consistent. It's not a face 10,000 other people are also using.
2. **Full pipeline.** Image → video → voice → lip sync → metadata strip → download. Arcads gives you a video and says "go edit it in CapCut." We give you the finished product.
3. **Persistence.** Your Creator lives on your dashboard. You build their content library over time. It's not one-off generations — it's an ongoing presence.
4. **The course flywheel.** Nobody else has a training pipeline feeding users into the product. Course students show up ready to use the app on day one.
5. **Usage-based pricing that's honest.** You see exactly what each action costs before you do it. No "unlimited" plans where we pray you don't use it.
6. **Metadata stripping included.** Every download comes clean. No AI fingerprints. Looks like it came from an iPhone. Nobody else does this as a default feature.

---

## Build Order

### Phase 1: MVP (Launch alongside course)

- Scaffold Next.js project with brand theme (shadcn/ui, fonts, colors)
- Auth (Clerk) + onboarding flow
- Creator wizard (all 8 steps)
- Image generation with Creator consistency
- 10 templates across 3 categories (fitness, lifestyle, aesthetic)
- Content results screen with download
- Metadata stripping on all downloads
- Credit system (balance tracking, deductions, display)
- Stripe integration (plans + credit packs)
- Content library (saved per Creator)
- Basic dashboard

### Phase 2: Video & Voice

- Image-to-video generation (5s, 10s)
- Voice generation (ElevenLabs)
- Lip sync for talking-head content
- Video templates (talking head, testimonial, storytime)
- Prompt enhancement (AI improves user descriptions)
- "Describe it" mode (free prompting)

### Phase 3: Growth Features

- "Recreate" mode (paste URL → analyze → regenerate)
- 50+ templates across all categories
- Trending templates (rotated weekly)
- Caption generator
- Batch generation (generate 10 images at once)
- Multiple Creators per account
- Creator variations (same person, different default looks)

### Phase 4: Toward Marketplace

- Public Creator profiles / portfolios
- "Available for hire" flag
- Brand accounts
- Brief posting + matching
- Agentic content fulfillment (AI agents autonomously complete briefs)

---

*This is the plan for the AI Creator App.*
*Engine: ai-creator-mgmt (built)*
*Course: ai-content-course (in production)*
*Marketplace: future layer on top of this app*

*Last updated: 2026-03-02*