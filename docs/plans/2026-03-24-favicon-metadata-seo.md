# Favicon, Metadata & SEO Assets Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete branding/SEO asset suite — dynamic favicon, apple-touch-icon, OG image, manifest, and full metadata — all driven from a single brand constants file.

**Architecture:** All icons and images are generated at build time via `ImageResponse` from `next/og` (JSX → PNG). Brand constants (colors, name, tagline, domain) live in `src/lib/brand.ts` so updating one file propagates everywhere. Next.js file-based metadata conventions auto-inject the correct `<link>` and `<meta>` tags.

**Tech Stack:** Next.js 16 App Router, `next/og` (ImageResponse), TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/brand.ts` | Create | Brand constants: colors, name, tagline, domain, descriptions |
| `src/app/icon.tsx` | Create | 32×32 dynamic favicon (Vi mark on terracotta) |
| `src/app/apple-icon.tsx` | Create | 180×180 dynamic apple-touch-icon |
| `src/app/opengraph-image.tsx` | Create | 1200×630 OG image for social sharing |
| `src/app/manifest.ts` | Create | Web app manifest with brand colors |
| `src/app/layout.tsx` | Modify (lines 18-22) | Full metadata using brand constants |
| `src/app/favicon.ico` | Delete | Replaced by dynamic `icon.tsx` |

---

### Task 1: Brand Constants

**Files:**
- Create: `src/lib/brand.ts`

- [ ] **Step 1: Create brand constants file**

```typescript
// src/lib/brand.ts

export const brand = {
  name: "realinfluencer.ai",
  shortName: "realinfluencer",
  tagline: "Create AI influencers that go viral",
  description:
    "Create custom AI influencers and generate unlimited content — photos, videos, talking-head clips.",
  domain: "realinfluencer.ai",
  url: "https://realinfluencer.ai",
  logoMark: "Vi",
  colors: {
    accent: "#C4603A",       // terracotta
    background: "#FAFAFA",
    foreground: "#111111",
    surface: "#FFFFFF",
    dark: "#1A1A1A",
  },
  social: {
    twitter: "@realinfluencerai",
  },
} as const;
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit src/lib/brand.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/brand.ts
git commit -m "feat: add brand constants file"
```

---

### Task 2: Dynamic Favicon (icon.tsx)

**Files:**
- Create: `src/app/icon.tsx`
- Delete: `src/app/favicon.ico`

- [ ] **Step 1: Create dynamic icon**

```typescript
// src/app/icon.tsx
import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: brand.colors.accent,
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          {brand.logoMark}
        </span>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Delete old favicon.ico**

```bash
rm src/app/favicon.ico
```

- [ ] **Step 3: Verify dev server renders icon**

Run: `pnpm dev` then open `http://localhost:3000/icon` in browser.
Expected: 32×32 PNG of "Vi" on terracotta rounded square.

- [ ] **Step 4: Commit**

```bash
git add src/app/icon.tsx
git rm src/app/favicon.ico
git commit -m "feat: add dynamic favicon, remove static favicon.ico"
```

---

### Task 3: Apple Touch Icon (apple-icon.tsx)

**Files:**
- Create: `src/app/apple-icon.tsx`

- [ ] **Step 1: Create apple icon**

```typescript
// src/app/apple-icon.tsx
import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: brand.colors.accent,
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          {brand.logoMark}
        </span>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Verify**

Open `http://localhost:3000/apple-icon` in browser.
Expected: 180×180 PNG of "Vi" on terracotta with larger border radius.

- [ ] **Step 3: Commit**

```bash
git add src/app/apple-icon.tsx
git commit -m "feat: add dynamic apple-touch-icon"
```

---

### Task 4: Open Graph Image (opengraph-image.tsx)

**Files:**
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Create OG image**

```typescript
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.dark,
          padding: 60,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            background: brand.colors.accent,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            {brand.logoMark}
          </span>
        </div>

        {/* Title */}
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {brand.name}
        </span>

        {/* Tagline */}
        <span
          style={{
            color: "#999999",
            fontSize: 26,
            fontWeight: 400,
          }}
        >
          {brand.tagline}
        </span>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Verify**

Open `http://localhost:3000/opengraph-image` in browser.
Expected: 1200×630 dark card with Vi mark, "realinfluencer.ai", and tagline.

- [ ] **Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "feat: add dynamic Open Graph image"
```

---

### Task 5: Web App Manifest (manifest.ts)

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Create manifest**

```typescript
// src/app/manifest.ts
import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: brand.colors.background,
    theme_color: brand.colors.accent,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
```

- [ ] **Step 2: Verify**

Open `http://localhost:3000/manifest.webmanifest` in browser.
Expected: JSON with brand name, colors, and icon references.

- [ ] **Step 3: Commit**

```bash
git add src/app/manifest.ts
git commit -m "feat: add web app manifest"
```

---

### Task 6: Full Metadata in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx` (lines 1, 18-22)

- [ ] **Step 1: Update metadata export**

Replace the existing metadata export (lines 18-22) with:

```typescript
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  keywords: [
    "AI influencer",
    "AI content creator",
    "AI generated content",
    "virtual influencer",
    "AI photos",
    "AI videos",
    "UGC",
  ],
  authors: [{ name: brand.name, url: brand.url }],
  creator: brand.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: brand.url,
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.description,
    creator: brand.social.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};
```

Also add `generateViewport` export (theme-color is no longer in Metadata):

```typescript
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: brand.colors.accent,
  width: "device-width",
  initialScale: 1,
};
```

- [ ] **Step 2: Verify**

Run: `pnpm dev` then view page source at `http://localhost:3000`.
Expected: `<meta>` tags for og:title, og:description, og:image, twitter:card, theme-color, etc.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add full metadata with OG, Twitter, and viewport"
```

---

## Verification

After all tasks:

1. `pnpm build` — succeeds
2. `http://localhost:3000/icon` — 32×32 terracotta Vi favicon
3. `http://localhost:3000/apple-icon` — 180×180 terracotta Vi
4. `http://localhost:3000/opengraph-image` — 1200×630 dark card
5. `http://localhost:3000/manifest.webmanifest` — JSON manifest
6. View source at `/` — all meta tags present (og, twitter, theme-color, robots)
7. Change `brand.colors.accent` to `#FF0000` → rebuild → all assets turn red (confirms single source of truth)
