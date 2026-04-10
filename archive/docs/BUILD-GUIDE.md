# AI Influencer Academy — Build Guide

> For AI assistants (Claude, Cursor, etc.) building this app. Read this first.

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Framework | **Next.js 15** (App Router) | RSC, streaming, modern patterns |
| Styling | **Prototype-First CSS** + Tailwind v4 | Pixel-perfect UI from HTML prototypes |
| Components | **shadcn/ui** (for modals/forms only) | Used in Creator Studio wizard, not core layout |
| Auth | **Clerk** | Best DX, handles everything |
| Database | **Railway PostgreSQL + Prisma** | Type-safe, PrismaPg adapter |
| State | **Zustand** | Simple, no boilerplate |
| AI Generation | **Fal.ai** (direct from Next.js) | Image/video generation via server actions |
| Hosting | **Vercel** (Pro) | Edge network, CD from Git |

---

## Frontend Strategy: Prototype-First CSS

### The Rule

**Design in HTML prototypes first, then extract the CSS directly into `.css` files. React components use the same class names as the prototype. No Tailwind translation.**

This is the #1 most important frontend convention. We tried converting prototype CSS to Tailwind utility classes and it failed repeatedly — subtle differences caused pixel-level mismatches that were impossible to debug. Using the prototype CSS directly works perfectly every time.

### How It Works

1. **Design in prototype HTML** (`prototype/*.html`) — iterate until the UI looks right
2. **Extract the CSS** from the `<style>` block into a `.css` file (e.g., `workspace.css`)
3. **Import the CSS** in the relevant Next.js layout
4. **Use the same class names** in React JSX components
5. **Scope CSS variables** under a parent class (e.g., `.workspace`) to avoid conflicts

### Example

Prototype HTML:
```html
<style>
.workspace { --bg: #F5F5F5; --text-primary: #1A1A1A; }
.sidebar-header { display: flex; padding: 14px 16px; }
.creator-item { display: flex; padding: 8px 12px; border-radius: 10px; }
</style>

<div class="workspace">
  <aside class="ws-sidebar">
    <div class="sidebar-header">...</div>
    <button class="creator-item active">...</button>
  </aside>
</div>
```

React component:
```tsx
// layout.tsx
import "./workspace.css";

// creator-list.tsx
<button className={`creator-item${isActive ? " active" : ""}`}>
  <div className="creator-avatar">{initials}</div>
  <div className="creator-meta">
    <div className="creator-name">{creator.name}</div>
    <div className="creator-count">{creator.contentCount} items</div>
  </div>
</button>
```

### When to Use What

| Use Case | Approach |
|----------|----------|
| Core layout, sidebar, content grid, floating input | **Prototype CSS** (`.css` file with prototype class names) |
| Modals, dialogs, forms (Creator Studio) | **shadcn/ui** components with Tailwind |
| One-off utilities (a quick `flex`, `gap-2`, etc.) | **Tailwind** utility classes |
| New pages/features | **Prototype first**, then extract CSS |

### Current CSS Files

| File | Scope | What it styles |
|------|-------|----------------|
| `src/app/globals.css` | Global | Tailwind v4 `@theme`, base resets, font size |
| `src/app/workspace/workspace.css` | `.workspace` | Sidebar, header, content grid, floating input, filter bar, empty states |

---

## CSS Variables

Workspace-scoped variables (defined in `workspace.css` under `.workspace`):

```css
--bg: #F5F5F5;
--sidebar-bg: #FAFAFA;
--surface: #FFFFFF;
--card: #FFFFFF;
--accent: #7C5CFC;
--text-primary: #1A1A1A;
--text-secondary: #555555;
--text-muted: #999999;
--border: #EBEBEB;
--font-mono: "SF Mono", "Fira Code", "Fira Mono", monospace;
--radius-sm: 8px;
--radius-md: 12px;
```

---

## State Management (Zustand)

Three stores handle all client state:

| Store | File | Purpose |
|-------|------|---------|
| `useCreatorStore` | `src/stores/creator-store.ts` | Creators list, active creator, credits |
| `useUIStore` | `src/stores/ui-store.ts` | Creator Studio open/close |
| `useStudioStore` | `src/stores/studio-store.ts` | Wizard step, form data, generation state |

Data flows: **Server actions → Zustand stores → React components**

The `WorkspaceInit` component (`src/components/workspace/workspace-init.tsx`) hydrates stores from the database on mount.

---

## File Structure (Actual)

```
src/
├── app/
│   ├── globals.css              # Tailwind v4 @theme, base resets
│   ├── layout.tsx               # Root layout (Clerk provider, fonts)
│   ├── page.tsx                 # Landing / redirect
│   ├── sign-in/[[...sign-in]]/  # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/  # Clerk sign-up
│   ├── workspace/
│   │   ├── layout.tsx           # Workspace shell (sidebar + main canvas)
│   │   ├── page.tsx             # Workspace content
│   │   └── workspace.css        # All workspace styles (from prototype)
│   └── api/
│       └── webhooks/clerk/      # Clerk webhook → create User in DB
├── components/
│   ├── workspace/               # Core workspace UI
│   │   ├── app-sidebar.tsx      # Sidebar (logo, creator list, footer)
│   │   ├── creator-list.tsx     # Creator selection list
│   │   ├── workspace-header.tsx # Creator profile header bar
│   │   ├── workspace-canvas.tsx # Content grid + floating input
│   │   └── workspace-init.tsx   # Hydrates Zustand from DB
│   ├── studio/                  # Creator Studio wizard (modal)
│   │   ├── creator-studio.tsx   # Modal wrapper
│   │   ├── studio-tabs.tsx      # Tab navigation
│   │   ├── studio-footer.tsx    # Navigation + generate button
│   │   ├── studio-preview.tsx   # Live preview panel
│   │   └── tabs/
│   │       ├── basics-tab.tsx
│   │       ├── face-tab.tsx
│   │       ├── hair-tab.tsx
│   │       ├── body-tab.tsx
│   │       └── style-tab.tsx
│   └── ui/                      # shadcn/ui primitives
├── server/
│   └── actions/
│       ├── workspace-actions.ts # Load workspace data
│       ├── creator-actions.ts   # CRUD creators
│       ├── credit-actions.ts    # Credit operations
│       └── generate-actions.ts  # Fal.ai image generation
├── stores/
│   ├── creator-store.ts
│   ├── studio-store.ts
│   └── ui-store.ts
├── types/
│   ├── creator.ts
│   ├── content.ts
│   └── credits.ts
├── hooks/
│   └── use-mobile.ts            # Mobile breakpoint hook
├── lib/
│   ├── db.ts                    # Prisma client (PrismaPg adapter)
│   └── utils.ts                 # cn() helper
├── data/
│   └── mock-creators.ts         # Fallback mock data
└── generated/prisma/            # Prisma generated client
```

---

## Prototypes (Source of Truth for UI)

```
prototype/
├── landing.html                 # Marketing landing page
├── auth.html                    # Sign in/up/OTP
├── workspace-v1.html            # Main workspace (ACTIVE — styles extracted)
└── workspace-v1-snapshot.html   # Frozen pre-modal-cleanup reference
```

When building new UI, always start with the prototype HTML. If a prototype exists, the CSS in it is the authoritative source for styling.

---

## Adding New Features

### New workspace component
1. Design it in the prototype HTML file
2. Get the CSS right in the prototype
3. Add the CSS rules to `workspace.css`
4. Create the React component using the same class names
5. Wire data through Zustand stores and server actions

### New page/section (e.g., settings, marketplace)
1. Create a new prototype HTML file
2. Create a new `.css` file scoped under a parent class (e.g., `.settings`)
3. Create the Next.js route and layout
4. Import the CSS in the layout
5. Build React components with prototype class names

### Using shadcn/ui components
shadcn/ui is used for **overlays and form controls** (Dialog, Sheet, Select, RadioGroup, etc.), primarily in the Creator Studio wizard. For core layout and content display, use prototype CSS.

```bash
# Already installed shadcn components:
# dialog, sheet, select, radio-group, checkbox, input, label,
# textarea, slider, progress, badge, avatar, button, card,
# tabs, scroll-area, separator, dropdown-menu, alert-dialog,
# skeleton, sonner, tooltip, sidebar
```

---

## Database

- **PostgreSQL** on Railway
- **Prisma** with `@prisma/adapter-pg` (PrismaPg adapter)
- Client output: `src/generated/prisma`
- Schema: `prisma/schema.prisma`
- Seed: `prisma/seed.ts`

Models: `User`, `Creator`, `Content`, `GenerationJob`, `CreditTransaction`

---

## Quality Standards

### Performance
- Use `next/image` for all images
- Minimize client components — only `"use client"` when needed
- Skeleton loaders for async content

### Code Style
- TypeScript strict mode
- Server actions for mutations
- Zustand for client state (no prop drilling)
- Prototype CSS for styling (not Tailwind utilities for layout)

---

## Reference Files

| What | Where |
|------|-------|
| Product vision | `docs/VISION.md` |
| Generation pipeline | `docs/GENERATION-PIPELINE.md` |
| Course research | `docs/COURSE-RESEARCH.md` |
| Competitive positioning | `docs/COMPETITIVE-POSITIONING.md` |
| Tools & models reference | `docs/TOOLS-MODELS-REFERENCE.md` |
| Prototype (workspace) | `prototype/workspace-v1.html` |

---

*Build Guide v2 — 2026-03-13 — Updated to Prototype-First CSS strategy*
