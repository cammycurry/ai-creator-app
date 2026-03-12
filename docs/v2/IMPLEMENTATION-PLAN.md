# realinfluencer.ai — Implementation Plan

> Build order, task breakdown, and dependencies for Phase 1 MVP.
> Last updated: 2026-03-10

---

## Overview

**Goal:** Build the complete Phase 1 MVP — a functional consumer app where users can create AI influencers and generate image content with them. Chat-first workspace, Creator Studio wizard, pre-made library, content library, credit system, and Stripe billing.

**What Phase 1 includes:**
- Project scaffold + brand theme
- Auth (Clerk)
- Workspace layout (sidebar + chat canvas)
- Creator Studio wizard (visual builder)
- Pre-made Creator library
- Image generation with Creator consistency
- 15-20 content templates
- Content library
- Credit system + Stripe
- Metadata stripping
- Mobile responsive

**What Phase 1 does NOT include:**
- Video generation
- Voice generation / lip sync
- "Recreate" mode (URL analysis)
- Batch generation
- Marketplace features
- Scheduled posting

---

## Dependency Graph

```
Task 1: Scaffold + Theme
    │
    ├──▶ Task 2: Auth (Clerk)
    │        │
    │        └──▶ Task 3: Database + Prisma
    │                 │
    │                 ├──▶ Task 5: Credit System (backend)
    │                 │        │
    │                 │        └──▶ Task 11: Stripe Integration
    │                 │
    │                 ├──▶ Task 7: Generation Pipeline (image)
    │                 │        │
    │                 │        └──▶ Task 9: Template System
    │                 │
    │                 └──▶ Task 6: Creator CRUD (backend)
    │                          │
    │                          ├──▶ Task 8: Creator Studio Wizard
    │                          └──▶ Task 10: Pre-Made Library
    │
    └──▶ Task 4: Workspace Layout (UI shell)
             │
             ├──▶ Task 8: Creator Studio Wizard
             ├──▶ Task 10: Pre-Made Library
             ├──▶ Task 12: Chat View
             ├──▶ Task 13: Content Library View
             ├──▶ Task 14: Templates View
             └──▶ Task 15: Onboarding Flow

Task 16: Mobile Polish (after all views)
Task 17: Integration Testing + QA
```

---

## Task 1: Scaffold Next.js Project + Brand Theme

**Depends on:** Nothing
**Blocks:** Everything

**What:**
- Create Next.js 14+ project with App Router, TypeScript, Tailwind
- Initialize shadcn/ui (New York style)
- Apply brand theme (CSS variables, Tailwind config, fonts)
- Install core shadcn components
- Verify brand renders correctly

**Files to create:**
- `package.json` (via create-next-app)
- `src/app/layout.tsx` — root layout with fonts
- `src/app/globals.css` — brand CSS variables
- `tailwind.config.ts` — brand colors + fonts
- `src/app/page.tsx` — minimal branded landing page
- `src/lib/utils.ts` — cn helper

**Steps:**
1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
2. `npx shadcn@latest init` (New York, Neutral, CSS variables: Yes)
3. Replace `globals.css` with brand theme from TECHNICAL-ARCHITECTURE.md
4. Update `tailwind.config.ts` with brand colors/fonts
5. Update `layout.tsx` with Playfair Display, DM Sans, JetBrains Mono
6. Install shadcn components: button, card, input, label, avatar, badge, separator, scroll-area, tooltip, dialog, sheet, skeleton, textarea, dropdown-menu, tabs, slider, select, radio-group, checkbox, form, progress, alert-dialog, sonner
7. Create minimal landing page to verify theme
8. `npm run dev` — verify everything works

**Acceptance criteria:**
- Dev server runs without errors
- Brand fonts render (Playfair headings, DM Sans body)
- Brand colors applied (cream background, charcoal text)
- shadcn components render with brand theme

---

## Task 2: Auth with Clerk

**Depends on:** Task 1
**Blocks:** Task 3

**What:**
- Install and configure Clerk
- Create sign-in/sign-up pages
- Set up middleware for route protection
- Wrap root layout with ClerkProvider

**Files to create:**
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/middleware.ts`
- `.env.local` — Clerk keys

**Files to modify:**
- `src/app/layout.tsx` — wrap in ClerkProvider

**Steps:**
1. `npm install @clerk/nextjs`
2. Create `.env.local` with Clerk publishable + secret keys
3. Wrap root layout with `<ClerkProvider>`
4. Create middleware protecting `(workspace)` routes
5. Create sign-in page with `<SignIn />` component
6. Create sign-up page with `<SignUp />` component
7. Style auth pages (centered card, cream background)
8. Test: sign up → redirect → sign in → redirect

**Acceptance criteria:**
- Sign up creates account and redirects to workspace
- Sign in works and redirects
- Unauthenticated users redirected to sign-in
- Marketing pages remain public

---

## Task 3: Database + Prisma Setup

**Depends on:** Task 2
**Blocks:** Tasks 5, 6, 7

**What:**
- Set up PostgreSQL on Railway
- Install and configure Prisma
- Create initial schema (User, Creator, Content, CreditTransaction, GenerationJob)
- Create Clerk webhook to sync users
- Run initial migration

**Files to create:**
- `prisma/schema.prisma` — full schema from TECHNICAL-ARCHITECTURE.md
- `src/lib/db.ts` — Prisma client singleton
- `src/app/api/webhooks/clerk/route.ts` — user sync webhook

**Steps:**
1. Create PostgreSQL database on Railway
2. `npm install prisma @prisma/client`
3. `npx prisma init`
4. Add full schema from architecture doc
5. Set DATABASE_URL in `.env.local`
6. `npx prisma migrate dev --name init`
7. Create Prisma client singleton with connection pooling
8. Create Clerk webhook route (user.created, user.updated, user.deleted)
9. Configure Clerk webhook endpoint in Clerk dashboard
10. Test: sign up → user created in DB

**Acceptance criteria:**
- Database accessible from app
- Prisma client works in server components/actions
- New signups create User record automatically
- All tables created with correct relations

---

## Task 4: Workspace Layout (UI Shell)

**Depends on:** Task 1
**Blocks:** Tasks 8, 10, 12, 13, 14, 15

**What:**
- Build the workspace shell: sidebar + center canvas
- Creator list in sidebar (mock data initially)
- Nav links (Chat/Library/Templates)
- Credits display in sidebar footer
- Mobile responsive (sidebar → Sheet)

**Files to create:**
- `src/app/(workspace)/layout.tsx`
- `src/app/(workspace)/page.tsx`
- `src/components/workspace/sidebar.tsx`
- `src/components/workspace/header.tsx` — mobile top bar
- `src/components/workspace/creator-list.tsx`
- `src/components/workspace/nav-links.tsx`
- `src/components/workspace/credits-display.tsx`
- `src/stores/creator-store.ts` — Zustand store
- `src/stores/ui-store.ts` — UI state
- `src/types/creator.ts`
- `src/types/content.ts`
- `src/data/premade-creators.ts` — mock data

**Steps:**
1. `npm install zustand`
2. Define Creator and Content TypeScript types
3. Create Zustand stores (creator-store, ui-store)
4. Create mock creator data (3 mock creators)
5. Build workspace layout (sidebar 280px + flex-1 canvas)
6. Build Sidebar: Creator list, nav links, credits footer
7. Build CreatorList: avatar + name + niche, active highlight
8. Build NavLinks: Chat/Library/Templates with icons
9. Build CreditsDisplay: balance + low-warning states
10. Build mobile header bar with hamburger → Sheet
11. Create default page (empty state: "Select a Creator")
12. Verify responsive: desktop sidebar, mobile Sheet

**Acceptance criteria:**
- Sidebar shows on desktop, collapses to Sheet on mobile
- Creator list renders with mock data
- Clicking creator sets it as active (highlight)
- Nav links switch active state
- Credits display shows balance

---

## Task 5: Credit System (Backend)

**Depends on:** Task 3
**Blocks:** Task 11

**What:**
- Implement credit checking, deduction, and refund logic
- Credit deduction priority (pack first, then plan)
- Server actions for credit operations

**Files to create:**
- `src/server/actions/credit-actions.ts`
- `src/types/credits.ts`

**Steps:**
1. Create `checkBalance` — returns { planCredits, packCredits, total }
2. Create `deductCredits` — deducts from pack first, then plan; creates transaction
3. Create `refundCredits` — adds credits back, creates REFUND transaction
4. Create `grantPlanCredits` — monthly reset logic
5. Add balance validation (can't go below 0)
6. Add transaction logging (every credit change = CreditTransaction row)

**Acceptance criteria:**
- Deduction respects priority (pack → plan)
- Insufficient credits returns error (not negative balance)
- Every credit change creates a transaction record
- Refunds correctly add credits back

---

## Task 6: Creator CRUD (Backend)

**Depends on:** Task 3
**Blocks:** Tasks 8, 10

**What:**
- Server actions for creating, reading, updating, deleting creators
- Enforces plan limits (custom creator count)
- Handles pre-made adoption

**Files to create:**
- `src/server/actions/creator-actions.ts`

**Steps:**
1. Create `createCreator` — validates plan limit, creates record
2. Create `getCreators` — returns all creators for user
3. Create `getCreator` — single creator by ID
4. Create `updateCreator` — name, niche, settings
5. Create `deleteCreator` — cascade deletes content
6. Create `adoptPreMade` — clones premade data into user's creator
7. Add plan-based limits (FREE: 0 custom, STARTER: 3, PRO: 10, UNLIMITED: unlimited)

**Acceptance criteria:**
- CRUD operations work correctly
- Plan limits enforced (error if exceeded)
- Pre-made adoption creates a copy, not a reference
- Delete cascades to content

---

## Task 7: Generation Pipeline (Image)

**Depends on:** Task 3
**Blocks:** Task 9

**What:**
- Implement the image generation pipeline (Pipeline A)
- Prompt builder (Creator settings + template/user input → full prompt)
- Prompt enhancer (Gemini Flash)
- Image generation (Fal.ai / Gemini)
- Upscaling (Fal.ai Clarity Upscaler)
- Metadata stripping (our service)
- S3 upload
- Generation job tracking

**Files to create:**
- `src/lib/ai/prompt-builder.ts`
- `src/lib/ai/prompt-enhancer.ts`
- `src/lib/ai/image-generator.ts`
- `src/lib/ai/upscaler.ts`
- `src/lib/ai/metadata-stripper.ts`
- `src/lib/s3.ts`
- `src/server/actions/generation-actions.ts`
- `src/app/api/generate/image/route.ts`

**Steps:**
1. Set up Fal.ai SDK + API keys
2. Set up Gemini API client + keys
3. Set up S3 client (AWS SDK)
4. Build prompt builder — takes Creator settings JSON + template/user input → full prompt
5. Build prompt enhancer — sends to Gemini 2.5 Flash, returns enhanced prompt
6. Build image generator — calls Fal.ai (nano-banana-2) with prompt + reference images
7. Build upscaler — calls Fal.ai Clarity Upscaler
8. Build metadata stripper — calls our metadata-service on Railway
9. Build S3 upload helper — uploads buffer to S3, returns URL
10. Build generation orchestrator — chains: prompt → enhance → generate → (optional upscale) → strip → S3 → save Content
11. Create API route for polling generation status
12. Create GenerationJob tracking (create → update status → complete/fail)
13. Handle errors: retry once, then fail + refund credits

**Acceptance criteria:**
- Can generate 4 images from Creator + prompt
- Images stored in S3 with correct paths
- Metadata stripped from all outputs
- Generation jobs tracked with status
- Failed generations refund credits
- API route returns status when polled

---

## Task 8: Creator Studio Wizard (UI)

**Depends on:** Tasks 4, 6, 7
**Blocks:** None

**What:**
- Build the full Creator Studio modal (near-full-screen)
- Left panel: preview area (silhouette → generated images → validation)
- Right panel: 5-tab trait picker (Basics, Face, Hair, Body, Style)
- 3 entry paths: Build from Scratch, Describe It, Start from Template
- Generation → Selection → Validation → Name & Save
- Wire to backend: creator creation + image generation

**Files to create:**
- `src/components/creators/creator-studio.tsx`
- `src/components/creators/trait-tabs.tsx`
- `src/components/creators/preview-panel.tsx`
- `src/components/creators/tabs/basics-tab.tsx`
- `src/components/creators/tabs/face-tab.tsx`
- `src/components/creators/tabs/hair-tab.tsx`
- `src/components/creators/tabs/body-tab.tsx`
- `src/components/creators/tabs/style-tab.tsx`

**Steps:**
1. Build CreatorStudio dialog (95vw × 92vh, blur backdrop)
2. Build two-panel layout (35% preview / 65% picker)
3. Build 5 tab components with visual controls (swatches, chips, cards)
4. Build preview panel state machine (customizing → generating → picking → validating → finishing)
5. Build "Describe It" text input overlay
6. Wire Generate button → prompt builder → image generation
7. Build image selection UI (2×2 grid, click to select)
8. Wire validation generation (5 test scenes from selected base)
9. Build validation review UI
10. Build finish screen (name + niche input)
11. Wire Save → creator-actions.createCreator → store update
12. Mobile layout (single column, stacked)

**Acceptance criteria:**
- Full wizard flow works end-to-end
- All 5 tabs render with correct controls
- "Describe It" parses input and pre-fills tabs
- Generate creates 4 real images
- Validation generates 5 test scenes
- Save creates Creator in database
- Mobile layout works

---

## Task 9: Template System

**Depends on:** Task 7
**Blocks:** Task 14

**What:**
- Define template data structure
- Create 15-20 templates across categories
- Template → prompt assembly pipeline
- Template customization options

**Files to create:**
- `src/types/template.ts`
- `src/data/templates.ts`

**Steps:**
1. Define Template type (id, name, category, icon, outputType, creditsCost, scenePrompt, customizableFields, suggestedCaptions, tags)
2. Create templates:
   - Fitness (4): gym mirror selfie, workout clip, progress check, protein shake
   - Lifestyle (4): morning coffee, outfit of the day, golden hour, apartment vibes
   - Aesthetic (4): mirror selfie, beach/pool, golden hour portrait, POV
   - GRWM (2): makeup routine, outfit styling
   - Product/UGC (2): holding product, product review
3. Each template has 1-3 customizable fields (outfit, hair, setting, mood)
4. Build template → prompt assembly (inject Creator + template + customizations)

**Acceptance criteria:**
- 15-20 templates defined with all fields
- Templates span 5+ categories
- Customizable fields render as select options
- Template prompts generate correct images when run through pipeline

---

## Task 10: Pre-Made Creator Library (UI)

**Depends on:** Tasks 4, 6
**Blocks:** None

**What:**
- Build browsable gallery of pre-made creators
- Filter by niche
- Preview with sample images
- "Use" button to adopt

**Files to create:**
- `src/components/creators/premade-library.tsx`
- `src/components/creators/premade-card.tsx`
- `src/components/creators/premade-preview.tsx`

**Steps:**
1. Create premade creator data (10-15 across niches) with placeholder images
2. Build PremadeLibrary view: search + filter pills + card grid
3. Build PremadeCard: avatar, name, niche, vibe tags, Preview/Use buttons
4. Build PremadePreview dialog: 3-4 sample images in different scenes
5. Wire "Use" → adoptPreMade server action → add to user's creators
6. Wire "Browse Pre-Made" button in sidebar

**Acceptance criteria:**
- Library shows all pre-mades with filtering
- Preview shows sample images
- "Use" adopts creator and sets as active
- Works on mobile (responsive grid)

---

## Task 11: Stripe Integration

**Depends on:** Task 5
**Blocks:** None

**What:**
- Configure Stripe products/prices
- Subscription checkout flow
- Credit pack purchase flow
- Webhook handler for payment events
- Plan upgrade/downgrade logic

**Files to create:**
- `src/lib/stripe.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/components/credits/buy-credits.tsx`
- `src/components/settings/plan-settings.tsx`

**Steps:**
1. `npm install stripe @stripe/stripe-js`
2. Create Stripe products + prices (4 plans + 4 credit packs)
3. Create Stripe client helper
4. Build subscription checkout: user picks plan → Stripe Checkout → redirect back
5. Build credit pack checkout: user picks pack → Stripe Checkout → redirect back
6. Create Stripe webhook route handling: subscription lifecycle + checkout completion + invoice.paid
7. Wire webhook to credit system (monthly reset, pack purchases)
8. Build BuyCredits modal (pack options with pricing)
9. Build plan settings page (current plan, upgrade/downgrade)

**Acceptance criteria:**
- Can subscribe to any plan via Stripe Checkout
- Can purchase credit packs
- Monthly credits reset on invoice.paid
- Pack credits added on checkout completion
- Plan changes update user record

---

## Task 12: Chat View

**Depends on:** Task 4
**Blocks:** None

**What:**
- Build the chat interface (primary interaction surface)
- Message list with user/assistant messages
- Input bar with mode selector (Chat/Image/Video/Talking Head)
- Inline generation results (image grid)
- Post-generation action buttons
- Suggestion chips
- Wire to generation pipeline

**Files to create:**
- `src/components/chat/chat-view.tsx`
- `src/components/chat/message-list.tsx`
- `src/components/chat/chat-message.tsx`
- `src/components/chat/chat-input.tsx`
- `src/components/chat/mode-selector.tsx`
- `src/components/chat/generation-result.tsx`
- `src/components/chat/action-buttons.tsx`
- `src/components/chat/suggestion-chips.tsx`
- `src/stores/chat-store.ts`
- `src/types/chat.ts`

**Steps:**
1. Define ChatMessage type and chat Zustand store
2. Build ChatView container (flex column: messages + input)
3. Build MessageList (scrollable, newest at bottom)
4. Build ChatMessage (user right-aligned, assistant left with icon)
5. Build GenerationResult (inline image grid: 1-4 images, clickable)
6. Build ActionButtons (download, upscale, make video, etc. with credit badges)
7. Build SuggestionChips (tappable quick actions)
8. Build ChatInput with ModeSelector pills + textarea + send
9. Wire input to generation: Image mode → call generation pipeline → show results in chat
10. Build welcome message with niche-specific suggestions per Creator
11. Wire credit confirmation before generation

**Acceptance criteria:**
- Chat shows messages correctly
- Mode selector switches between modes
- Image generation works through chat (type prompt → see results)
- Action buttons show credit costs
- Suggestion chips insert into input and send
- Welcome message appears for new Creator

---

## Task 13: Content Library View

**Depends on:** Task 4
**Blocks:** None

**What:**
- Grid view of all generated content for active Creator
- Filter by type (All/Photos/Videos/Talking Head)
- Content detail dialog with full preview + actions

**Files to create:**
- `src/components/library/library-view.tsx`
- `src/components/library/content-card.tsx`
- `src/components/library/content-detail.tsx`
- `src/components/library/library-filters.tsx`

**Steps:**
1. Build LibraryView: header + filter tabs + responsive grid
2. Build ContentCard: thumbnail, type badge, date
3. Build ContentDetail dialog: large preview, prompt, date, action buttons
4. Build LibraryFilters: All/Photos/Videos/Talking Head tabs
5. Wire to database: fetch content for active Creator
6. Wire actions: download, regenerate, upscale

**Acceptance criteria:**
- Shows all content for active Creator
- Filters work correctly
- Detail dialog shows full info
- Download works (with metadata stripping)
- Empty state when no content yet

---

## Task 14: Templates View

**Depends on:** Tasks 4, 9
**Blocks:** None

**What:**
- Categorized template grid
- Template cards with name, type, credit cost
- Click → load into chat with customization options

**Files to create:**
- `src/components/templates/templates-view.tsx`
- `src/components/templates/template-card.tsx`

**Steps:**
1. Build TemplatesView: category sections with template grids
2. Build TemplateCard: icon, name, output type badge, credit cost
3. Wire click → switch to Chat view → insert template message with customization options
4. Category filter pills at top

**Acceptance criteria:**
- All templates render in correct categories
- Cards show correct info (name, type, cost)
- Clicking template loads it into chat
- Customization options appear as quick-select buttons in chat

---

## Task 15: Onboarding Flow

**Depends on:** Task 4
**Blocks:** None

**What:**
- Welcome screen for first-time users (no Creators)
- Two paths: Build Your Own → Creator Studio, Pick Pre-Made → Library
- After completion, land in workspace with Creator ready

**Files to create:**
- `src/app/(workspace)/onboarding/page.tsx`
- `src/components/onboarding/welcome-screen.tsx`

**Steps:**
1. Build WelcomeScreen: two large cards (Build Your Own / Pick Pre-Made)
2. Wire "Build Your Own" → open Creator Studio modal
3. Wire "Pick Pre-Made" → show pre-made library
4. After either path → redirect to workspace with Creator active
5. Detect first-time user (no creators in DB) → redirect to onboarding

**Acceptance criteria:**
- New users see onboarding, not empty workspace
- Both paths work and result in active Creator
- After creation, AI welcome message appears in chat

---

## Task 16: Mobile Responsive Polish

**Depends on:** Tasks 8-15
**Blocks:** Task 17

**What:**
- Verify and fix all views at mobile/tablet/desktop breakpoints
- Sidebar → Sheet on mobile
- Chat input compact mode
- Content library responsive grid
- Creator Studio single-column mobile

**Steps:**
1. Test all views at 375px, 768px, 1024px, 1440px
2. Fix sidebar: Sheet on < lg, hamburger in header
3. Fix chat input: horizontal scroll for mode pills, compact controls
4. Fix content library: 1 col mobile, 2 col tablet, 3+ col desktop
5. Fix Creator Studio: single column, preview stacks above
6. Fix templates: stack vertically on mobile
7. Touch targets: minimum 44px on mobile

**Acceptance criteria:**
- All views usable at 375px width
- No horizontal overflow
- Touch targets meet minimum size
- Sidebar Sheet works smoothly

---

## Task 17: Integration Testing + QA

**Depends on:** All previous tasks
**Blocks:** None

**What:**
- End-to-end flow testing
- Error state handling
- Edge cases
- Performance check

**Test scenarios:**
1. Fresh signup → onboarding → create Creator → generate first image → download
2. Adopt pre-made → generate via template → view in library
3. Run out of credits → buy pack → continue generating
4. Subscribe to plan → verify credits granted → generate
5. Delete Creator → verify content cascade deleted
6. Multiple Creators → switch between → verify chat isolation
7. Generation failure → verify credit refund
8. Mobile: full flow on 375px viewport

**Acceptance criteria:**
- All 8 test scenarios pass
- No console errors
- Generation pipeline works end-to-end
- Credits tracked correctly
- Mobile flow works completely

---

## Estimated Build Sequence

The most efficient order (maximizing parallel work):

**Week 1:** Tasks 1-4 (scaffold, auth, database, workspace shell)
**Week 2:** Tasks 5-7 (credits backend, creator CRUD, generation pipeline)
**Week 3:** Tasks 8-10 (Creator Studio, templates, pre-made library)
**Week 4:** Tasks 11-15 (Stripe, chat, library, templates view, onboarding)
**Week 5:** Tasks 16-17 (mobile polish, integration testing)

Tasks 8-10 and 12-15 can be parallelized significantly since they're independent UI components that share the same backend.

---

## Environment Variables Required

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=realinfluencer-media

# AI Providers
FAL_KEY=...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...

# Metadata Service
METADATA_SERVICE_URL=https://...railway.app
```

---

*Implementation plan for realinfluencer.ai Phase 1 MVP*
*Product spec: see PRODUCT-SPEC.md*
*Technical architecture: see TECHNICAL-ARCHITECTURE.md*
