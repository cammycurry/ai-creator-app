# Phase 1: Core App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Phase 1 consumer app — Next.js scaffold, brand theme, auth, main workspace (sidebar + chat canvas + input bar), Creator creation, pre-made library, content library, and credit system. Chat-first interface where Creators are workspaces.

**Architecture:** Next.js 14+ App Router with server components where possible. Chat-first UI using shadcn/ui styled to brand. Clerk for auth. Client-side state for Creator switching and chat. No database yet — use local state and mock data to get the interface right first.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui (New York style), Clerk, Google Fonts (Playfair Display, DM Sans, JetBrains Mono)

---

## Task 1: Scaffold Next.js Project + Brand Theme

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `tailwind.config.ts`
- Create: `src/app/page.tsx`

**Step 1: Create Next.js project**

```bash
cd /Users/camcurry/projects/ai-creator-app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept overwriting existing files. This gives us the base scaffold.

**Step 2: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: New York style, Neutral base color, CSS variables: Yes

**Step 3: Replace `src/app/globals.css` with brand theme**

Use the CSS variables from BUILD-GUIDE.md — cream background, charcoal foreground, sand secondary, brand pastels (sage, sky, lavender, peach), plus dark mode variables.

**Step 4: Update `tailwind.config.ts` with brand colors and fonts**

Add brand-specific colors (cream, sand, charcoal, graphite, blush, sage, sky, lavender, peach, stone, mist), font families (display, body, mono), and border radius from BUILD-GUIDE.md.

**Step 5: Update `src/app/layout.tsx` with Google Fonts**

Import Playfair_Display, DM_Sans, JetBrains_Mono from next/font/google. Set CSS variables. Apply `font-body antialiased` to body.

**Step 6: Create a minimal landing page at `src/app/page.tsx`**

Simple branded page showing the logo mark, app name, and "Get Started" button. Confirms fonts, colors, and theme are working.

**Step 7: Install core shadcn components**

```bash
npx shadcn@latest add button card input label avatar badge separator scroll-area tooltip dialog sheet skeleton textarea dropdown-menu tabs slider
```

**Step 8: Run dev server, verify brand renders correctly**

```bash
npm run dev
```

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with brand theme and shadcn/ui"
```

---

## Task 2: Auth with Clerk

**Files:**
- Create: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx` (wrap in ClerkProvider)
- Create: `.env.local` (Clerk keys)

**Step 1: Install Clerk**

```bash
npm install @clerk/nextjs
```

**Step 2: Create `.env.local`**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

**Step 3: Wrap root layout with ClerkProvider**

**Step 4: Create middleware for auth protection**

Protect all routes except landing, sign-in, sign-up, and API webhooks.

**Step 5: Create sign-in and sign-up pages**

Centered layouts with Clerk's `<SignIn />` and `<SignUp />` components, styled to match brand (cream background, centered card).

**Step 6: Test auth flow — sign up, sign in, redirect**

**Step 7: Commit**

```bash
git commit -m "feat: add Clerk auth with sign-in/sign-up pages"
```

---

## Task 3: Main Workspace Layout — App Shell

**Files:**
- Create: `src/app/(workspace)/layout.tsx` — the workspace shell
- Create: `src/components/workspace/sidebar.tsx` — left sidebar
- Create: `src/components/workspace/header.tsx` — top header (mobile)
- Create: `src/components/workspace/creator-list.tsx` — creator cards in sidebar
- Create: `src/components/workspace/nav-links.tsx` — Chat/Library/Templates nav
- Create: `src/components/workspace/credits-display.tsx` — credits in sidebar footer
- Create: `src/app/(workspace)/page.tsx` — default workspace view (chat)

**Step 1: Create workspace route group with layout**

The layout has:
- Left sidebar (280px desktop, collapsed on mobile via sheet)
- Center canvas (flex-1, the main content area)
- The sidebar contains: Creator list (top), Nav links (middle), Credits + Settings (bottom)

**Step 2: Build Sidebar component**

Two sections separated by a divider:
1. **Creator List** — scrollable area with Creator avatar cards. Active Creator highlighted. "+ New Creator" and "Browse Pre-Made" buttons at bottom.
2. **Navigation** — Chat (default), Library, Templates links. Credits remaining and Settings at the very bottom.

**Step 3: Build CreatorList component**

Each Creator shows: small avatar, name, niche label. Active Creator has a highlight border/background. Clicking switches the active Creator context.

**Step 4: Build NavLinks component**

Three nav items: Chat (MessageSquare icon), Library (Image icon), Templates (Target icon). Active link highlighted. These control which view shows in the center canvas.

**Step 5: Build CreditsDisplay component**

Shows credit balance ("73 credits"), Settings gear icon.

**Step 6: Build mobile header**

On mobile (< lg breakpoint), sidebar collapses. Top bar shows: hamburger menu (opens sidebar as Sheet), active Creator name + niche, credit balance.

**Step 7: Create the workspace page (empty state for now)**

Show a centered welcome message: "Select a Creator to get started" or redirect to onboarding if no creators exist.

**Step 8: Verify layout is responsive — sidebar on desktop, sheet on mobile**

**Step 9: Commit**

```bash
git commit -m "feat: add main workspace layout with sidebar and responsive shell"
```

---

## Task 4: State Management — Creator Context

**Files:**
- Create: `src/stores/creator-store.ts` — Zustand store for active Creator
- Create: `src/types/creator.ts` — Creator type definitions
- Create: `src/types/content.ts` — Content type definitions
- Create: `src/data/mock-creators.ts` — mock Creator data
- Create: `src/data/mock-content.ts` — mock content items

**Step 1: Install Zustand**

```bash
npm install zustand
```

**Step 2: Define Creator types**

```typescript
interface Creator {
  id: string
  name: string
  niche: string[]
  baseImageUrl: string
  referenceImages: string[]
  settings: CreatorSettings
  voiceId?: string
  createdAt: Date
  contentCount: number
}
```

**Step 3: Define Content types**

```typescript
interface ContentItem {
  id: string
  creatorId: string
  type: "image" | "video" | "talking-head"
  url: string
  thumbnailUrl: string
  prompt: string
  createdAt: Date
  creditsCost: number
}
```

**Step 4: Create Zustand store**

Store holds:
- `creators: Creator[]`
- `activeCreatorId: string | null`
- `credits: number`
- `activeView: "chat" | "library" | "templates"`
- Actions: `setActiveCreator`, `addCreator`, `setActiveView`, `deductCredits`

**Step 5: Create mock data**

2-3 mock Creators (Sophia Fitness, Luna Lifestyle, etc.) with placeholder avatar URLs and some mock content items.

**Step 6: Wire store to sidebar**

CreatorList reads from store, highlights active creator, clicking sets active.

**Step 7: Commit**

```bash
git commit -m "feat: add Zustand creator store with mock data"
```

---

## Task 5: Chat View — Core Chat Interface

**Files:**
- Create: `src/components/chat/chat-view.tsx` — main chat container
- Create: `src/components/chat/message-list.tsx` — scrollable message area
- Create: `src/components/chat/chat-message.tsx` — individual message bubble
- Create: `src/components/chat/chat-input.tsx` — bottom input bar with mode selector
- Create: `src/components/chat/mode-selector.tsx` — Chat/Image/Video/TalkingHead pills
- Create: `src/components/chat/generation-result.tsx` — inline image/video results
- Create: `src/components/chat/action-buttons.tsx` — post-generation action buttons
- Create: `src/components/chat/suggestion-chips.tsx` — quick suggestion buttons
- Create: `src/stores/chat-store.ts` — chat message state

**Step 1: Create ChatMessage type and chat store**

```typescript
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  images?: GeneratedImage[]
  actions?: ActionButton[]
  suggestions?: string[]
  timestamp: Date
  creditsCost?: number
}
```

Store holds messages per Creator (Map<creatorId, ChatMessage[]>), current input mode, sending state.

**Step 2: Build ChatView container**

Full-height flex column: message list (flex-1, scrollable) + input bar (sticky bottom). When active Creator changes, chat switches to that Creator's messages.

**Step 3: Build MessageList and ChatMessage**

Messages scroll bottom-up (newest at bottom). Assistant messages have a bot icon, user messages aligned right. Assistant messages can contain:
- Text content (markdown)
- Inline images (grid of 1-4 images)
- Action buttons (download, make video, upscale, etc.)
- Suggestion chips (quick-tap options)

**Step 4: Build GenerationResult component**

Shows generated images inline in the chat. Grid layout: 1 image = full width, 2 = side by side, 3-4 = grid. Each image is clickable to expand. Shows credit cost badge.

**Step 5: Build ActionButtons component**

Horizontal row of buttons after generation results:
- Download (free), Upscale (1cr), Make Video (3cr), Add Voice (2cr), Regenerate (2cr)
Each button shows its credit cost.

**Step 6: Build ChatInput with ModeSelector**

Bottom bar with:
- Mode pills: Chat | Image | Video | Talking Head
- Text input (auto-expanding textarea)
- Attachment button, camera button
- Count selector (number stepper: - N +)
- Settings gear button
- Send button

Mode selection changes the placeholder text and available options.

**Step 7: Build SuggestionChips**

When AI suggests ideas (e.g., "Gym mirror selfie", "Morning smoothie prep"), show as tappable chips. Clicking a chip inserts it as user input and sends.

**Step 8: Populate with mock welcome message**

When a Creator is first selected, show the AI welcome message with suggestions tailored to their niche (use mock data).

**Step 9: Verify chat scrolling, input, mode switching all work**

**Step 10: Commit**

```bash
git commit -m "feat: add chat view with message list, input bar, and mode selector"
```

---

## Task 6: Creator Creation — Conversational Wizard

**Files:**
- Create: `src/components/creators/creation-wizard.tsx` — orchestrates the wizard flow
- Create: `src/components/creators/wizard-steps.tsx` — step content components
- Modify: `src/components/chat/chat-view.tsx` — handle wizard mode

**Step 1: Build CreationWizard as a special chat flow**

When user clicks "+ New Creator", the chat switches to wizard mode. The AI asks questions one at a time, user responds with clicks or typed text.

The wizard flow is a state machine with these stages:
1. Gender selection (quick-select buttons)
2. Age range (quick-select buttons)
3. Description mode ("Guide me step by step" or "I'll describe her")
4. If guided: hair, eyes, build, skin questions with quick-selects
5. If freeform: user types description, AI parses it
6. Summary of features — confirm or adjust
7. "Generate" — show 4 placeholder images (mock)
8. Pick favorite
9. Validation shots (mock — 6 angle variations)
10. Confirm consistency
11. Name + niche selection
12. Save Creator

**Step 2: Each wizard step renders as chat messages**

The wizard inserts AI messages with quick-select buttons. User clicks are treated as user messages. The conversation builds naturally.

**Step 3: Quick-select buttons component**

Reusable component: row of buttons, clicking one sends it as the user's response and advances the wizard.

**Step 4: Wire "Save Creator" to Zustand store**

When wizard completes, add the new Creator to the store and set it as active. Switch to normal chat mode with welcome message.

**Step 5: Verify full wizard flow end-to-end**

**Step 6: Commit**

```bash
git commit -m "feat: add conversational Creator creation wizard"
```

---

## Task 7: Pre-Made Creator Library

**Files:**
- Create: `src/components/creators/premade-library.tsx` — browsable gallery
- Create: `src/components/creators/premade-card.tsx` — individual Creator card
- Create: `src/components/creators/premade-preview.tsx` — expanded preview
- Create: `src/data/premade-creators.ts` — 10-15 pre-made Creators

**Step 1: Create pre-made Creator data**

10-15 Creators across niches: fitness (3), lifestyle (3), beauty (2), fashion (2), tech (1), travel (1), etc. Each has: name, niche, vibe description, 3 tags, placeholder avatar URL.

**Step 2: Build PremadeLibrary view**

Full canvas view with:
- Search bar at top
- Filter pills: All | Fitness | Lifestyle | Beauty | Fashion | Tech | Travel
- Grid of Creator cards (3 per row desktop, 2 tablet, 1 mobile)

**Step 3: Build PremadeCard**

Each card shows: avatar image, name, niche, 3 vibe tags, "Preview" button, "Use - Free" button.

**Step 4: Build PremadePreview**

Clicking "Preview" expands the card (or opens a dialog) showing 3-4 sample images of this Creator in different scenes.

**Step 5: Wire "Use" button**

Clicking "Use" adds this Creator to the user's Creator list in the store and sets it as active. Redirects to workspace chat.

**Step 6: Wire "Browse Pre-Made" sidebar button to this view**

**Step 7: Commit**

```bash
git commit -m "feat: add pre-made Creator library with browse and adopt"
```

---

## Task 8: Content Library View

**Files:**
- Create: `src/components/library/library-view.tsx` — grid layout
- Create: `src/components/library/content-card.tsx` — individual content item
- Create: `src/components/library/content-detail.tsx` — expanded detail dialog
- Create: `src/components/library/library-filters.tsx` — type filter tabs

**Step 1: Build LibraryView**

When user clicks "Library" in sidebar nav, center canvas switches to a content grid. Header shows: Creator name + "Content", total count, filter tabs (All | Photos | Videos | Talking Head).

**Step 2: Build ContentCard**

Each card shows: thumbnail image/video, small type badge (photo/video/TH), date label. Hover shows a slight scale effect. Click opens detail view.

**Step 3: Build ContentDetail dialog**

Full-size preview of the content. Shows:
- Large image/video player
- Original prompt used to generate
- Date created
- Action buttons: Download, Regenerate, Make Video, Upscale (with credit costs)

**Step 4: Build LibraryFilters**

Tab bar: All | Photos | Videos | Talking Head. Filters the grid.

**Step 5: Populate with mock content tied to active Creator**

**Step 6: Commit**

```bash
git commit -m "feat: add content library view with grid and detail dialog"
```

---

## Task 9: Templates View

**Files:**
- Create: `src/components/templates/templates-view.tsx` — categorized template grid
- Create: `src/components/templates/template-card.tsx` — individual template card
- Create: `src/data/templates.ts` — template definitions

**Step 1: Define template data structure**

```typescript
interface Template {
  id: string
  name: string
  category: string
  icon: string
  outputType: "image" | "video" | "talking-head"
  creditsCost: number
  description: string
  promptTemplate: string
  customizableFields: CustomField[]
}
```

**Step 2: Create template data**

15-20 templates across categories: Fitness (gym mirror selfie, workout clip, protein shake prep), Lifestyle (morning coffee run, outfit of the day, golden hour portrait), Talking Head (storytime, hot take, product review), GRWM, Product/UGC.

**Step 3: Build TemplatesView**

When user clicks "Templates" in sidebar nav, center canvas shows categorized template grid. Categories are sections with horizontal or grid layouts. Header shows "Templates for [Creator]" with trending filter.

**Step 4: Build TemplateCard**

Each card shows: icon/emoji, template name, output type badge (Image/Video/TH), credit cost. Click action = load template into chat.

**Step 5: Wire template selection to chat**

When user clicks a template, switch to Chat view and insert an AI message with the template loaded: description of what it generates + customizable quick-select options (outfit, mood, hair, etc.) + "Ready to generate? X credits" button.

**Step 6: Commit**

```bash
git commit -m "feat: add templates view with categorized cards"
```

---

## Task 10: Creator Profile / Edit View

**Files:**
- Create: `src/components/creators/creator-profile.tsx` — profile page
- Modify: `src/components/workspace/sidebar.tsx` — click Creator name to open profile

**Step 1: Build CreatorProfile view**

When user clicks the active Creator's name/avatar in sidebar, center canvas shows Creator detail:
- Header: base image, name, niche, creation date, content count
- Action buttons: Edit Look, Change Voice, View References
- Reference images grid (the validation images)
- Settings: name input, niche tags
- Stats: X images, Y videos, Z talking heads
- Delete Creator button (with confirmation dialog)

**Step 2: Wire profile editing to store**

Name and niche changes update the store.

**Step 3: Wire delete with confirmation dialog**

Show shadcn AlertDialog: "Delete [Name]? This will remove all content." Confirm deletes from store.

**Step 4: Commit**

```bash
git commit -m "feat: add Creator profile and edit view"
```

---

## Task 11: Credits System UI

**Files:**
- Create: `src/components/credits/credit-badge.tsx` — inline credit cost badge
- Create: `src/components/credits/credit-confirmation.tsx` — pre-generation confirmation
- Modify: `src/components/workspace/credits-display.tsx` — enhance with low-balance warning
- Create: `src/components/credits/buy-credits.tsx` — buy credits modal

**Step 1: Build CreditBadge**

Small inline badge showing credit cost: "2 cr" — used on action buttons, template cards, etc.

**Step 2: Build CreditConfirmation**

Before any generation, show inline confirmation in chat: "This will cost X credits. You have Y remaining. [Generate] [Cancel]"

**Step 3: Enhance CreditsDisplay**

Show different states: normal (green), low (< 10, amber), empty (red). Add "Buy Credits" link.

**Step 4: Build BuyCredits modal**

Simple modal showing credit pack options (mock pricing). Not wired to Stripe yet — just the UI.

**Step 5: Wire credit deductions to mock generation actions**

When user "generates" (mock), deduct credits from store and show updated balance.

**Step 6: Commit**

```bash
git commit -m "feat: add credits system UI with balance, badges, and confirmation"
```

---

## Task 12: Settings Panel

**Files:**
- Create: `src/components/settings/generation-settings.tsx` — generation settings panel
- Create: `src/components/settings/account-settings.tsx` — account page

**Step 1: Build GenerationSettings panel**

Sheet/drawer that opens from the gear icon in the input bar. Contains:
- Model selector (Auto recommended, or manual: image/video/voice dropdowns)
- Aspect ratio selector (9:16 Story, 1:1, 4:5, 16:9)
- Quality selector (Standard, HD, 4K +1cr)
- Metadata toggle (strip AI markers — on by default, can't turn off)
- Device selector (iPhone 15 Pro, etc.)

All settings are display-only for now — stored in local state.

**Step 2: Build AccountSettings page**

Simple page accessible from Settings in sidebar footer. Shows:
- Profile (from Clerk — name, email, avatar)
- Plan (Free/Pro/Business — mock)
- Credit balance
- Sign out button

**Step 3: Commit**

```bash
git commit -m "feat: add generation settings panel and account settings"
```

---

## Task 13: Onboarding Flow

**Files:**
- Create: `src/app/(workspace)/onboarding/page.tsx` — onboarding entry
- Create: `src/components/onboarding/welcome-screen.tsx` — two-path choice

**Step 1: Build WelcomeScreen**

After first sign-up (no Creators in store), show onboarding:
- "Welcome! Let's get you started."
- Two large cards side by side:
  1. "Build Your Own" — Create unique AI influencer from scratch (5 credits, ~2 min)
  2. "Pick a Pre-Made" — Browse 30+ ready-to-go AI influencers (Free, ~30 sec)

**Step 2: Wire paths**

- "Build Your Own" → start Creator wizard in chat
- "Pick a Pre-Made" → open pre-made library

**Step 3: After either path, land in workspace with Creator ready**

AI greeting: "What should we make first?"

**Step 4: Commit**

```bash
git commit -m "feat: add onboarding flow with build-your-own and pre-made paths"
```

---

## Task 14: Mobile Responsive Polish

**Files:**
- Modify: various component files for responsive breakpoints

**Step 1: Sidebar → Sheet on mobile**

Below `lg` breakpoint, sidebar becomes a Sheet triggered by hamburger icon in top header bar.

**Step 2: Mobile top bar**

Shows: hamburger menu, active Creator name + niche, credit balance.

**Step 3: Chat input — compact on mobile**

Mode selector pills scroll horizontally. Count selector and settings gear collapse behind a "more" button.

**Step 4: Content library — 2 columns on tablet, 1 on mobile**

**Step 5: Template cards — stack vertically on mobile**

**Step 6: Test all views at 375px, 768px, 1024px, 1440px**

**Step 7: Commit**

```bash
git commit -m "feat: polish mobile responsive layout across all views"
```

---

## Task 15: Final Integration + Polish

**Step 1: Wire all views together**

Verify complete flow:
1. Sign up → Onboarding → Pick path
2. Create Creator (wizard) OR adopt pre-made
3. Land in workspace with Creator active
4. Chat with AI (mock messages)
5. Switch between Chat / Library / Templates
6. Switch between Creators in sidebar
7. Open Creator profile, edit name
8. Open generation settings
9. See credit costs everywhere

**Step 2: Add loading skeletons**

Skeleton loaders for: Creator list, content grid, chat messages.

**Step 3: Add empty states**

- No content yet: "Generate your first content in the chat!"
- No Creators: redirect to onboarding

**Step 4: Add transitions**

Subtle fade/slide transitions between views (Chat ↔ Library ↔ Templates).

**Step 5: Final visual QA**

Match brand guide: cream backgrounds, charcoal text, Playfair Display headings, DM Sans body, pastels for accents, 12px button radius, 16px card radius.

**Step 6: Commit**

```bash
git commit -m "feat: final integration, skeletons, empty states, and polish"
```
