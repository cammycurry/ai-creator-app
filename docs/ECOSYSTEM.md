# AI Influencer Academy — Ecosystem Overview

> How the course, app, and brand fit together.

---

## The Business Model

```
┌────────────────────────────────────────────────────────────────┐
│                    AI INFLUENCER ACADEMY                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────┐ │
│   │   COURSE    │         │    APP      │         │  BRAND  │ │
│   │             │         │             │         │         │ │
│   │ Teaches the │  ───▶   │ Delivers    │  ◀───   │ Unified │ │
│   │ craft       │         │ the results │         │ identity│ │
│   │             │         │             │         │         │ │
│   │ $197        │         │ $29/mo      │         │         │ │
│   └─────────────┘         └─────────────┘         └─────────┘ │
│         │                       │                       │      │
│         └───────────┬───────────┘                       │      │
│                     │                                   │      │
│              ┌──────▼──────┐                           │      │
│              │   BUNDLES   │◀──────────────────────────┘      │
│              │ $297 / $497 │                                   │
│              └─────────────┘                                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Projects

| Project | Path | Purpose | Status |
|---------|------|---------|--------|
| **Course** | `/ai-content-course` | Curriculum, scripts, resources | ✅ Scripts complete |
| **App** | `/ai-creator-app` | SaaS platform | 📋 Spec'd, not built |
| **Legacy** | `/ai-creator-mgmt` | Old platform (DB, scraping) | ⚪ Reference only |

---

## Shared Assets

### Brand Kit
Both course and app use the same brand:
- **Course:** `/ai-content-course/brand-kit/`
- **App:** `/ai-creator-app/brand-kit/`

Keep these in sync. Source of truth is the course repo.

### Ava (AI Instructor)
- Created for course intro
- Can be used in app onboarding
- Represents the "proof of concept"

---

## Content Flow

```
STUDENT JOURNEY
───────────────

1. Discovers AI Influencer Academy (ads, content, affiliates)
         │
         ▼
2. Buys Course ($197) or Bundle ($297/$497)
         │
         ▼
3. Meets Ava in Lesson 0.0 — "I'm an AI, here's my story"
         │
         ▼
4. Learns the manual process (Modules 1-9)
         │
         ▼
5. Gets access to App (if bundle or subscribes)
         │
         ▼
6. Uses App to generate content faster
         │
         ▼
7. Monetizes (affiliates, subscriptions, UGC)
         │
         ▼
8. Becomes affiliate, refers others
```

---

## Naming Conventions

| What | Name | Don't Say |
|------|------|-----------|
| The brand | AI Influencer Academy | Digital Creator Academy |
| The course | AI Influencer Academy Course | AIA Course |
| The app | AI Influencer Academy App | Creator App |
| The instructor | Ava | Maya (old name) |
| Students' creations | Creator / AI Creator | Avatar / Model |

---

## Revenue Streams

### From Course
- **Course sales:** $197 one-time
- **Affiliates:** 40-50% commission
- **Upsell to app bundle**

### From App
- **Subscriptions:** $29/mo Pro, $79/mo Business
- **Course bundles:** $297 (course + 3mo app), $497 (course + lifetime)
- **Enterprise/API:** Future

### From Students' Success
- **Affiliate revenue share:** Students promote tools → we get kickback
- **Success stories:** Marketing fuel

---

## Tech Integration Points

### Course → App
- Students who buy course get app discount code
- Course curriculum references app features
- App has "Course Mode" with guided tutorials

### App → Course
- Free tier users see course upsell
- App demo videos can feature course content
- Template library mirrors course teachings

---

## Key Files

### Course
| File | Purpose |
|------|---------|
| `course/AVA-INSTRUCTOR-PLAN.md` | Ava implementation guide |
| `course/PRODUCTION-BIBLE.md` | Recording guidelines |
| `course/COURSE-OUTLINE-V2.md` | Full curriculum |
| `brand-kit/AI-Influencer-Academy-Brand-Kit.html` | Visual brand kit |

### App
| File | Purpose |
|------|---------|
| `docs/APP-SPEC-V1.md` | Feature spec |
| `docs/CREATOR-FLOW.md` | Avatar wizard flow |
| `docs/CONTENT-FLOW.md` | Content generation flow |
| `brand-kit/BRAND-GUIDE.md` | Dev-friendly brand guide |

---

## Next Steps

### Course (in progress)
1. Create Ava avatar
2. Record Module 0 (with Ava)
3. Record remaining modules
4. Launch on Skool

### App (queued)
1. Scaffold Next.js project
2. Implement creator wizard
3. Connect to image gen APIs
4. Beta with course students

---

*Created: 2026-02-25*
