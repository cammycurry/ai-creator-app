# realinfluencer.ai — Complete Build Plan

> Everything needed to go from current state → deployed, revenue-generating MVP.
> Created: 2026-03-15
> Based on: V2 Product Spec, Technical Architecture, all course materials, full codebase audit

---

## Current State (What's Working)

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js 16 + Tailwind v4 scaffold | ✅ Done | App Router, TypeScript |
| Clerk auth | ✅ Done | Sign-in/up, OAuth, webhook sync |
| Railway PostgreSQL + Prisma | ✅ Done | 5 models, migrations applied |
| Workspace shell | ✅ Done | Sidebar, header, canvas — prototype CSS |
| Creator Studio wizard | ✅ Done | 5-tab visual picker, generate 4 images, pick one, save |
| Image gen (Gemini Nano Banana Pro) | ✅ Done | `gemini-3-pro-image-preview`, safety OFF, AIAC prompt structure |
| Credit system backend | ✅ Done | Deduct, refund, grant, transaction logging |
| Creator CRUD | ✅ Done | Create, read, update, delete + plan limit enforcement |
| Zustand stores (3) | ✅ Done | creator-store, ui-store, studio-store |
| Loading skeletons | ✅ Done | Sidebar + header + canvas shimmer |
| 21 shadcn/ui components | ✅ Done | Installed and configured |

## Critical Gaps (What's Broken/Missing)

1. **Images are base64 data: URLs** — won't scale, eats memory, can't share
2. **No content generation** — floating input is decorative, can't make content
3. **No Stripe** — can't charge anyone
4. **No onboarding** — new users see empty workspace
5. **No validation step** — wizard skips consistency check (5 angles)
6. **No content library** — UI shell only, no data fetch
7. **No templates** — the thing that makes this accessible to non-prompt-writers
8. **No prompt enhancement** — users would need to write raw prompts
9. **No metadata stripping** — AI fingerprints on every download
10. **No landing page** — prototype HTML exists but not in React

---

## Build Order

### Priority: FOUNDATION → GENERATION → MONETIZATION → POLISH → LAUNCH

Each task has:
- **What**: Clear deliverable
- **Why**: Business justification
- **Files**: What to create/modify
- **Depends on**: Prerequisites
- **Acceptance**: How to verify it works

---

## PHASE A: Fix Foundation (Tasks 1-3)

These unblock everything else. Without S3 and content generation, nothing works.

### Task 1: S3 Image Storage

**What:** Replace all base64 data: URLs with proper S3 uploads. Generated images go to S3, URLs stored in DB.

**Why:** data: URLs eat server memory, break on large images, can't be shared/cached, and will crash in production. This is the #1 blocker.

**Files to create:**
- `src/lib/s3.ts` — S3 client + upload/download helpers

**Files to modify:**
- `src/server/actions/generate-actions.ts` — upload to S3 after generation instead of returning base64
- `prisma/schema.prisma` — no changes needed (baseImageUrl already exists)

**Steps:**
1. Install `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
2. Create S3 client with env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, AWS_REGION)
3. Create `uploadImage(buffer, key, contentType)` → returns S3 URL
4. Create `getSignedUrl(key)` → returns time-limited download URL
5. Modify `generateCreatorImages` — after Gemini returns base64, upload each to S3 at `users/{userId}/creators/wizard/{timestamp}-{i}.png`, return S3 URLs
6. Modify `finalizeCreator` — `baseImageUrl` and `referenceImages` store S3 URLs
7. Set up CORS on S3 bucket for `realinfluencer.ai` + `localhost:3000`

**S3 bucket structure:**
```
s3://realinfluencer-media/
├── users/{userId}/
│   ├── creators/{creatorId}/
│   │   ├── base.png
│   │   ├── references/
│   │   └── content/{contentId}/
│   └── ...
└── premade/
```

**Env vars needed:**
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=realinfluencer-media
```

**Acceptance:**
- Generated images return https:// URLs, not data: URLs
- Images load in browser from S3
- Creator baseImageUrl in DB is an S3 URL

---

### Task 2: Content Generation Pipeline (Image)

**What:** Wire the floating input bar so users can type a prompt → get images generated for their active Creator. Full Pipeline A from the tech architecture.

**Why:** This IS the product. Without content generation, the app does nothing after creating a Creator.

**Pipeline A flow:**
```
User types prompt
    → Prompt enhancement (Gemini 2.5 Flash)
    → Prompt assembly (Creator refs + enhanced prompt)
    → Image generation (Nano Banana Pro × 4)
    → Upload to S3
    → Create Content record in DB
    → Display in canvas
```

**Files to create:**
- `src/lib/ai/prompt-builder.ts` — assemble full prompt from Creator settings + user input
- `src/lib/ai/prompt-enhancer.ts` — Gemini Flash enriches user's casual input into detailed prompt
- `src/server/actions/content-actions.ts` — save content, manage library, delete
- `src/types/chat.ts` — message types for chat/generation flow

**Files to modify:**
- `src/server/actions/generate-actions.ts` — add `generateContent()` server action (distinct from wizard)
- `src/components/workspace/workspace-canvas.tsx` — wire floating input to generation
- `src/stores/creator-store.ts` — add content list to store

**Prompt builder logic (from AIAC master prompts + courses):**
```
For content generation (NOT wizard):
1. Start with "That [woman/man] from the reference image"
2. Add scene/context from user input or template
3. Add creator's locked traits (hair, eyes, build, skin)
4. Add "raw iPhone photography style"
5. Add quality markers: "visible skin texture, natural lighting, hyper-realistic"
6. NEVER use "a woman" — always "that woman" for consistency
```

**Prompt enhancer logic:**
```
System prompt to Gemini Flash:
"You are a professional AI photographer's assistant. Take the user's casual
description and expand it into a detailed image generation prompt. Include:
scene/setting, lighting, pose, camera angle, mood/atmosphere. Keep the
character reference and style anchors unchanged. Output only the enhanced prompt."

Input: "coffee shop, cream sweater, cozy vibes"
Output: "That woman is sitting at a corner table in a warm coffee shop, wearing a
cream oversized knit sweater, hands wrapped around a ceramic mug, soft morning
light streaming through the window, wooden table with scattered napkins, warm
color tones, relaxed smile, shot from across the table, raw iPhone photography
style, visible skin texture with natural pores..."
```

**Credit cost:** 2 credits per generation (4 images)

**Acceptance:**
- Type "gym selfie, black leggings" → get 4 images of active Creator in that scene
- Images display inline in the canvas
- Content record saved in DB with prompt, S3 URLs, credit cost
- Credits deducted correctly

---

### Task 3: Content Display Grid

**What:** Canvas shows generated content for the active Creator. Grid of thumbnails that expand to full view with action buttons.

**Why:** Users need to see and access their generated content.

**Files to create:**
- `src/components/workspace/content-grid.tsx` — responsive grid of content cards
- `src/components/workspace/content-card.tsx` — thumbnail + type badge + date
- `src/components/workspace/content-detail.tsx` — full preview dialog with actions

**Files to modify:**
- `src/components/workspace/workspace-canvas.tsx` — swap empty state for content grid
- `src/server/actions/content-actions.ts` — add `getContentForCreator()` query

**Content card shows:**
- Thumbnail (from S3)
- Type badge (Photo)
- Relative date ("2h ago")
- Click → expand to ContentDetail dialog

**Content detail dialog shows:**
- Full-size image
- Original prompt
- Download button (free)
- Regenerate button (2 credits)
- Upscale button (1 credit) — stubbed for now
- Make Video button (3-5 credits) — stubbed for now

**Acceptance:**
- Canvas shows real content from DB for active Creator
- Switching Creators updates the grid
- Empty state when no content ("Generate your first content →")
- Download works (from S3 URL)

---

## PHASE B: Make It a Product (Tasks 4-8)

These turn the shell into something people would actually pay for.

### Task 4: Chat-First Workspace

**What:** Replace the current floating input + empty canvas with a proper chat interface. Messages flow top-to-bottom. User messages right-aligned, assistant responses (with inline images) left-aligned.

**Why:** The V2 product spec defines a chat-first workspace. This is how users interact with the app — like talking to ChatGPT but it generates content.

**Files to create:**
- `src/components/chat/chat-view.tsx` — main chat container
- `src/components/chat/message-list.tsx` — scrollable message area
- `src/components/chat/chat-message.tsx` — individual message (user or assistant)
- `src/components/chat/chat-input.tsx` — input bar with mode selector
- `src/components/chat/mode-selector.tsx` — Photo | Video | Talking Head pills
- `src/components/chat/generation-result.tsx` — inline 2×2 image grid
- `src/components/chat/action-buttons.tsx` — post-generation actions
- `src/components/chat/suggestion-chips.tsx` — quick action suggestions
- `src/stores/chat-store.ts` — messages per creator

**Chat input bar:**
- Mode pills: Photo (active) | Video (coming soon) | Talking Head (coming soon)
- Auto-expanding textarea
- Count selector (1-4 images, default 4)
- Cost badge showing credit cost before sending
- Send button

**Message types:**
- `user` — right-aligned, user's prompt
- `assistant-text` — left-aligned text response
- `assistant-generation` — left-aligned with inline image grid + action buttons
- `suggestion` — suggestion chips for next actions

**Welcome message per Creator:**
```
"Hey! I'm ready to create content as {creatorName}. Try something like:
• 'Coffee shop morning, cream sweater'
• 'Gym mirror selfie, black sports bra'
• 'Golden hour portrait, flowing dress'
Or browse Templates for one-click ideas →"
```

**Acceptance:**
- Chat shows conversation history per Creator
- Switching Creators shows different chat history
- Typing prompt → assistant shows generating state → inline images appear
- Action buttons work (download, regenerate)
- Welcome message appears for new Creators

---

### Task 5: Template System

**What:** 15-20 pre-built content recipes organized by category. Each template packages a scene prompt + customization options + credit cost into a one-click experience.

**Why:** Templates are what make this accessible. Without them it's just a prompt box, and most users don't know how to write prompts.

**Files to create:**
- `src/types/template.ts` — template type definition
- `src/data/templates.ts` — all template definitions
- `src/components/templates/templates-view.tsx` — categorized grid
- `src/components/templates/template-card.tsx` — card with preview
- `src/components/templates/template-customize.tsx` — customization dialog

**Template type:**
```typescript
type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  icon: string;
  description: string;
  outputType: 'IMAGE' | 'VIDEO' | 'TALKING_HEAD';
  creditsCost: number;
  scenePrompt: string; // Base prompt with {placeholders}
  customizableFields: CustomField[];
  suggestedCaptions: string[];
  tags: string[];
};

type CustomField = {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: string[];
  default?: string;
};
```

**Templates to create (from courses — these are the content types that actually perform):**

**Fitness (4):**
- Gym mirror selfie — customize: outfit, hair style
- Workout clip — customize: exercise, setting
- Progress check — customize: pose, lighting
- Post-workout — customize: outfit, drink/towel

**Lifestyle (4):**
- Morning coffee — customize: outfit, coffee shop vs home
- Outfit of the day — customize: outfit, setting
- Golden hour portrait — customize: outfit, location (beach/city/park)
- Cozy at home — customize: outfit, activity (reading/phone/laptop)

**Aesthetic/Thirst (4):**
- Mirror selfie — customize: outfit, setting (bathroom/gym/bedroom)
- Beach/pool day — customize: swimwear, pose
- Car selfie — customize: outfit, car interior
- Getting ready — customize: stage (hair/makeup/outfit)

**Product/UGC (2):**
- Holding product — customize: product description, setting
- Product close-up — customize: product, angle

**Talking Head (2) — stubbed for Phase 2:**
- Storytime — customize: topic, emotion
- Hot take — customize: topic

**How templates work in chat:**
1. User clicks template in Templates view
2. App switches to Chat view
3. Template appears as a customization card in chat
4. User selects options → sees credit cost → hits Generate
5. App assembles prompt: template.scenePrompt + Creator refs + customizations
6. Runs through Pipeline A

**Acceptance:**
- Templates view shows all templates organized by category
- Clicking template opens customization
- Customized template generates correct images
- Template prompts use "that woman/man" + Creator traits

---

### Task 6: Prompt Enhancement

**What:** Before generation, user's casual input gets enhanced by Gemini 2.5 Flash into a detailed, optimized prompt.

**Why:** Users type "coffee shop vibes" — the model needs "That woman sitting at a rustic wooden table in a warm-lit café, cream knit sweater, ceramic mug in hands, soft morning window light, shallow depth of field, raw iPhone photography, visible skin texture..." Course materials are very clear: the LLM prompt layer is what makes the output good.

**Files to create:**
- `src/lib/ai/prompt-enhancer.ts`

**System prompt for enhancer:**
```
You are a professional AI photography director. Your job is to take a user's
casual content description and expand it into a detailed image generation prompt.

Rules:
- Always start with "That [woman/man]" (never "a woman")
- Include: scene/setting, lighting conditions, outfit details, pose/body language,
  camera angle, mood/atmosphere
- Always end with: "raw iPhone photography style, visible natural skin texture
  with pores and fine details, hyper-realistic"
- Keep it under 200 words
- Never add makeup, filters, or digital enhancement descriptions
- Use the director mindset: describe feelings and atmosphere, not camera specs
- Include sensory details: textures, materials, temperature, time of day

Output ONLY the enhanced prompt, nothing else.
```

**Model:** `gemini-2.5-flash-preview` (cheap, fast)
**Cost:** ~$0.001 per enhancement — we eat it (free to user)

**Acceptance:**
- "gym selfie" becomes a detailed, high-quality prompt
- Enhanced prompt maintains Creator identity ("that woman")
- Enhancement adds scene, lighting, mood, realism markers
- Cost tracked but not charged to user

---

### Task 7: Creator Validation Step

**What:** After the user picks their base image in the wizard, generate 5 test scenes to validate the Creator looks consistent across angles/contexts before saving.

**Why:** Courses are VERY clear on this — the multi-angle consistency drill is how you verify a Creator will work. Without it, users save Creators that look great in one pose but break in others. This also builds confidence in the product.

**Validation scenes (from consistency course):**
1. Side profile (same outfit, same studio)
2. 3/4 angle left (same outfit, same studio)
3. Outfit change — casual (jeans + t-shirt, outdoor)
4. Close-up portrait (face detail, natural lighting)
5. 3/4 angle right (same outfit, same studio)

**Prompt structure for each (from master-prompts.md):**
```
"That [woman/man] [from the base image], [specific angle/scene],
[same locked traits: hair, eyes, skin, build],
[scene-specific outfit/setting],
raw iPhone photography style, hyper-realistic, visible skin texture"
```

**Files to modify:**
- `src/components/studio/studio-preview.tsx` — add validation phase UI
- `src/stores/studio-store.ts` — add validation phase + images
- `src/server/actions/generate-actions.ts` — add `generateValidationImages()` action

**Wizard flow becomes:**
```
Customize (5 tabs) → Generate (4 images) → Pick (select 1) → Validate (5 angles) → Review → Name & Save
```

**Credit cost:** Included in the 5 credits for wizard (already accounts for this)

**Acceptance:**
- After picking base image, 5 validation scenes generate automatically
- User sees base + 5 scenes side by side
- User can re-generate validation if not happy
- If validation looks bad, user can go back to Pick phase
- Save only available after validation review

---

### Task 8: Onboarding Flow

**What:** First-time users (no Creators) see a welcome screen with two paths: Build Your Own or Pick Pre-Made.

**Why:** Empty dashboards kill activation. New users need to create their first Creator immediately.

**Files to create:**
- `src/components/onboarding/welcome-screen.tsx`

**Files to modify:**
- `src/app/workspace/page.tsx` — detect first-time user, show onboarding

**Flow:**
```
New user signs up → lands at /workspace
    → No creators in DB? → Show WelcomeScreen
    → "Build Your Own" → Opens Creator Studio
    → "Pick a Pre-Made" → Opens Pre-Made Library (Task 12)
    → After either → workspace with active Creator + welcome chat message
```

**Welcome screen design:**
- Full-canvas, centered
- Headline: "Create your first AI influencer"
- Subhead: "Build a custom character or pick from our collection"
- Two cards side by side:
  - **Build Your Own** — "Full creative control. Pick every trait." → Opens Creator Studio
  - **Pick a Pre-Made** — "Ready to go. Start creating content immediately." → Opens Pre-Made Library
- Bottom: "10 free credits to get started"

**Acceptance:**
- New users never see empty workspace
- Both paths result in an active Creator
- After creation, chat shows welcome message with suggestions
- Returning users with Creators go straight to workspace

---

## PHASE C: Monetization (Tasks 9-11)

Can't make money without Stripe.

### Task 9: Stripe Integration

**What:** Subscription plans + credit pack one-time purchases + webhook handler.

**Why:** Revenue. Period.

**Files to create:**
- `src/lib/stripe.ts` — Stripe client + helpers
- `src/app/api/webhooks/stripe/route.ts` — payment webhook handler
- `src/components/settings/plan-settings.tsx` — current plan + upgrade UI

**Files to modify:**
- `src/server/actions/credit-actions.ts` — wire monthly reset to invoice.paid webhook
- `prisma/schema.prisma` — stripeCustomerId and stripeSubscriptionId already exist

**Stripe products to create:**
- Starter Plan ($19/mo, 100 credits, 3 custom creators)
- Pro Plan ($49/mo, 300 credits, 10 custom creators)
- Unlimited Plan ($99/mo, 1000 credits, unlimited creators)
- 25 Credits ($5)
- 100 Credits ($15)
- 350 Credits ($40)
- 800 Credits ($80)

**Webhook events to handle:**
- `customer.subscription.created` → set plan, grant credits
- `customer.subscription.updated` → update plan
- `customer.subscription.deleted` → revert to FREE
- `invoice.paid` → monthly credit reset
- `checkout.session.completed` → add pack credits

**Acceptance:**
- Can subscribe to any plan via Stripe Checkout
- Can buy credit packs
- Monthly credits reset on billing date
- Downgrade/cancel reverts to FREE
- All webhook events handled correctly

---

### Task 10: Credit UI

**What:** Users see their credit balance, get cost confirmations before generating, and can buy more credits.

**Why:** Users need to see costs upfront. Surprise charges = churn. The credit display also drives upsell.

**Files to create:**
- `src/components/credits/credit-badge.tsx` — balance display (sidebar footer)
- `src/components/credits/credit-confirmation.tsx` — "This will cost X credits" dialog
- `src/components/credits/buy-credits.tsx` — credit pack purchase modal

**Files to modify:**
- `src/components/workspace/app-sidebar.tsx` — replace hardcoded credits with real balance
- `src/components/chat/chat-input.tsx` — show credit cost before send
- `src/components/chat/action-buttons.tsx` — show cost on each action button

**Credit display states:**
- Normal: "73 credits" with icon
- Low: "12 credits" in warning color + "Buy More" link
- Zero: "0 credits — Buy credits to continue" blocks generation

**Confirmation dialog (before any generation):**
```
"Generate 4 photos — 2 credits"
[Cancel] [Generate ✓]
```

**Buy credits modal:**
- Shows current balance
- 4 pack options with per-credit pricing
- Links to Stripe Checkout

**Acceptance:**
- Real credit balance in sidebar
- Cost shown before every generation
- Low/zero states trigger buy prompts
- Can purchase credits from the modal

---

### Task 11: Landing Page

**What:** Port prototype/landing.html to React as the marketing home page at `/`.

**Why:** Need a public-facing page that sells the product, shows pricing, has sign-up CTAs.

**Files to create:**
- `src/app/(marketing)/page.tsx` — landing page
- `src/app/(marketing)/layout.tsx` — marketing layout (no sidebar)
- `src/app/(marketing)/pricing/page.tsx` — pricing page

**The existing prototype has:**
- Hero section with "Vi" branding
- Feature highlights
- Pricing tiers

**Route structure:**
- `/` → landing page (public)
- `/pricing` → pricing page (public)
- `/workspace` → app (protected)
- `/sign-in`, `/sign-up` → auth (public)

**Acceptance:**
- Landing page renders at `/`
- Pricing page shows all plans + credit packs
- Sign-up CTA links to /sign-up
- Unauthenticated users can browse landing + pricing
- Authenticated users can still access landing

---

## PHASE D: Polish & Ship (Tasks 12-16)

### Task 12: Pre-Made Creator Library

**What:** Gallery of 10-15 ready-to-go AI influencers. Browse by niche, preview samples, adopt with one click.

**Why:** Free users can't create custom Creators. Pre-mades are their only option and the gateway to upgrading.

**Files to create:**
- `src/data/premade-creators.ts` — pre-made data with placeholder images
- `src/components/creators/premade-library.tsx` — browsable grid
- `src/components/creators/premade-card.tsx` — card with avatar + info

**Files to modify:**
- `src/server/actions/creator-actions.ts` — add `adoptPreMade()` action

**Pre-mades to create (5 niches × 2-3 each):**
- Fitness: 2-3 (athletic woman, fitness man, yoga woman)
- Lifestyle: 2-3 (coffee girl, travel woman, city man)
- Beauty: 2 (glamour woman, natural beauty)
- Tech: 2 (tech woman, startup man)
- Fashion: 2 (streetwear woman, elegant woman)

**Each pre-made has:**
- Base image (pre-generated, stored in S3)
- 3-4 sample images (different scenes)
- Name, niche, vibe tags
- Settings JSON (same as wizard output)

**Acceptance:**
- Library shows all pre-mades with niche filtering
- Preview shows sample images
- "Use This Creator" copies it into user's account
- Works from onboarding flow

---

### Task 13: Creator Profile & Edit

**What:** Click Creator name in sidebar → see profile with base image, references, settings. Edit name/niche. Delete with confirmation.

**Files to create:**
- `src/components/creators/creator-profile.tsx`

**Shows:**
- Base image (large)
- Name + niche (editable)
- Reference images grid (from validation)
- Content count + creation date
- Delete button (with confirmation dialog)

**Acceptance:**
- Can view any Creator's profile
- Can edit name and niche
- Delete cascade-deletes all content
- Confirmation required before delete

---

### Task 14: Metadata Stripping

**What:** Strip AI fingerprints (C2PA, SynthID) from all generated images before S3 upload. Inject iPhone EXIF data.

**Why:** This is a key differentiator. "Every download comes clean. No AI fingerprints."

**Files to create:**
- `src/lib/ai/metadata-stripper.ts`

**Two options:**
1. Use our metadata-service on Railway (if it exists and works)
2. Do it server-side with sharp/exiftool (simpler for MVP)

**MVP approach (server-side):**
```
1. After image downloaded from Gemini
2. Use sharp to re-encode (strips embedded metadata)
3. Use exiftool or custom EXIF write to add iPhone metadata
4. Upload clean image to S3
```

**iPhone EXIF to inject:**
- Make: Apple
- Model: iPhone 15 Pro
- Software: 18.3
- GPS: stripped (no location)

**Acceptance:**
- Downloaded images have no AI metadata
- Images have realistic iPhone EXIF data
- Verification: exiftool on downloaded image shows iPhone, not Google/AI

---

### Task 15: Mobile Responsive Polish

**What:** Full responsive pass on all views at 375px, 768px, 1024px, 1440px.

**Key areas:**
- Sidebar → Sheet on mobile (already partial)
- Chat input compact on mobile
- Content grid: 2 cols tablet, 1 col mobile
- Creator Studio: single column on mobile
- Templates: vertical stack on mobile
- Touch targets: 44px minimum

**Acceptance:**
- All views usable at 375px width
- No horizontal overflow
- Sheet sidebar works smoothly
- Touch targets meet minimum size

---

### Task 16: Settings Page + Deploy

**What:** Basic settings page (account info, generation defaults) + deploy to Vercel.

**Files to create:**
- `src/app/workspace/settings/page.tsx`
- `src/components/settings/account-settings.tsx`

**Settings:**
- Account info (from Clerk — name, email, avatar)
- Current plan + manage subscription link
- Credit balance + transaction history
- Generation defaults (image count, quality)
- Sign out

**Deploy checklist:**
- All env vars in Vercel project settings
- Clerk webhook URL updated to production domain
- Stripe webhook URL updated to production domain
- S3 CORS updated with production domain
- Database connection string for production
- Custom domain: realinfluencer.ai
- Vercel Pro plan for team features

**Acceptance:**
- Settings page works
- App deploys to Vercel without errors
- Auth works in production
- Generation works in production
- Stripe works in production

---

## PHASE E: Post-Launch (Future — NOT in this build)

These are documented for completeness but should NOT be built until Phase A-D are shipped and making money.

### Task 17: Image-to-Video (Kling 3.0)
- Via Fal.ai
- 5s (3 credits) or 10s (5 credits)
- Pro/Master quality
- Motion prompt: camera movement + character action + environmental motion
- "camera handheld movement with visible motion like recorded on an iPhone handheld"

### Task 18: Voice/TTS (ElevenLabs)
- Turbo v3 for emotions
- Voice design from text prompt or clone from audio
- 2 credits per clip
- Emotion tags: [excited], [giggles], [whisper], [laughs]

### Task 19: Lip Sync
- Tier 2: Kling + Pixverse (budget)
- Tier 3: HeyGen Avatar 4 (up to 3 min)
- Tier 4: Kling 2.6 voice + video (single platform, recommended)
- 5-7 credits per lip sync

### Task 20: Upscaling
- Clarity Upscaler via Fal.ai
- 1 credit per upscale
- 4K output

### Task 21: Recreate Mode
- Paste URL → Vision API analyzes → recreate with your Creator
- 1 credit for analysis + generation credits

### Task 22: Batch Generation
- Generate multiple content pieces in one go
- Unlimited plan only

---

## Dependency Graph

```
PHASE A (Foundation):
  Task 1: S3 Storage
      └──→ Task 2: Content Generation Pipeline
              └──→ Task 3: Content Display Grid

PHASE B (Product):
  Task 2 ──→ Task 4: Chat View
  Task 2 ──→ Task 5: Template System
  Task 2 ──→ Task 6: Prompt Enhancement
  Task 2 ──→ Task 7: Creator Validation
  (none) ──→ Task 8: Onboarding Flow

PHASE C (Money):
  (none) ──→ Task 9: Stripe Integration
  Task 9 ──→ Task 10: Credit UI
  (none) ──→ Task 11: Landing Page

PHASE D (Ship):
  (none) ──→ Task 12: Pre-Made Library
  (none) ──→ Task 13: Creator Profile/Edit
  Task 1 ──→ Task 14: Metadata Stripping
  (all) ──→ Task 15: Mobile Polish
  (all) ──→ Task 16: Settings + Deploy
```

**Parallelizable groups:**
- Tasks 4, 5, 6, 7, 8 can run in parallel (all depend on Task 2)
- Tasks 9, 11, 12, 13 are independent of each other
- Tasks 15, 16 must be last

---

## Technical Decisions (From Courses + Docs)

### Prompt Building Rules (AIAC)
1. Always "that woman/man" — NEVER "a woman"
2. Always include "raw iPhone photography style"
3. Always include "visible natural skin texture with pores and fine details"
4. Always include "hyper-realistic, everyday human appearance"
5. Female default outfit: white sports bra (wizard only)
6. Male default outfit: shirtless (wizard only)
7. Front-facing, waist up, white studio (wizard only)
8. Content prompts: full creative freedom on outfit/setting/pose

### Model Stack
| Purpose | Model | Provider |
|---------|-------|----------|
| Image gen (wizard + content) | `gemini-3-pro-image-preview` (Nano Banana Pro) | Google Gemini |
| Prompt enhancement | `gemini-2.5-flash-preview` | Google Gemini |
| Video gen (Phase E) | Kling 3.0 | Fal.ai |
| Voice (Phase E) | Turbo v3 | ElevenLabs |
| Lip sync (Phase E) | Kling 2.6 | Fal.ai / OpenArt |
| Upscale (Phase E) | Clarity Upscaler | Fal.ai |

### Content Pillars (From Content Strategy Course)
Templates should map to the 4 pillars:
1. **Possibility** — shows what AI can do
2. **Connection** — personal stories, vulnerability
3. **Value** — educational, free knowledge
4. **Proof** — results, wins, testimonials

### ABC Method (Content Structure Course)
Every template follows:
- **A**ttention (hook) — first frame/line stops the scroll
- **B**ody — value, transformation, objection handling
- **C**TA — call to action

---

## Environment Variables (Complete)

```env
# Auth (Clerk) — HAVE
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database — HAVE
DATABASE_URL=

# AI — HAVE
GEMINI_API_KEY=

# Storage — NEED
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=realinfluencer-media

# Payments — NEED
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Phase E (not needed yet)
FAL_KEY=
ELEVENLABS_API_KEY=
METADATA_SERVICE_URL=
```

---

## Success Criteria

The app is "done and ready to deploy making $$$" when:

1. ✅ New user can sign up and create their first Creator (or adopt pre-made)
2. ✅ User can generate photo content using prompts or templates
3. ✅ Generated content is stored properly (S3, not base64)
4. ✅ Content library shows all past generations
5. ✅ Credits are tracked and displayed accurately
6. ✅ User can subscribe to a plan via Stripe
7. ✅ User can buy credit packs
8. ✅ Monthly credits reset automatically
9. ✅ Downloads are clean (no AI metadata)
10. ✅ Landing page converts visitors to signups
11. ✅ Works on mobile
12. ✅ Deployed on Vercel with custom domain

---

*16 tasks to ship. Tasks 1-3 are the critical path. Everything else can parallelize after that.*
