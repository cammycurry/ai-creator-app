# AI Influencer Academy — App Spec v1

> The companion app for AI Influencer Academy. Course teaches the craft → App gives the results.

**Brand:** See `/brand-kit/BRAND-GUIDE.md` for colors, typography, UI guidelines.  
**Course:** See `/ai-content-course` for full curriculum and resources.

---

## Core Insight

The course teaches a **manual prompt-based workflow** across multiple tools:
- OpenArt (image gen)
- Lupa (upscaling)
- Kling (video)
- ElevenLabs (voice)
- CapCut (editing)

**Our app consolidates this into ONE guided flow.**

---

## PHASE 1: Creator Builder

### The Avatar Creation Formula (from course)

The course teaches this prompt structure:
```
Front-facing portrait of a [GENDER], raw iPhone photography style,
visible from waist up, standing straight with arms relaxed,
facing the camera directly against a pure white seamless studio background.
[GENDER-SPECIFIC CLOTHING: white sports bra / shirtless]

[FACE DESCRIPTION: shape, eyes, expression, eyebrows, nose, lips]
[SKIN DESCRIPTION: tone, texture, imperfections]
[HAIR DESCRIPTION: color, length, style]
[BODY DESCRIPTION: type, proportions]
```

### App Wizard Flow

**Step 1: Basic Info**
```
┌─────────────────────────────────────────┐
│  CREATE YOUR CREATOR                     │
├─────────────────────────────────────────┤
│                                          │
│  Gender:  ○ Female  ○ Male  ○ Other     │
│                                          │
│  Age Range:  [18-25 ▼]                  │
│              18-25 / 25-30 / 30-40 / 40+│
│                                          │
│  Ethnicity: [Select ▼]                  │
│             Caucasian / Asian / Black /  │
│             Hispanic / Middle Eastern /  │
│             Mixed / Other               │
│                                          │
│                          [Next →]        │
└─────────────────────────────────────────┘
```

**Step 2: Face & Features**
```
┌─────────────────────────────────────────┐
│  FACE & FEATURES                         │
├─────────────────────────────────────────┤
│                                          │
│  Skin Tone:                              │
│  [○][○][○][○][○][○][○][○] ← color picker │
│  Light ------- Medium ------- Dark      │
│                                          │
│  Eye Color:                              │
│  [🔵] [🟤] [🟢] [⚫] [🔘]                 │
│  Blue  Brown Green Hazel Gray           │
│                                          │
│  Eye Shape:                              │
│  ○ Almond  ○ Round  ○ Hooded  ○ Deep-set│
│                                          │
│  Face Shape:                             │
│  ○ Oval  ○ Round  ○ Square  ○ Heart     │
│                                          │
│  Lips:                                   │
│  ○ Thin  ○ Medium  ○ Full  ○ Very Full  │
│                                          │
│                          [Next →]        │
└─────────────────────────────────────────┘
```

**Step 3: Hair**
```
┌─────────────────────────────────────────┐
│  HAIR STYLE                              │
├─────────────────────────────────────────┤
│                                          │
│  Hair Color:                             │
│  [Blonde ▼]                             │
│  Blonde / Brunette / Black / Red /       │
│  Auburn / Gray / Platinum / Ombre       │
│                                          │
│  Hair Length:                            │
│  ○ Short  ○ Medium  ○ Long  ○ Very Long │
│                                          │
│  Hair Texture:                           │
│  ○ Straight  ○ Wavy  ○ Curly  ○ Coily  │
│                                          │
│  [Show reference images for each]        │
│                                          │
│                          [Next →]        │
└─────────────────────────────────────────┘
```

**Step 4: Body**
```
┌─────────────────────────────────────────┐
│  BODY TYPE                               │
├─────────────────────────────────────────┤
│                                          │
│  Build:                                  │
│  ○ Slim  ○ Athletic  ○ Average          │
│  ○ Curvy  ○ Plus-size                   │
│                                          │
│  [IF FEMALE]                             │
│  Chest Size:                             │
│  ○ Small  ○ Medium  ○ Medium-Large      │
│  ○ Large                                 │
│                                          │
│  Height Impression:                      │
│  ○ Petite  ○ Average  ○ Tall            │
│                                          │
│                          [Next →]        │
└─────────────────────────────────────────┘
```

**Step 5: Vibe & Style**
```
┌─────────────────────────────────────────┐
│  VIBE & PERSONALITY                      │
├─────────────────────────────────────────┤
│                                          │
│  Overall Vibe (pick up to 3):            │
│  [Girl Next Door] [Glamorous] [Edgy]    │
│  [Fitness] [Soft/Cute] [Sophisticated]  │
│  [Natural Beauty] [Exotic] [Classic]    │
│                                          │
│  Expression:                             │
│  ○ Warm & Friendly                       │
│  ○ Confident & Sexy                      │
│  ○ Mysterious & Alluring                 │
│  ○ Playful & Fun                         │
│                                          │
│  Distinctive Features (optional):        │
│  □ Freckles  □ Beauty mark  □ Dimples   │
│  □ Gap teeth  □ Unique birthmark         │
│                                          │
│                          [Generate →]    │
└─────────────────────────────────────────┘
```

**Step 6: Generation & Selection**
```
┌─────────────────────────────────────────┐
│  CHOOSE YOUR CREATOR                     │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │     │ │     │ │     │ │     │       │
│  │  1  │ │  2  │ │  3  │ │  4  │       │
│  │     │ │     │ │     │ │     │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│    ○       ○       ●       ○            │
│                                          │
│  [🔄 Generate More]  [✏️ Adjust]        │
│                                          │
│  Like the face but want changes?         │
│  → Adjust specific features              │
│                                          │
│                     [Select & Continue →]│
└─────────────────────────────────────────┘
```

**Step 7: Refinement (if needed)**
```
┌─────────────────────────────────────────┐
│  REFINE YOUR CREATOR                     │
├─────────────────────────────────────────┤
│                                          │
│  Selected: [Image 3]                     │
│                                          │
│  What would you like to change?          │
│                                          │
│  □ Make lips fuller                      │
│  □ Different hair color → [____]         │
│  □ Different eye color → [____]          │
│  □ Add/remove freckles                   │
│  □ Change expression                     │
│  □ Adjust body proportions               │
│                                          │
│  [Regenerate with changes]               │
│                                          │
└─────────────────────────────────────────┘
```

**Step 8: Upscale & Finalize**
```
┌─────────────────────────────────────────┐
│  FINALIZE YOUR CREATOR                   │
├─────────────────────────────────────────┤
│                                          │
│  Adding ultra-realism...                 │
│  [████████████░░░░] 75%                  │
│                                          │
│  ✅ Enhanced skin texture                │
│  ✅ Added natural imperfections          │
│  ✅ 4K upscaled                          │
│                                          │
│  ┌─────────────────┐                    │
│  │                 │                    │
│  │   FINAL IMAGE   │                    │
│  │                 │                    │
│  └─────────────────┘                    │
│                                          │
│  Name your creator: [____________]       │
│                                          │
│                     [Save & Continue →]  │
└─────────────────────────────────────────┘
```

---

## Backend: Prompt Assembly

The wizard inputs get assembled into the master prompt:

```javascript
function buildAvatarPrompt(inputs) {
  const gender = inputs.gender;
  const clothing = gender === 'female' ? 'white sports bra' : 'shirtless';
  
  return `Front-facing portrait of a ${inputs.age}-year-old ${inputs.ethnicity} ${gender}, 
raw iPhone photography style, visible from waist up, standing straight with arms relaxed, 
facing the camera directly against a pure white seamless studio background. 
${gender === 'female' ? 'She' : 'He'} is ${clothing}, revealing a ${inputs.build} upper body 
${inputs.chestSize ? `with ${inputs.chestSize} chest` : ''}.

Face has a ${inputs.faceShape} shape with ${inputs.eyeShape} ${inputs.eyeColor} eyes, 
${inputs.expression} expression. ${inputs.lips} lips with natural texture.

Skin is ${inputs.skinTone} with natural texture, visible pores, 
${inputs.freckles ? 'light freckles across nose and cheeks, ' : ''}
and subtle natural imperfections.

${inputs.hairLength} ${inputs.hairColor} hair, ${inputs.hairTexture}, 
styled naturally. Natural hairline.

Overall aesthetic: ${inputs.vibes.join(', ')}. 
No makeup, no beauty filters, hyper-realistic, raw iPhone quality.`;
}
```

---

## PHASE 2: Content Creation

Once they have a creator, they can make content:

### Template Library

Categories:
- **Lifestyle** (morning routine, day in my life, get ready with me)
- **Fitness** (gym check, workout clips, progress)
- **Talking Head** (tips, reactions, storytime)
- **Trending** (current viral formats)
- **Product/UGC** (holding products, reviews)
- **Thirst Traps** (mirror selfies, POV boyfriend, etc.)

Each template includes:
- Scene prompt template
- Suggested video motion
- Trending audio options
- Caption templates
- Hashtag sets

### Content Generation Flow

```
1. Pick Template (e.g., "Mirror Selfie - Gym")
   
2. Customize Scene
   - Outfit: [Gym wear ▼] 
   - Setting: [Gym locker room ▼]
   - Mood: [Confident ▼]
   
3. Generate Images (4 variations)
   - Pick favorite
   
4. Generate Video
   - Motion style: [Subtle movement ▼]
   - Duration: [3s ▼] [5s ▼] [10s ▼]
   
5. Add Audio/Text
   - Trending sound library
   - Text overlay templates
   - Auto-captions
   
6. Export / Schedule
```

---

## PHASE 3: Voice & Talking Content

### Voice Setup
```
1. Pick voice style
   - Soft & feminine
   - Confident & clear
   - Playful & energetic
   - [Custom clone option - later]

2. Test with sample text
3. Save to creator profile
```

### Talking Video Flow
```
1. Write/paste script
2. AI generates speech
3. Select base image (or generate new)
4. Generate lip-sync video
5. Add text overlays
6. Export
```

---

## Data Model

```
User
├── id
├── email
├── subscription_tier
└── creators[]
    ├── id
    ├── name
    ├── base_image_url
    ├── settings (all wizard inputs as JSON)
    ├── voice_id (if set up)
    ├── variations[] (outfit variations, etc.)
    └── content[]
        ├── id
        ├── type (image/video)
        ├── template_used
        ├── url
        ├── created_at
        └── posted_to[]
```

---

## API Integrations Needed

| Function | API/Service | Notes |
|----------|-------------|-------|
| Image Generation | Fal.ai / Replicate | Nano Banana Pro, Seedream |
| Upscaling | Replicate (Real-ESRGAN) or build our own Lupa-like |
| Video Generation | Kling API (if available), Runway, or Luma |
| Voice/TTS | ElevenLabs | Voice cloning later |
| Lip Sync | Sync Labs, Hedra API, or similar |
| Storage | S3 / Cloudflare R2 | User media |
| Auth | Clerk / Auth.js | |
| Payments | Stripe | Subscriptions |
| Posting | Meta API, TikTok API | Later phase |

---

## MVP Feature Scope

### V1 (Launch)
- [ ] Creator wizard (full flow above)
- [ ] Store multiple creators per account
- [ ] 10-20 content templates
- [ ] Image generation with creator
- [ ] Basic video generation (image-to-video)
- [ ] Download content
- [ ] Basic subscription (free tier + paid)

### V2
- [ ] Voice setup + talking videos
- [ ] Lip sync integration
- [ ] More templates (50+)
- [ ] Scheduled posting
- [ ] Analytics

### V3
- [ ] Direct posting to IG/TikTok
- [ ] AI caption generator
- [ ] Trending sound library
- [ ] A/B testing content
- [ ] Team/agency features

---

## Pricing Ideas

**Free Tier**
- 1 creator
- 5 generations/month
- Watermarked exports

**Pro ($29/mo)**
- 3 creators
- 100 generations/month
- No watermark
- All templates

**Business ($79/mo)**
- Unlimited creators
- Unlimited generations
- Priority generation
- API access
- White-label option

---

## Tech Stack Suggestion

- **Frontend:** Next.js + Tailwind + shadcn/ui
- **Backend:** Next.js API routes or separate Node/Python service
- **Database:** PostgreSQL (via Supabase or Railway)
- **Storage:** Cloudflare R2 or S3
- **Queue:** Inngest or BullMQ (for generation jobs)
- **Realtime:** Pusher or Ably (for generation status)

---

## Key Differentiators

| Competitors (AICA, etc.) | AI Influencer Academy App |
|--------------------------|---------------------------|
| Manual prompting | Visual wizard |
| 5+ separate tools | All-in-one platform |
| Learn the craft | Just get results |
| Course-only | Course + App bundle |
| Text instructions | Click & generate |
| DIY everything | Template library |
| Generic instructor | Ava (AI avatar proof-of-concept) |

---

---

## Course + App Integration

**Ava** is the AI avatar instructor for the course. She demonstrates everything students will learn — living proof the system works.

**Bundle Pricing Options:**
- Course only: $197
- App only: $29/mo (Pro tier)
- **Course + App Bundle:** $297 (course + 3 months Pro)
- **Lifetime Bundle:** $497 (course + lifetime app access)

Students who buy the course get onboarded into the app with guided tutorials matching the curriculum.

---

*Spec v1 — Updated 2026-02-25*
*Brand: AI Influencer Academy*
