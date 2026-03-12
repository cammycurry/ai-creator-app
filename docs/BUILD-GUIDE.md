# AI Influencer Academy — Build Guide

> For AI assistants (Claude, Cursor, etc.) building this app. Read this first.

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Framework | **Next.js 14+** (App Router) | RSC, streaming, modern patterns |
| Styling | **Tailwind CSS** | Utility-first, matches brand guide |
| Components | **shadcn/ui** | Accessible, customizable, not a dependency |
| Auth | **Clerk** | Best DX, handles everything |
| Database | **PostgreSQL + Prisma** | Type-safe, migrations |
| Storage | **AWS S3** (us-east-1) | Familiar, reliable, pairs with existing AWS usage |
| Payments | **Stripe** | Subscriptions, metered billing |
| Background Jobs | **Vercel Fluid Compute** | No extra vendor — functions run up to 14min on Pro plan |
| Hosting | **Vercel** (Pro) | Edge network, CD from Git, Fluid Compute for long tasks |

---

## Brand → shadcn/ui Integration

### Step 1: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Choose:
- Style: **New York** (cleaner, more minimal)
- Base color: **Neutral** (we'll override)
- CSS variables: **Yes**

### Step 2: Override CSS Variables

Replace the default shadcn CSS variables in `app/globals.css`:

```css
@layer base {
  :root {
    /* AI Influencer Academy Brand Colors */
    --background: 40 33% 98%;        /* cream #FAF8F5 */
    --foreground: 0 0% 17%;          /* charcoal #2C2C2C */
    
    --card: 0 0% 100%;               /* warm-white */
    --card-foreground: 0 0% 17%;     /* charcoal */
    
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 17%;
    
    --primary: 0 0% 17%;             /* charcoal - primary actions */
    --primary-foreground: 40 33% 98%; /* cream */
    
    --secondary: 30 23% 91%;         /* sand #F0EBE3 */
    --secondary-foreground: 0 0% 17%;
    
    --muted: 30 23% 91%;             /* sand */
    --muted-foreground: 0 0% 54%;    /* stone #8A8A8A */
    
    --accent: 17 36% 87%;            /* blush #E8D5CF */
    --accent-foreground: 0 0% 17%;
    
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    
    --border: 30 16% 88%;            /* light-line #E5E0DA */
    --input: 30 16% 88%;
    --ring: 0 0% 17%;                /* charcoal for focus */
    
    --radius: 0.75rem;               /* 12px - our default radius */
    
    /* Custom brand colors (extend) */
    --sage: 125 12% 79%;             /* #C5CFC6 */
    --sky: 207 39% 85%;              /* #CADCE8 */
    --lavender: 252 27% 85%;         /* #D5D0E5 */
    --peach: 22 55% 87%;             /* #F2D8C9 */
    --graphite: 0 0% 29%;            /* #4A4A4A */
    --stone: 0 0% 54%;               /* #8A8A8A */
    --mist: 0 0% 72%;                /* #B8B8B8 */
  }

  .dark {
    --background: 0 0% 17%;          /* charcoal */
    --foreground: 40 33% 98%;        /* cream */
    
    --card: 0 0% 20%;
    --card-foreground: 40 33% 98%;
    
    --popover: 0 0% 20%;
    --popover-foreground: 40 33% 98%;
    
    --primary: 40 33% 98%;           /* cream */
    --primary-foreground: 0 0% 17%;  /* charcoal */
    
    --secondary: 0 0% 25%;
    --secondary-foreground: 40 33% 98%;
    
    --muted: 0 0% 25%;
    --muted-foreground: 0 0% 54%;
    
    --accent: 17 36% 30%;
    --accent-foreground: 40 33% 98%;
    
    --border: 0 0% 30%;
    --input: 0 0% 30%;
    --ring: 40 33% 98%;
  }
}
```

### Step 3: Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn defaults (CSS variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand-specific (direct values for convenience)
        cream: "#FAF8F5",
        sand: "#F0EBE3",
        charcoal: "#2C2C2C",
        graphite: "#4A4A4A",
        blush: "#E8D5CF",
        sage: "#C5CFC6",
        sky: "#CADCE8",
        lavender: "#D5D0E5",
        peach: "#F2D8C9",
        stone: "#8A8A8A",
        mist: "#B8B8B8",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### Step 4: Font Setup

In `app/layout.tsx`:

```typescript
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
```

---

## Component Patterns

### Page Layout

```tsx
// Standard page structure
export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page header */}
        <header className="mb-12">
          <h1 className="font-display text-4xl tracking-tight">
            Page Title
          </h1>
          <p className="mt-2 text-muted-foreground">
            Description text here
          </p>
        </header>
        
        {/* Content */}
        <div className="space-y-8">
          {/* ... */}
        </div>
      </div>
    </main>
  )
}
```

### Cards (Brand Style)

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Standard card
<Card className="border-border/50">
  <CardHeader>
    <CardTitle className="font-display">Card Title</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* ... */}
  </CardContent>
</Card>

// Feature card with accent
<Card className="border-sage/50 bg-sage/10">
  <CardContent className="pt-6">
    <div className="flex items-center gap-4">
      <div className="rounded-xl bg-sage/30 p-3">
        <Icon className="h-6 w-6 text-charcoal" />
      </div>
      <div>
        <h3 className="font-medium">Feature Name</h3>
        <p className="text-sm text-muted-foreground">Description</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Buttons

```tsx
import { Button } from "@/components/ui/button"

// Primary (charcoal bg, cream text)
<Button>Get Started</Button>

// Secondary (sand bg)
<Button variant="secondary">Learn More</Button>

// Outline
<Button variant="outline">Cancel</Button>

// Ghost
<Button variant="ghost">Skip</Button>

// With icon
<Button>
  <ArrowRight className="mr-2 h-4 w-4" />
  Continue
</Button>
```

### Typography Patterns

```tsx
// Hero headline
<h1 className="font-display text-5xl font-normal tracking-tight sm:text-6xl">
  Build Your <em className="text-graphite">Faceless</em> Empire
</h1>

// Section header
<h2 className="font-display text-3xl">Section Title</h2>

// Card/component title
<h3 className="text-xl font-medium">Component Title</h3>

// Body text
<p className="text-muted-foreground leading-relaxed">
  Body copy goes here...
</p>

// Label/caption (mono)
<span className="font-mono text-xs uppercase tracking-wider text-stone">
  Module 01
</span>
```

---

## Wizard Flow Pattern

For the creator wizard, use a multi-step form pattern:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const STEPS = ["basics", "face", "hair", "body", "style"] as const
type Step = typeof STEPS[number]

export function CreatorWizard() {
  const [step, setStep] = useState<Step>("basics")
  const [data, setData] = useState<CreatorData>({})
  
  const currentIndex = STEPS.indexOf(step)
  const progress = ((currentIndex + 1) / STEPS.length) * 100
  
  const next = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex])
    }
  }
  
  const prev = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex])
    }
  }
  
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-mono text-xs uppercase tracking-wider text-stone">
            Step {currentIndex + 1} of {STEPS.length}
          </span>
          <span className="text-muted-foreground">{step}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Step content */}
      <Card className="p-8">
        {step === "basics" && <BasicsStep data={data} onChange={setData} />}
        {step === "face" && <FaceStep data={data} onChange={setData} />}
        {/* ... other steps */}
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={currentIndex === 0}>
          Back
        </Button>
        <Button onClick={next}>
          {currentIndex === STEPS.length - 1 ? "Generate" : "Continue"}
        </Button>
      </div>
    </div>
  )
}
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard shell
│   │   ├── page.tsx            # Dashboard home
│   │   ├── creators/
│   │   │   ├── page.tsx        # Creator list
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Creator wizard
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Creator detail
│   │   ├── content/
│   │   │   ├── page.tsx        # Content library
│   │   │   └── new/
│   │   │       └── page.tsx    # Content generator
│   │   └── settings/
│   ├── (marketing)/
│   │   ├── layout.tsx          # Marketing layout
│   │   ├── page.tsx            # Landing page
│   │   └── pricing/
│   ├── api/
│   │   ├── generate/
│   │   ├── webhooks/
│   │   └── trpc/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn components
│   ├── creators/               # Creator-specific components
│   ├── content/                # Content generation components
│   └── shared/                 # Shared components
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── auth.ts                 # Clerk helpers
│   ├── stripe.ts               # Stripe helpers
│   └── ai/                     # AI generation utils
│       ├── prompts.ts
│       ├── image.ts
│       └── video.ts
└── server/
    ├── routers/                # tRPC routers
    └── actions/                # Server actions
```

---

## Key shadcn Components to Install

```bash
# Core UI
npx shadcn@latest add button card input label
npx shadcn@latest add select radio-group checkbox
npx shadcn@latest add dialog sheet drawer
npx shadcn@latest add tabs accordion
npx shadcn@latest add progress slider
npx shadcn@latest add avatar badge
npx shadcn@latest add toast sonner
npx shadcn@latest add dropdown-menu

# Forms
npx shadcn@latest add form
# (uses react-hook-form + zod)

# Data display
npx shadcn@latest add table
npx shadcn@latest add skeleton
```

---

## Quality Standards

### Accessibility
- All interactive elements focusable
- Color contrast meets WCAG AA
- Form labels properly associated
- Loading states announced
- Error messages clear

### Performance
- Use `next/image` for all images
- Lazy load below-fold content
- Minimize client components
- Use React Server Components where possible
- Skeleton loaders for async content

### Code Style
- TypeScript strict mode
- Explicit return types on functions
- Zod for all runtime validation
- Server actions for mutations
- tRPC for complex queries

---

## Reference Files

| What | Where |
|------|-------|
| Brand colors | `/brand-kit/BRAND-GUIDE.md` |
| Visual brand kit | `/brand-kit/AI-Influencer-Academy-Brand-Kit.html` |
| App spec | `/docs/APP-SPEC-V1.md` |
| Creator wizard flow | `/docs/CREATOR-FLOW.md` |
| Content flow | `/docs/CONTENT-FLOW.md` |

---

*Build Guide v1 — 2026-02-25*
