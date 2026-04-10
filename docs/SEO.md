# realinfluencer.ai — SEO & Metadata Reference

> **Last updated:** 2026-03-25
> **Single source of truth:** `src/lib/brand.ts` — change brand name, colors, tagline, or domain there and all metadata/assets update automatically.

---

## Brand Constants

| Field | Value | Used By |
|-------|-------|---------|
| Name | `realinfluencer.ai` | Title tags, OG, manifest, JSON-LD |
| Short name | `realinfluencer` | Manifest (PWA home screen) |
| Tagline | `Create AI influencers that go viral` | Title template, OG title |
| Description | `Create custom AI influencers and generate unlimited content — photos, videos, talking-head clips.` | Meta description, OG, Twitter |
| Domain | `realinfluencer.ai` | Canonical URLs, sitemap |
| URL | `https://realinfluencer.ai` | metadataBase, alternates |
| Logo mark | `Vi` | Favicon, apple icon, OG image |
| Accent color | `#C4603A` (terracotta) | Favicon bg, manifest theme_color, viewport theme-color |
| Dark color | `#1A1A1A` | OG image background |
| Twitter | `@realinfluencerai` | Twitter card creator |

---

## Generated Assets

All icons/images are built at build time via `next/og` ImageResponse (JSX → PNG). No static image files to maintain.

| Asset | File | Route | Size | What It Shows |
|-------|------|-------|------|---------------|
| Favicon | `src/app/icon.tsx` | `/icon` | 32×32 | "Vi" on terracotta rounded square |
| Apple touch icon | `src/app/apple-icon.tsx` | `/apple-icon` | 180×180 | "Vi" on terracotta, larger radius |
| OG image | `src/app/opengraph-image.tsx` | `/opengraph-image` | 1200×630 | Vi mark + name + tagline on dark bg |
| Manifest | `src/app/manifest.ts` | `/manifest.webmanifest` | — | PWA manifest with brand colors |
| Robots | `src/app/robots.ts` | `/robots.txt` | — | Allow all, block /api/ only |
| Sitemap | `src/app/sitemap.ts` | `/sitemap.xml` | — | Landing, sign-up, sign-in, workspace, billing |

---

## Metadata by Page

### Root Layout (`src/app/layout.tsx`)
- `metadataBase`: `https://realinfluencer.ai`
- `title.template`: `%s | realinfluencer.ai` — child pages just set their own title
- `title.default`: `realinfluencer.ai — Create AI influencers that go viral`
- Full OG + Twitter card config
- `robots`: index, follow, googleBot max-image-preview: large
- `viewport`: theme-color #C4603A

### Landing Page (`src/app/page.tsx`)
- Title: `realinfluencer.ai — Create AI influencers that go viral`
- Canonical: `https://realinfluencer.ai`
- JSON-LD: `SoftwareApplication` schema (name, description, free offer)

### Sign Up (`src/app/sign-up/layout.tsx`)
- Title: `Sign up | realinfluencer.ai` (via template)
- Canonical: `https://realinfluencer.ai/sign-up`
- Indexed (acquisition page)

### Sign In (`src/app/sign-in/layout.tsx`)
- Title: `Sign in | realinfluencer.ai` (via template)
- Canonical: `https://realinfluencer.ai/sign-in`
- `noindex` (no SEO value)

### Workspace (`src/app/workspace/layout.tsx`)
- Title: `Workspace — AI Creator Studio | realinfluencer.ai`
- Canonical: `https://realinfluencer.ai/workspace`
- Custom OG title/description
- **No auth gate** — logged-out users and crawlers see `WorkspaceGate` component with SEO-friendly marketing content (features, benefits, CTAs)
- Logged-in users see the actual app
- In sitemap, allowed by robots.txt

---

## SEO Checklist

### Done
- [x] Dynamic favicon from brand constants
- [x] Apple touch icon
- [x] OG image (1200×630)
- [x] Web app manifest
- [x] robots.txt (blocks /api/ only — all pages crawlable)
- [x] sitemap.xml (all public + workspace pages)
- [x] Per-page titles via template
- [x] Canonical URLs on all public pages
- [x] JSON-LD structured data (landing page)
- [x] Twitter card (summary_large_image)
- [x] Google bot directives (max-image-preview: large)
- [x] Viewport theme-color
- [x] Keywords meta tag
- [x] Zero auth-gated pages — all routes serve SEO content to crawlers/logged-out users
- [x] WorkspaceGate component — SEO marketing page for workspace routes when not signed in
- [x] Workspace metadata — title, description, OG, canonical

### TODO (Marketing Mode)
- [ ] Custom OG images per page (sign-up could have its own)
- [ ] JSON-LD `Organization` schema with logo
- [ ] JSON-LD `FAQPage` schema on pricing section
- [ ] Blog/content section with per-post OG images
- [ ] Google Search Console verification meta tag
- [ ] Bing Webmaster verification meta tag
- [ ] More sitemap entries as public pages grow
- [ ] hreflang if we go multi-language
- [ ] Richer WorkspaceGate content (screenshots, testimonials, demo video)

---

## Auth-Free SEO Pattern

**No pages are auth-gated.** Every route is accessible to crawlers and logged-out users.

- Middleware (`src/proxy.ts`) runs Clerk but does NOT call `auth.protect()` on any route
- Workspace layout (`src/app/workspace/layout.tsx`) is a server component that exports metadata
- It renders `WorkspaceShell` (`src/components/workspace/workspace-shell.tsx`) which checks `useAuth().isSignedIn`
- **Logged out / crawler:** Shows `WorkspaceGate` — a static marketing page with feature descriptions, CTAs, and keyword-rich text
- **Logged in:** Shows the actual workspace app

This means Google indexes workspace pages with real content (feature descriptions, benefits) instead of a login wall or 404.

**To add a new gated page:**
1. Add server-side metadata in a layout.tsx
2. In the client component, check `useAuth().isSignedIn`
3. If not signed in, render marketing content; if signed in, render the app
4. Add to sitemap

---

## How to Update

**Change brand name, tagline, or colors:**
Edit `src/lib/brand.ts` → rebuild → everything updates.

**Add a new public page:**
1. Add metadata export or layout with metadata in the page's directory
2. Add the URL to `src/app/sitemap.ts`
3. Update this doc

**Add page-specific OG image:**
Create `opengraph-image.tsx` in that page's directory (Next.js file-based metadata, closest file wins).

**Add verification tags:**
Add to root layout metadata:
```typescript
verification: {
  google: "your-google-verification-code",
  yandex: "your-yandex-code",
},
```
