# realinfluencer.ai — Technical Architecture

> How the app is built. Tech stack, data model, APIs, infrastructure.
> Last updated: 2026-03-10

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONSUMER APP                              │
│                    (realinfluencer.ai)                            │
│                                                                  │
│  Next.js 14+ App Router · Tailwind · shadcn/ui · Clerk          │
│                                                                  │
│  Routes:                                                         │
│  ├── (marketing)/ — landing, pricing                             │
│  ├── (auth)/ — sign-in, sign-up                                  │
│  ├── (workspace)/ — main app (chat, library, templates)          │
│  └── api/ — webhooks, generation endpoints                       │
│                                                                  │
├──────────────────────────┬──────────────────────────────────────┤
│     Server Actions       │        API Routes                     │
│     (mutations)          │        (webhooks, async)              │
├──────────────────────────┴──────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Prisma  │  │  Clerk  │  │  Stripe  │  │  AI Providers    │  │
│  │ (DB)    │  │  (Auth) │  │  (Pay)   │  │  Fal.ai, Gemini  │  │
│  └────┬────┘  └─────────┘  └──────────┘  │  ElevenLabs      │  │
│       │                                    └──────────────────┘  │
│       ▼                                                          │
│  PostgreSQL                    AWS S3                             │
│  (Railway)                     (us-east-1)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key decision:** For MVP, the consumer app calls AI providers (Fal.ai, Gemini) directly — not through ai-creator-mgmt. This keeps the stack simple and avoids an extra hop. The engine can be integrated later for advanced workflows.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (latest, App Router) | RSC, streaming, server actions, React 19 |
| Language | TypeScript (strict mode) | Type safety, better DX |
| Styling | Tailwind CSS v4 | Utility-first, matches brand guide |
| Components | shadcn/ui (New York style) | Accessible, customizable, not a dependency |
| Auth | Clerk | Best DX, handles OAuth/email/OTP |
| Database | PostgreSQL + Prisma | Type-safe ORM, migrations, Railway hosting |
| Storage | AWS S3 (us-east-1) | Media storage for generated content |
| Payments | Stripe | Subscriptions + metered billing for credit packs |
| State | Zustand | Lightweight client state for Creator context, chat |
| Validation | Zod | Runtime validation on server actions + forms |
| Hosting | Vercel (Pro plan) | Edge network, Git CD |
| AI: Images | Fal.ai (Nano Banana 2, Seedream, Flux) + Gemini native | Multi-model, best quality per cost |
| AI: Video | Fal.ai (Kling 3.0, Veo 3.1, Seedance) | Best character consistency in video |
| AI: Voice | ElevenLabs Turbo v3 | Industry standard TTS quality |
| AI: Lip Sync | Fal.ai (Hedra, MuseTalk) | Best accuracy/expressiveness |
| AI: Prompts | Gemini 2.5 Flash | Cheap, fast prompt enhancement |
| Metadata | Our metadata-service (Railway) | Strip AI markers, inject iPhone EXIF |
| Mobile | Capacitor (future) | Wrap web app for App Store listing |

### API Layer Decision: Server Actions (not tRPC)

Server actions for all mutations. No tRPC. Here's why:

- **Mutations:** Server actions are type-safe, validated with Zod, zero boilerplate. They work like tRPC mutations out of the box.
- **Queries:** Server components load data directly from Prisma — no API layer needed for reads.
- **Polling:** Lightweight API route handlers for generation status polling (client hits every 2-3s).
- **No WebSocket server needed.** tRPC subscriptions require persistent WS connections, which Vercel doesn't support. Polling + webhooks handles our real-time needs.

### Async Generation: Webhook Pattern

No long-running server functions. No separate worker server. Pattern:

```
1. Client → server action → fire request to Fal.ai → get job ID → return immediately (<1s)
2. Fal.ai processes (10s - 5min) → hits our webhook when done
3. Webhook route → download output → strip metadata → upload S3 → update DB (~10-30s)
4. Client polls GET /api/jobs/[id] every 2-3s → sees COMPLETED → shows results
```

All on Vercel. No extra infrastructure.

### Redis: Not for MVP

No Redis needed initially. If we need rate limiting or caching later, Vercel KV (managed Redis) plugs right in.

### Mobile Strategy

**Approach:** Build web-first with Next.js, then wrap with Capacitor for native iOS/Android apps.

- Phase 1: Ship the responsive web app (mobile-optimized)
- Phase 2: Wrap with Capacitor → App Store + Play Store listing
- This enables Apple Search Ads (requires App Store listing)
- One codebase throughout — no separate mobile app
- Can always rebuild native (React Native) later if the webview feel isn't good enough

**Design implication:** All UI must be built mobile-first. Touch targets 44px minimum. No hover-dependent interactions. The web app IS the mobile app.

---

## Brand Theme

### CSS Variables (shadcn/ui override)

```css
:root {
  --background: 40 33% 98%;        /* cream #FAF8F5 */
  --foreground: 0 0% 17%;          /* charcoal #2C2C2C */
  --primary: 0 0% 17%;             /* charcoal */
  --primary-foreground: 40 33% 98%; /* cream */
  --secondary: 30 23% 91%;         /* sand #F0EBE3 */
  --accent: 17 36% 87%;            /* blush #E8D5CF */
  --muted: 30 23% 91%;             /* sand */
  --muted-foreground: 0 0% 54%;    /* stone #8A8A8A */
  --border: 30 16% 88%;            /* light-line #E5E0DA */
  --radius: 0.75rem;
}
```

### Brand Colors (Tailwind extend)
- cream: #FAF8F5, sand: #F0EBE3, charcoal: #2C2C2C, graphite: #4A4A4A
- blush: #E8D5CF, sage: #C5CFC6, sky: #CADCE8, lavender: #D5D0E5, peach: #F2D8C9
- stone: #8A8A8A, mist: #B8B8B8

### Fonts
- Display: Playfair Display (headings, hero)
- Body: DM Sans (all body text)
- Mono: JetBrains Mono (labels, badges, code)

### Logo
- "Vi" mark with terracotta accent (#C4603A)

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing page
│   │   └── pricing/page.tsx
│   ├── (workspace)/
│   │   ├── layout.tsx                  # Workspace shell (sidebar + canvas)
│   │   ├── page.tsx                    # Default → Chat view
│   │   └── onboarding/page.tsx         # First-time user flow
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── clerk/route.ts          # User sync
│   │   │   └── stripe/route.ts         # Payment events
│   │   └── generate/
│   │       ├── image/route.ts          # Image generation endpoint
│   │       ├── video/route.ts          # Video generation endpoint
│   │       ├── voice/route.ts          # Voice generation endpoint
│   │       └── lipsync/route.ts        # Lip sync endpoint
│   ├── layout.tsx                      # Root layout (Clerk, fonts)
│   └── globals.css                     # Brand theme CSS variables
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── workspace/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx                  # Mobile top bar
│   │   ├── creator-list.tsx
│   │   ├── nav-links.tsx
│   │   └── credits-display.tsx
│   ├── chat/
│   │   ├── chat-view.tsx
│   │   ├── message-list.tsx
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   ├── mode-selector.tsx
│   │   ├── generation-result.tsx
│   │   ├── action-buttons.tsx
│   │   └── suggestion-chips.tsx
│   ├── creators/
│   │   ├── creator-studio.tsx          # Full wizard modal
│   │   ├── trait-tabs.tsx              # 5-tab picker
│   │   ├── preview-panel.tsx           # Left panel (silhouette → images)
│   │   ├── premade-library.tsx
│   │   ├── premade-card.tsx
│   │   └── creator-profile.tsx
│   ├── library/
│   │   ├── library-view.tsx
│   │   ├── content-card.tsx
│   │   ├── content-detail.tsx
│   │   └── library-filters.tsx
│   ├── templates/
│   │   ├── templates-view.tsx
│   │   └── template-card.tsx
│   ├── credits/
│   │   ├── credit-badge.tsx
│   │   ├── credit-confirmation.tsx
│   │   └── buy-credits.tsx
│   ├── settings/
│   │   ├── generation-settings.tsx
│   │   └── account-settings.tsx
│   └── onboarding/
│       └── welcome-screen.tsx
│
├── lib/
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # Clerk helpers
│   ├── stripe.ts                       # Stripe client + helpers
│   ├── s3.ts                           # S3 client + upload/download
│   ├── utils.ts                        # General utils (cn, etc.)
│   └── ai/
│       ├── prompt-builder.ts           # Assemble prompts from Creator + template
│       ├── prompt-enhancer.ts          # Gemini Flash prompt enhancement
│       ├── image-generator.ts          # Fal.ai / Gemini image generation
│       ├── video-generator.ts          # Fal.ai video generation
│       ├── voice-generator.ts          # ElevenLabs TTS
│       ├── lipsync-generator.ts        # Hedra / MuseTalk
│       ├── upscaler.ts                 # Clarity Upscaler via Fal.ai
│       └── metadata-stripper.ts        # Call metadata-service
│
├── stores/
│   ├── creator-store.ts                # Active creator, creator list
│   ├── chat-store.ts                   # Messages per creator
│   └── ui-store.ts                     # Active view, sidebar open, etc.
│
├── types/
│   ├── creator.ts
│   ├── content.ts
│   ├── template.ts
│   ├── chat.ts
│   └── credits.ts
│
├── data/
│   ├── templates.ts                    # Template definitions
│   └── premade-creators.ts             # Pre-made creator data
│
├── server/
│   └── actions/
│       ├── creator-actions.ts          # Create, update, delete creators
│       ├── content-actions.ts          # Save content, manage library
│       ├── credit-actions.ts           # Deduct, check balance, grant
│       └── generation-actions.ts       # Orchestrate generation pipelines
│
└── middleware.ts                        # Clerk auth middleware
```

---

## Data Model

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Users ───────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  clerkId       String    @unique
  email         String    @unique
  name          String?
  imageUrl      String?

  // Subscription
  plan          Plan      @default(FREE)
  stripeCustomerId    String?   @unique
  stripeSubscriptionId String?  @unique
  planCredits   Int       @default(10)     // Monthly credits (resets)
  packCredits   Int       @default(0)      // Purchased credits (don't expire)

  // Relations
  creators      Creator[]
  creditTransactions CreditTransaction[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Plan {
  FREE
  STARTER
  PRO
  UNLIMITED
}

// ─── Creators ────────────────────────────────────────

model Creator {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name          String
  niche         String[]
  isPreMade     Boolean   @default(false)
  preMadeId     String?   // Links to premade template if adopted

  // Base images
  baseImageUrl  String?
  baseImageUpscaledUrl String?

  // All wizard inputs stored as JSON
  settings      Json      @default("{}")

  // Reference images for consistency
  referenceImages Json    @default("[]") // Array of { type, url }

  // Voice
  voiceId       String?
  voiceProvider String?   // "elevenlabs"

  // Stats
  contentCount  Int       @default(0)
  lastUsedAt    DateTime?

  // Relations
  content       Content[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
}

// ─── Content ─────────────────────────────────────────

model Content {
  id            String    @id @default(cuid())
  creatorId     String
  creator       Creator   @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  type          ContentType
  status        ContentStatus @default(GENERATING)

  // Output
  url           String?       // S3 URL of final output
  thumbnailUrl  String?       // S3 URL of thumbnail
  outputs       Json          @default("[]") // Array of { url, selected } for variations

  // How it was made
  source        ContentSource
  templateId    String?
  prompt        String?       // The final assembled prompt
  userInput     String?       // What the user actually typed/selected

  // Generation details
  generationSettings Json     @default("{}")
  modelUsed     String?
  creditsCost   Int           @default(0)

  // Metadata
  caption       String?
  tags          String[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([creatorId])
  @@index([creatorId, type])
}

enum ContentType {
  IMAGE
  VIDEO
  TALKING_HEAD
}

enum ContentStatus {
  GENERATING
  COMPLETED
  FAILED
}

enum ContentSource {
  TEMPLATE
  FREEFORM
  RECREATE
  WIZARD       // Creator validation images
}

// ─── Credits ─────────────────────────────────────────

model CreditTransaction {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  type          TransactionType
  amount        Int       // Positive = grant, negative = spend
  balance       Int       // Balance AFTER this transaction

  description   String    // "Generated 4 images for Sophia"
  contentId     String?   // Link to content if spend
  stripePaymentId String? // Link to Stripe if purchase

  createdAt     DateTime  @default(now())

  @@index([userId])
  @@index([userId, createdAt])
}

enum TransactionType {
  PLAN_GRANT    // Monthly credit reset
  PURCHASE      // Credit pack bought
  SPEND         // Used credits for generation
  REFUND        // Generation failed, credits returned
  BONUS         // Promo or course bundle credits
}

// ─── Generation Jobs ─────────────────────────────────

model GenerationJob {
  id            String    @id @default(cuid())
  userId        String
  contentId     String?

  type          String    // "image", "video", "voice", "lipsync", "upscale"
  status        JobStatus @default(QUEUED)

  // Provider tracking
  provider      String    // "fal", "gemini", "elevenlabs"
  providerJobId String?   // External job ID for polling
  modelId       String    // "fal-ai/nano-banana-2", etc.

  // Input/output
  input         Json      // Prompt, settings, references
  output        Json?     // Results from provider

  // Cost tracking
  estimatedCost Float?    // Estimated API cost in USD
  actualCost    Float?    // Actual API cost

  // Timing
  startedAt     DateTime?
  completedAt   DateTime?
  error         String?

  createdAt     DateTime  @default(now())

  @@index([userId, status])
  @@index([providerJobId])
}

enum JobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## API Design

### Server Actions (mutations)

Server actions handle all state-changing operations:

```typescript
// server/actions/creator-actions.ts
"use server"

createCreator(data: CreatorFormData): Promise<Creator>
updateCreator(id: string, data: Partial<Creator>): Promise<Creator>
deleteCreator(id: string): Promise<void>
adoptPreMade(preMadeId: string): Promise<Creator>

// server/actions/generation-actions.ts
"use server"

generateImages(creatorId: string, prompt: string, settings: GenSettings): Promise<GenerationJob>
generateVideo(imageUrl: string, motionPrompt: string, duration: number): Promise<GenerationJob>
generateVoice(script: string, voiceId: string): Promise<GenerationJob>
generateLipSync(imageUrl: string, audioUrl: string): Promise<GenerationJob>
upscaleImage(imageUrl: string): Promise<GenerationJob>
enhancePrompt(userInput: string, creatorId: string): Promise<string>

// server/actions/credit-actions.ts
"use server"

checkBalance(userId: string): Promise<{ planCredits: number, packCredits: number }>
deductCredits(userId: string, amount: number, description: string): Promise<CreditTransaction>
refundCredits(userId: string, amount: number, reason: string): Promise<CreditTransaction>

// server/actions/content-actions.ts
"use server"

saveContent(data: ContentData): Promise<Content>
deleteContent(id: string): Promise<void>
getContentLibrary(creatorId: string, filters: ContentFilters): Promise<Content[]>
```

### API Routes (webhooks, async)

```typescript
// api/webhooks/clerk/route.ts
// Syncs Clerk user events → our User table

// api/webhooks/stripe/route.ts
// Handles: subscription.created, subscription.updated, subscription.deleted
// Handles: checkout.session.completed (credit pack purchases)
// Handles: invoice.paid (monthly credit reset)

// api/generate/image/route.ts
// POST: Accepts generation request, queues job, returns jobId
// GET: Poll for job status by jobId

// api/generate/video/route.ts
// Same pattern as image

// api/generate/voice/route.ts
// Same pattern

// api/generate/lipsync/route.ts
// Same pattern
```

---

## Generation Pipeline Integration

### Pipeline A: Static Images

```
User Input + Creator Refs + Template
         │
         ▼
  ┌──────────────┐
  │ Prompt Build  │  Gemini 2.5 Flash assembles full prompt
  │ (~$0.001)     │  from Creator settings + user input + template
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Image Gen    │  Nano Banana 2 (Gemini 3.1 Flash Image)
  │ 4 variations │  14 ref images, up to 4K
  │ (~$0.08)     │  via Fal.ai or Gemini native API
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Upscale      │  Clarity Upscaler (Fal.ai)
  │ (optional)   │  4K output
  │ (~$0.03)     │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Metadata     │  Our service (Railway)
  │ Strip + EXIF │  Strip C2PA/SynthID, inject iPhone EXIF
  │ (~$0.00)     │
  └──────┬───────┘
         ▼
  Upload to S3 → Return URL to client

  Total API cost: ~$0.10-0.15
  Credits charged: 2 (images) + 1 (upscale, optional)
```

### Pipeline B: Video (Non-Talking)

```
Pipeline A output (selected image)
         │
         ▼
  ┌──────────────┐
  │ Image-to-    │  Kling 3.0 (default)
  │ Video Gen    │  5s (~$0.10) or 10s (~$0.20)
  │              │  via Fal.ai
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Metadata     │  ffmpeg H.264 re-encode + QuickTime metadata
  │ Strip        │
  └──────┬───────┘
         ▼
  Upload to S3

  Total API cost: ~$0.20-0.40
  Credits charged: 3 (5s) or 5 (10s)
```

### Pipeline C: Talking Head

```
User Script
    │
    ├──▶ ┌──────────────┐
    │    │ Voice Gen    │  ElevenLabs Turbo v3
    │    │ (~$0.05)     │  30s script ≈ 500 chars
    │    └──────┬───────┘
    │           │ audio file
    │           ▼
    └──▶ ┌──────────────┐
         │ Image Gen    │  Front-facing, mouth-neutral
         │ (~$0.02)     │  portrait for lip sync
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Lip Sync     │  Hedra Character-3 or MuseTalk
         │ (~$3.00/30s) │  Animate face to match speech
         └──────┬───────┘
                ▼
         ┌──────────────┐
         │ Metadata     │
         │ Strip        │
         └──────┬───────┘
                ▼
         Upload to S3

  Total API cost: ~$3.10 (30s)
  Credits charged: 2 (voice) + 5 (lip sync) = 7 minimum
```

### Default Model Stack

| Step | Default Model | Provider | Fallback |
|------|--------------|----------|----------|
| Prompt enhancement | Gemini 2.5 Flash | Google API | — |
| Image generation | Nano Banana 2 (Gemini 3.1 Flash Image) | Gemini / Fal.ai | Seedream 4.5 |
| Image upscale | Clarity Upscaler | Fal.ai | Real-ESRGAN |
| Video (non-talking) | Kling 3.0 | Fal.ai | Seedance 2.0 |
| Voice/TTS | ElevenLabs Turbo v3 | ElevenLabs API | Fish Speech 1.5 |
| Lip sync | MuseTalk 1.5 | Fal.ai | Hedra Character-3 |
| Metadata strip | Custom service | Railway | — |

---

## Auth & Authorization

### Clerk Setup

- Email + password, Google OAuth, OTP
- Middleware protects all `(workspace)` routes
- Public routes: landing, pricing, sign-in, sign-up, API webhooks
- Clerk webhook syncs user data to our User table

### Authorization Rules

| Action | Free | Starter | Pro | Unlimited |
|--------|------|---------|-----|-----------|
| Use pre-made creators | ✅ | ✅ | ✅ | ✅ |
| Create custom creators | ❌ | 3 max | 10 max | Unlimited |
| Basic templates | ✅ | ✅ | ✅ | ✅ |
| Video templates | ❌ | ❌ | ✅ | ✅ |
| Voice/lip sync | ❌ | ❌ | ✅ | ✅ |
| Recreate mode | ❌ | ❌ | ✅ | ✅ |
| Batch generation | ❌ | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |
| Priority queue | ❌ | ❌ | ✅ | ✅ |
| Watermark-free | ❌ | ✅ | ✅ | ✅ |

---

## Storage & Media

### S3 Structure

```
s3://realinfluencer-media/
├── users/{userId}/
│   ├── creators/{creatorId}/
│   │   ├── base.png                # Base reference image
│   │   ├── base-upscaled.png       # 4K base
│   │   ├── references/             # Validation images
│   │   │   ├── side-profile.png
│   │   │   ├── three-quarter.png
│   │   │   ├── outfit-change.png
│   │   │   ├── outdoor.png
│   │   │   └── closeup.png
│   │   └── content/
│   │       ├── {contentId}/
│   │       │   ├── variations/     # All 4 generated variations
│   │       │   ├── selected.png    # User's pick
│   │       │   ├── video.mp4       # If video generated
│   │       │   └── audio.mp3       # If voice generated
│   │       └── ...
│   └── ...
└── premade/                        # Pre-made creator assets
    ├── {preMadeId}/
    │   ├── avatar.png
    │   ├── references/
    │   └── samples/
    └── ...
```

### Upload/Download Flow

- Generated content: AI provider returns URL → download to server → upload to S3 → store S3 URL in DB
- User downloads: Generate signed S3 URL → redirect → auto-expire after 1 hour
- Metadata stripping happens between AI output and S3 upload

---

## Credit System Implementation

### Credit Flow

```
User triggers generation
         │
         ▼
  ┌──────────────┐
  │ Check balance │  planCredits + packCredits >= cost?
  │               │  If no → show "insufficient credits" + upsell
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Reserve      │  Deduct from packCredits first (they don't expire)
  │ credits      │  Then from planCredits
  │              │  Create CreditTransaction (SPEND, pending)
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Run          │  Queue generation job
  │ generation   │
  └──────┬───────┘
         │
    ┌────┴────┐
    ▼         ▼
 Success    Failure
    │         │
    ▼         ▼
 Confirm   Refund credits
 transaction  (REFUND transaction)
```

### Monthly Reset Logic

On Stripe `invoice.paid` webhook:
1. Set `user.planCredits` to plan's monthly allowance
2. Create CreditTransaction (PLAN_GRANT)
3. Pack credits (`packCredits`) remain untouched

### Credit Deduction Priority

1. Pack credits first (they don't expire, spend them)
2. Plan credits second (they reset, use-or-lose)

---

## Generation Job System

### Async Generation Flow

1. User hits "Generate" → server action validates credits + creates GenerationJob (QUEUED)
2. Server action calls AI provider API → gets provider job ID
3. Update GenerationJob to PROCESSING with providerJobId
4. Client polls `GET /api/generate/{type}?jobId={id}` every 2 seconds
5. Server checks provider status → returns progress
6. When complete: download output → strip metadata → upload to S3 → create Content record → update GenerationJob to COMPLETED
7. Client sees results in chat

### Error Handling

- Provider timeout: Mark FAILED, refund credits, show error in chat
- Provider error: Retry once, if still fails → FAILED + refund
- Rate limiting: Queue with backoff, show "generating..." to user

---

## Stripe Integration

### Products & Prices

| Product | Stripe Price ID | Type |
|---------|----------------|------|
| Starter Plan | price_starter_monthly | Recurring / month |
| Pro Plan | price_pro_monthly | Recurring / month |
| Unlimited Plan | price_unlimited_monthly | Recurring / month |
| 25 Credits | price_credits_25 | One-time |
| 100 Credits | price_credits_100 | One-time |
| 350 Credits | price_credits_350 | One-time |
| 800 Credits | price_credits_800 | One-time |

### Webhook Events

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Set user plan, grant initial credits |
| `customer.subscription.updated` | Update plan, adjust credits if upgrade |
| `customer.subscription.deleted` | Set plan to FREE, zero planCredits |
| `invoice.paid` | Monthly credit reset for active subscriptions |
| `checkout.session.completed` | For credit pack purchases: add packCredits |

---

## Component Patterns

### shadcn/ui Usage

```bash
# Core components to install
npx shadcn@latest add button card input label avatar badge separator
npx shadcn@latest add scroll-area tooltip dialog sheet skeleton textarea
npx shadcn@latest add dropdown-menu tabs slider select radio-group checkbox
npx shadcn@latest add form progress alert-dialog sonner
```

### Typography

```tsx
// Hero headline
<h1 className="font-display text-5xl font-normal tracking-tight">

// Section header
<h2 className="font-display text-3xl">

// Card title
<h3 className="text-xl font-medium">

// Body text
<p className="text-muted-foreground leading-relaxed">

// Label/caption
<span className="font-mono text-xs uppercase tracking-wider text-stone">
```

### Component Patterns

- Use React Server Components where possible (data fetching, static UI)
- Client components only for interactivity (chat, wizard, mode selection)
- Server actions for all mutations
- Zod schemas for all runtime validation
- `next/image` for all images
- Skeleton loaders for async content
- Optimistic updates for credit deductions

---

## Monitoring & Observability

### What to Track

| Metric | Where |
|--------|-------|
| Generation success/failure rate | GenerationJob table |
| API cost per generation | GenerationJob.actualCost |
| Credits used per user per day | CreditTransaction aggregation |
| Time to generate (by type) | GenerationJob started → completed |
| Most used templates | Content.templateId aggregation |
| Creator count per user | Creator count |
| Conversion: free → paid | User plan changes |

### Error Tracking

- Vercel built-in error tracking for server errors
- Generation failures logged in GenerationJob with error message
- Failed credit refunds flagged for manual review

---

## Security Considerations

- All generation endpoints require authenticated user (Clerk middleware)
- Credits checked server-side before any generation (never trust client)
- S3 URLs are signed with 1-hour expiry (no public bucket access)
- Stripe webhooks verified with signing secret
- Clerk webhooks verified with Svix
- Input prompts sanitized (no injection into AI prompts)
- Rate limiting on generation endpoints (per-user, per-minute)
- Content moderation via model-level safety checks (safety_tolerance settings)

---

*Technical architecture for realinfluencer.ai*
*Product spec: see PRODUCT-SPEC.md*
*Implementation plan: see IMPLEMENTATION-PLAN.md*
