# PageGate & SEO Article System — Design Spec

> **Date:** 2026-04-07
> **Status:** Approved for implementation
> **Depends on:** `docs/SEO-MARKET-RESEARCH.md` (market research, hero creators, keyword strategy)

---

## Problem

Logged-out users hitting `/workspace`, `/workspace/library`, or `/workspace/billing` see a generic `WorkspaceGate` — a simple marketing blurb with feature cards. This wastes the most valuable SEO real estate in the app. Google sees a thin page. Users see nothing that makes them want to sign up.

## Solution

Replace `WorkspaceGate` with a **PageGate** system: each workspace page renders the **real dashboard UI with dummy data** when logged out, with every click triggering a sign-in dialog. Below the dashboard preview, a **rich SEO article** specific to that page provides keyword-dense content for crawlers and gives logged-out users a compelling reason to convert.

When logged in, none of this appears — just the real app.

---

## Architecture

### Core Component: `<PageGate>`

A generic wrapper that any page can use. Lives at `src/components/gate/page-gate.tsx`.

```tsx
<PageGate article={<WorkspaceArticle />}>
  {/* Real page components rendered with dummy data */}
  <ContentGrid items={dummyContent} />
</PageGate>
```

**Props:**
- `children` — the dashboard preview (real components, dummy data)
- `article` — React node containing the SEO article for this page
- `ctaText?` — optional custom CTA text (default: "Sign up free to start creating")

**What it does:**
1. Wraps children in a div with `onClickCapture` — intercepts ALL clicks inside the preview
2. On any click: prevents default, stops propagation, opens Clerk `<SignIn />` modal
3. Renders children normally at the top (the fake dashboard)
4. Renders a sticky bottom CTA bar over the preview area
5. Renders the `article` prop below the preview
6. Adds `<SignIn />` modal (Clerk component) controlled by local state

**What it does NOT do:**
- Does not blur, overlay, or dim the dashboard preview
- Does not modify child components in any way
- Does not interfere with scrolling
- Does not add any wrapper around individual child elements

### Click Interception

```tsx
const [showSignIn, setShowSignIn] = useState(false);

const handleClickCapture = (e: React.MouseEvent) => {
  // Allow anchor links to sign-in/sign-up (the CTA buttons themselves)
  const target = e.target as HTMLElement;
  const link = target.closest("a");
  if (link && (link.href.includes("/sign-in") || link.href.includes("/sign-up"))) {
    return; // Let these through
  }

  e.stopPropagation();
  e.preventDefault();
  setShowSignIn(true);
};
```

This catches clicks on buttons, inputs, cards, images — anything inside the dummy dashboard. The sign-in modal appears. Clean, no per-component changes needed.

### Sign-In Modal

Use Clerk's `<SignIn />` component in a shadcn `Dialog`:

```tsx
<Dialog open={showSignIn} onOpenChange={setShowSignIn}>
  <DialogContent>
    <SignIn afterSignInUrl={currentPath} />
  </DialogContent>
</Dialog>
```

After sign-in, user lands back on the same page — now seeing the real app.

### Sticky CTA Bar

A floating bar at the bottom of the dashboard preview area (not the full page — just the preview section). Always visible while scrolling through the preview.

```
┌──────────────────────────────────────────────────────┐
│  ✨ Sign up free — 10 credits, no card required  [Get Started]  │
└──────────────────────────────────────────────────────┘
```

- `position: sticky; bottom: 0` on the preview wrapper
- Semi-transparent background with backdrop blur
- Primary CTA button links to `/sign-up`
- Disappears once you scroll past the preview into the article

---

## Integration with Workspace Shell

### Current Flow (workspace-shell.tsx)

```
authLoaded && !isSignedIn → <WorkspaceGate />   (generic marketing page)
authLoaded && isSignedIn  → real workspace shell (sidebar + header + children)
```

### New Flow

```
authLoaded && !isSignedIn → real workspace shell with dummy data + <PageGate> wrapping children
authLoaded && isSignedIn  → real workspace shell with real data (unchanged)
```

**Key change:** The shell always renders the full chrome (sidebar, header) when logged out — but with dummy data. This means crawlers and logged-out users see the actual app layout. The sidebar shows dummy creators (our hero roster). The header shows a dummy active creator.

### Shell Changes

`workspace-shell.tsx` needs to:

1. **Remove the `WorkspaceGate` early return** — no more binary swap
2. **When `!isSignedIn`:** render the shell chrome with dummy data
   - Sidebar: show hero creator list (Sienna, Valentina, Jordyn, etc.) with avatar images
   - Header: show the first dummy creator as "active"
   - Skip `<WorkspaceInit />` (no real data to fetch)
   - Skip `<CreatorStudio />` and `<ContentStudioV2 />` (not needed for preview)
3. **Pass `isSignedIn` context** so child pages know whether to render real or dummy content
4. **When `isSignedIn`:** everything works exactly as it does today (no changes)

### Auth Context

Create a simple context or prop for pages to check:

```tsx
// Option A: Use existing useAuth() — pages already can check this
const { isSignedIn } = useAuth();

// In each page:
if (!isSignedIn) {
  return (
    <PageGate article={<WorkspaceArticle />}>
      <ContentGrid items={dummyWorkspaceContent} />
    </PageGate>
  );
}

// Normal page content...
```

No new context needed — pages just use `useAuth()` directly, same pattern the shell already uses.

---

## Dummy Data

### Dummy Creators (Sidebar)

A static array matching our hero roster. Used by the sidebar when logged out.

```ts
// src/data/showcase-creators.ts
export const showcaseCreators = [
  { id: "sienna", name: "Sienna", handle: "@siennarose", niche: "Exclusive", avatarUrl: "/showcase/sienna-avatar.jpg" },
  { id: "valentina", name: "Valentina", handle: "@val.fitted", niche: "Fitness", avatarUrl: "/showcase/valentina-avatar.jpg" },
  { id: "jordyn", name: "Jordyn", handle: "@jordynxo", niche: "Fashion", avatarUrl: "/showcase/jordyn-avatar.jpg" },
  { id: "nara", name: "Nara", handle: "@narakim_", niche: "K-Beauty", avatarUrl: "/showcase/nara-avatar.jpg" },
  { id: "camila", name: "Camila", handle: "@camila.vida", niche: "Travel", avatarUrl: "/showcase/camila-avatar.jpg" },
  { id: "marcus", name: "Marcus", handle: "@marcusfits", niche: "Fitness", avatarUrl: "/showcase/marcus-avatar.jpg" },
];
```

### Dummy Content (Workspace Page)

Static content items for the workspace content grid. These are real generated images from our hero creators, stored in S3 or `/public/showcase/`.

```ts
// src/data/showcase-content.ts
export const showcaseContent = [
  { id: "s1", type: "IMAGE", url: "/showcase/sienna-gym-mirror.jpg", userInput: "Mirror selfie at the gym" },
  { id: "s2", type: "IMAGE", url: "/showcase/sienna-bedroom-golden.jpg", userInput: "Golden hour in bedroom" },
  { id: "s3", type: "IMAGE", url: "/showcase/valentina-post-workout.jpg", userInput: "Post-workout selfie" },
  // ... 15-20 items total to fill the grid
];
```

### Dummy Content (Library Page)

Similar but organized by tabs/categories to match the library UI — photos, carousels, videos (coming soon badges).

### Dummy Plans (Billing Page)

The actual plan cards — these are real data already, just rendered without a signed-in user context.

### Image Assets

All showcase images live in `/public/showcase/` initially (fast, no auth needed, cacheable). Later we can move to S3 CDN URLs for better performance.

Images need to be:
- Generated by our own tool (dogfooding)
- Optimized to WebP
- Multiple sizes for responsive (next/image handles this)
- Fire enough that someone seeing them immediately wants to create their own

---

## SEO Articles

### Component Structure

One article component per page, living in `src/components/seo/`:

```
src/components/seo/
  workspace-article.tsx     — "How to Create AI Influencers"
  library-article.tsx       — "AI Content Library"
  billing-article.tsx       — "AI Influencer Pricing"
```

### Article Format

Each article is a server-renderable React component (no client state needed). Structure:

```tsx
export function WorkspaceArticle() {
  return (
    <article className="seo-article">
      {/* JSON-LD for this page */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      
      <h1>How to Create AI Influencers That Make Money</h1>
      
      <section>
        <h2>What is an AI Influencer?</h2>
        <p>...</p>
      </section>

      <section>
        <h2>How to Create Your First AI Influencer</h2>
        <p>Step-by-step walkthrough of the wizard...</p>
      </section>

      <section>
        <h2>How AI Influencers Make Money</h2>
        <p>Income stats, niches, platforms (Fanvue, Instagram, TikTok)...</p>
      </section>

      <section>
        <h2>Why Use realinfluencer.ai</h2>
        <p>One tool vs 6-tool stack, face consistency, metadata stripping...</p>
      </section>

      <section className="seo-faq">
        <h2>Frequently Asked Questions</h2>
        {/* FAQ items — also in JSON-LD FAQPage schema */}
      </section>

      <section className="seo-internal-links">
        <h2>Explore More</h2>
        {/* Links to other workspace pages, pricing, etc. */}
      </section>
    </article>
  );
}
```

### Article Content per Page

| Page | Article H1 | Key Sections | Target Keywords |
|------|-----------|--------------|----------------|
| `/workspace` | "How to Create AI Influencers That Make Money" | What is an AI influencer, step-by-step creation, monetization (Fanvue, Instagram, UGC), why this tool, FAQ | AI influencer generator, create AI influencer, make money AI influencer |
| `/workspace/library` | "AI Content Library — Photos, Videos & Carousels for Your AI Creator" | Content types explained, templates, carousels, managing your library, content strategy tips | AI influencer content, AI generated photos, AI content library |
| `/workspace/billing` | "AI Influencer Tool Pricing — Pay Only For What You Generate" | Credit system explained, plan comparison, cost vs competitors ($200/video UGC vs $0.15/credit), ROI examples | AI influencer pricing, AI content creator cost, AI UGC pricing |

### Article Styling

New CSS file: `src/app/workspace/seo-article.css`

Style the articles to look like a real blog post / content page:
- Max-width ~720px centered
- Clean typography (Inter, the existing brand font)
- Proper heading hierarchy (H1 → H2 → H3)
- Comfortable line-height and spacing
- FAQ items as expandable details/summary elements
- Internal link cards with descriptions
- Separator between the dashboard preview and the article

**Important:** These styles are NEW components (not from prototypes), so Tailwind is allowed per project rules. But a dedicated CSS file is cleaner for this amount of content styling.

### JSON-LD Schemas

Each article adds page-specific structured data:

- **Workspace:** `HowTo` schema (step-by-step guide) + `FAQPage`
- **Library:** `FAQPage`
- **Billing:** `FAQPage` + `Offer` schema with pricing tiers

These supplement the existing `SoftwareApplication` schema on the landing page.

### Visibility Toggle

Articles are hidden when logged in. Same pattern as GoodGrade's `HumanizeFooter`:

```tsx
// Inside PageGate — article only renders when component is used (which is only when !isSignedIn)
// So no visibility toggle needed — the PageGate itself is the gate
```

Since `PageGate` only renders when `!isSignedIn`, the articles are inherently hidden from logged-in users.

---

## Page-by-Page Implementation

### `/workspace` (Priority 1)

**Logged-out view:**
- Full shell chrome: sidebar with hero creators, header with "Sienna" active
- Content grid filled with 15-20 showcase images (Sienna's content)
- Floating input bar (non-functional, click → sign-in)
- Filter pills showing counts
- Quick idea chips
- Sticky CTA bar at bottom of preview
- Below: `<WorkspaceArticle />` — "How to Create AI Influencers That Make Money"

**Logged-in view:** Unchanged from today.

### `/workspace/library` (Priority 2)

**Logged-out view:**
- Shell chrome with hero creators in sidebar
- Library UI with tabs (All, Photos, Carousels, Videos), search bar, filters
- Thumbnail grid filled with showcase content across multiple creators
- Click any thumbnail → sign-in
- Below: `<LibraryArticle />` — "AI Content Library"

**Logged-in view:** Unchanged from today.

### `/workspace/billing` (Priority 3)

**Logged-out view:**
- Shell chrome with hero creators in sidebar
- Plan comparison cards (Free, Starter, Pro, Business) — already real data, just render them
- Credit pack cards
- "What credits cost" breakdown
- Click any "Get Started" button → sign-in
- Below: `<BillingArticle />` — "AI Influencer Tool Pricing"

**Logged-in view:** Unchanged from today.

### `/workspace/settings` (Skip for Now)

Low SEO value. Keep the current generic gate or just redirect to workspace.

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/gate/page-gate.tsx` | Generic PageGate wrapper component |
| `src/components/seo/workspace-article.tsx` | SEO article for workspace page |
| `src/components/seo/library-article.tsx` | SEO article for library page |
| `src/components/seo/billing-article.tsx` | SEO article for billing page |
| `src/data/showcase-creators.ts` | Hero creator dummy data |
| `src/data/showcase-content.ts` | Showcase content items for dummy grids |
| `src/app/workspace/seo-article.css` | Article styling |
| `public/showcase/` | Hero creator images (generated by our tool) |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/workspace/workspace-shell.tsx` | Remove `WorkspaceGate` early return. Render shell chrome with dummy data when `!isSignedIn`. |
| `src/components/workspace/app-sidebar.tsx` | Accept optional `dummyCreators` prop for logged-out rendering |
| `src/components/workspace/workspace-header.tsx` | Accept optional `dummyCreator` prop for logged-out rendering |
| `src/app/workspace/page.tsx` | Check auth, render dummy content + `PageGate` when logged out |
| `src/app/workspace/library/page.tsx` | Same pattern |
| `src/app/workspace/billing/page.tsx` | Same pattern |
| `src/app/sitemap.ts` | Add `/workspace/library` |

### Deleted Files

| File | Reason |
|------|--------|
| `src/components/workspace/workspace-gate.tsx` | Replaced by PageGate system |

---

## Rollout Order

### Step 1: Foundation
1. Create `<PageGate>` component with click interception + sign-in modal
2. Create showcase data files (creators + content) — initially with placeholder images
3. Create `seo-article.css` with article styling

### Step 2: Workspace Page
4. Modify `workspace-shell.tsx` — remove `WorkspaceGate`, render shell chrome when logged out
5. Update `app-sidebar.tsx` to accept dummy creators
6. Update `workspace-header.tsx` to accept dummy creator
7. Update `workspace/page.tsx` to render dummy content grid + PageGate when logged out
8. Write `workspace-article.tsx` with full SEO content

### Step 3: Sub-Pages
9. Update `library/page.tsx` with dummy library + PageGate
10. Write `library-article.tsx`
11. Update `billing/page.tsx` with PageGate (plan cards already render without auth)
12. Write `billing-article.tsx`

### Step 4: Polish
13. Generate real hero creator images and replace placeholders
14. Add JSON-LD schemas to each article
15. Update sitemap
16. Test: crawl pages as Googlebot, verify rich content is visible
17. Delete `workspace-gate.tsx`

---

## Open Questions

1. **Hero creator images:** Need to actually generate these with our wizard before the dummy dashboards look good. Can start with placeholder images and swap in real ones.
2. **Mobile gate experience:** The full shell chrome (sidebar) is hidden on mobile. The logged-out mobile view should show just the header + content grid + CTA + article. No dummy sidebar.
3. **Blog:** The SEO research doc recommends a `/blog` for pillar content (money guides, tool comparisons). That's a separate spec — not part of this PageGate work.
