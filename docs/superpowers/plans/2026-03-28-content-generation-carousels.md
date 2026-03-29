# Content Generation & Carousels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add carousel generation with a layered format+scene template system, AI idea suggestions, per-slide regeneration, Instagram-style preview, and caption assistance to the workspace.

**Architecture:** Layered template system — carousel formats (structure/ordering) combine with scenes (content/setting) at generation time. New `ContentSet` model groups slides. AI (Grok Fast) suggests formats + writes captions. Existing Gemini pipeline generates each slide with creator ref. Dialog-based carousel viewer with grid + Instagram preview modes.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, Zustand, Gemini `gemini-3-pro-image-preview`, Grok `grok-4-1-fast-non-reasoning`, shadcn/ui Dialog, AWS S3.

**Spec:** `docs/superpowers/specs/2026-03-28-content-generation-carousels.md`

---

### Task 1: Database Schema — Add ContentSet + Modify Content

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ContentSet model and update Content model**

Add the ContentSet model and new fields on Content. Add CAROUSEL to ContentSource enum.

In `prisma/schema.prisma`, add after the Content model closing brace (after line 115):

```prisma
model ContentSet {
  id        String   @id @default(cuid())
  creatorId String
  creator   Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "CAROUSEL" | "PHOTO_SET"
  formatId  String?
  caption   String?
  hashtags  String[]
  slideCount Int     @default(0)
  status    String   @default("GENERATING") // "GENERATING" | "COMPLETED" | "PARTIAL"
  creditsCost Int    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  contents  Content[]

  @@index([creatorId])
  @@index([userId])
}
```

Add to the Content model (after `caption` field, before `tags`):

```prisma
  contentSetId String?
  contentSet   ContentSet? @relation(fields: [contentSetId], references: [id], onDelete: Cascade)
  slideIndex   Int?
  slideContext  Json?
```

Add to the ContentSource enum:

```prisma
enum ContentSource {
  TEMPLATE
  FREEFORM
  RECREATE
  WIZARD
  CAROUSEL
}
```

Add relations to User and Creator models:

In the User model, add: `contentSets ContentSet[]`
In the Creator model, add: `contentSets ContentSet[]`

- [ ] **Step 2: Run migration**

Run: `pnpx prisma migrate dev --name add-content-sets`
Expected: Migration creates ContentSet table and adds new columns to Content.

- [ ] **Step 3: Generate Prisma client**

Run: `pnpx prisma generate`

- [ ] **Step 4: Update TypeScript types**

Add to `src/types/content.ts`:

```typescript
export type ContentSetItem = {
  id: string;
  creatorId: string;
  type: "CAROUSEL" | "PHOTO_SET";
  formatId?: string;
  caption?: string;
  hashtags: string[];
  slideCount: number;
  status: "GENERATING" | "COMPLETED" | "PARTIAL";
  creditsCost: number;
  createdAt: string;
  slides: ContentItem[];
};
```

Add to ContentItem type:

```typescript
export type ContentItem = {
  id: string;
  creatorId: string;
  type: "IMAGE" | "VIDEO" | "TALKING_HEAD";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  url?: string;
  thumbnailUrl?: string;
  s3Keys: string[];
  source: "TEMPLATE" | "FREEFORM" | "RECREATE" | "WIZARD" | "CAROUSEL";
  prompt?: string;
  userInput?: string;
  creditsCost: number;
  createdAt: string;
  // Carousel fields
  contentSetId?: string;
  slideIndex?: number;
};
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/types/content.ts
git commit -m "feat: add ContentSet model for carousels and photo sets"
```

---

### Task 2: Carousel Format + Scene Data Libraries

**Files:**
- Create: `src/data/carousel-formats.ts`
- Create: `src/data/scenes.ts`

- [ ] **Step 1: Create carousel format types and data**

```typescript
// src/data/carousel-formats.ts

export interface FormatSlide {
  position: number;
  role: "hook" | "content" | "detail" | "closer";
  sceneHint: string;
  outfitHint: string;
  moodHint: string;
  required: boolean;
}

export interface CarouselFormat {
  id: string;
  name: string;
  description: string;
  whyItWorks: string;
  slideRange: [number, number];
  slides: FormatSlide[];
  captionTemplate: string;
  hashtagSuggestions: string[];
  niches: string[];
}

export const CAROUSEL_FORMATS: CarouselFormat[] = [
  {
    id: "photo-dump-gym",
    name: "Photo Dump — Gym Day",
    description: "Casual gym vibes — mirror selfie, workout, post-gym glow.",
    whyItWorks: "Photo dumps get 2x saves vs single posts. Gym content is top-performing in fitness niche.",
    slideRange: [5, 7],
    slides: [
      { position: 1, role: "hook", sceneHint: "gym-mirror", outfitHint: "matching sports set", moodHint: "confident, checking outfit", required: true },
      { position: 2, role: "content", sceneHint: "workout-action", outfitHint: "same sports set", moodHint: "intense, mid-movement", required: true },
      { position: 3, role: "detail", sceneHint: "gym-detail", outfitHint: "same sports set", moodHint: "close-up detail shot", required: true },
      { position: 4, role: "content", sceneHint: "post-workout", outfitHint: "same sports set, slightly sweaty", moodHint: "relaxed, accomplished", required: true },
      { position: 5, role: "content", sceneHint: "protein-shake", outfitHint: "same or hoodie thrown on", moodHint: "casual, refueling", required: true },
      { position: 6, role: "closer", sceneHint: "car-selfie", outfitHint: "hoodie or jacket", moodHint: "casual, leaving gym", required: false },
      { position: 7, role: "detail", sceneHint: "gym-bag-flatlay", outfitHint: "none — flatlay shot", moodHint: "aesthetic, organized", required: false },
    ],
    captionTemplate: "gym days > everything 💪",
    hashtagSuggestions: ["fitness", "gymlife", "workout"],
    niches: ["Fitness"],
  },
  {
    id: "photo-dump-city",
    name: "Photo Dump — City Day",
    description: "Urban lifestyle — street style, coffee, golden hour, night out.",
    whyItWorks: "City lifestyle carousels drive high engagement from urban audiences. Golden hour shots get saved heavily.",
    slideRange: [5, 7],
    slides: [
      { position: 1, role: "hook", sceneHint: "city-street-golden", outfitHint: "stylish casual outfit", moodHint: "confident, walking", required: true },
      { position: 2, role: "content", sceneHint: "coffee-shop", outfitHint: "same outfit", moodHint: "relaxed, candid", required: true },
      { position: 3, role: "content", sceneHint: "city-street-style", outfitHint: "same outfit, different angle", moodHint: "posed but natural", required: true },
      { position: 4, role: "detail", sceneHint: "food-close-up", outfitHint: "same outfit", moodHint: "aesthetic food shot", required: false },
      { position: 5, role: "content", sceneHint: "restaurant-dinner", outfitHint: "dressed up for night", moodHint: "glamorous, evening", required: true },
      { position: 6, role: "closer", sceneHint: "night-city", outfitHint: "night outfit", moodHint: "confident, city lights", required: true },
      { position: 7, role: "detail", sceneHint: "mirror-selfie", outfitHint: "night outfit", moodHint: "quick selfie before going out", required: false },
    ],
    captionTemplate: "city days ✨",
    hashtagSuggestions: ["citylife", "ootd", "lifestyle"],
    niches: ["Lifestyle", "Fashion"],
  },
  {
    id: "photo-dump-beach",
    name: "Photo Dump — Beach Day",
    description: "Sun-kissed beach vibes — swimwear, ocean, sunset drinks.",
    whyItWorks: "Beach content is evergreen. Swimwear carousels drive link-in-bio clicks and brand partnerships.",
    slideRange: [5, 7],
    slides: [
      { position: 1, role: "hook", sceneHint: "beach-standing", outfitHint: "bikini or swimwear", moodHint: "sun-kissed, confident", required: true },
      { position: 2, role: "content", sceneHint: "beach-walking", outfitHint: "same swimwear", moodHint: "candid, walking along shore", required: true },
      { position: 3, role: "content", sceneHint: "pool-lounging", outfitHint: "same swimwear", moodHint: "relaxed, lounging", required: true },
      { position: 4, role: "detail", sceneHint: "beach-drink", outfitHint: "same swimwear or coverup", moodHint: "tropical drink close-up", required: false },
      { position: 5, role: "content", sceneHint: "beach-sunset", outfitHint: "same swimwear or sundress", moodHint: "golden hour, warm tones", required: true },
      { position: 6, role: "closer", sceneHint: "car-selfie", outfitHint: "casual post-beach", moodHint: "tired but happy, leaving", required: false },
    ],
    captionTemplate: "vitamin sea 🌊",
    hashtagSuggestions: ["beachday", "summer", "bikini"],
    niches: ["Lifestyle", "Travel"],
  },
  {
    id: "outfit-showcase",
    name: "Outfit Showcase",
    description: "Same person, different outfits or different angles of one killer look.",
    whyItWorks: "Outfit carousels drive link clicks, saves, and brand collaborations. Fashion-focused creators see highest save rates.",
    slideRange: [3, 5],
    slides: [
      { position: 1, role: "hook", sceneHint: "mirror-selfie", outfitHint: "outfit 1 — statement piece", moodHint: "confident, full body", required: true },
      { position: 2, role: "content", sceneHint: "city-street-style", outfitHint: "outfit 1 — different angle or outfit 2", moodHint: "natural, walking", required: true },
      { position: 3, role: "content", sceneHint: "mirror-selfie", outfitHint: "outfit 2 or outfit 3", moodHint: "casual pose", required: true },
      { position: 4, role: "detail", sceneHint: "close-up-detail", outfitHint: "accessories or shoes close-up", moodHint: "aesthetic detail", required: false },
      { position: 5, role: "closer", sceneHint: "city-street-golden", outfitHint: "best outfit, golden hour", moodHint: "hero shot, golden light", required: false },
    ],
    captionTemplate: "which fit? 1, 2 or 3? 👇",
    hashtagSuggestions: ["ootd", "fashion", "style"],
    niches: ["Fashion", "Lifestyle"],
  },
  {
    id: "grwm",
    name: "Get Ready With Me",
    description: "Before → during → after transformation. Classic GRWM format.",
    whyItWorks: "GRWM carousels have some of the highest completion rates. The transformation hook keeps people swiping.",
    slideRange: [3, 4],
    slides: [
      { position: 1, role: "hook", sceneHint: "getting-ready-before", outfitHint: "robe or casual loungewear", moodHint: "natural, no makeup, relaxed", required: true },
      { position: 2, role: "content", sceneHint: "getting-ready-during", outfitHint: "robe, doing hair/makeup", moodHint: "in progress, candid", required: true },
      { position: 3, role: "closer", sceneHint: "getting-ready-after", outfitHint: "full glam outfit", moodHint: "confident, transformed, glowing", required: true },
      { position: 4, role: "detail", sceneHint: "mirror-selfie", outfitHint: "full outfit, ready to go", moodHint: "final check, confident", required: false },
    ],
    captionTemplate: "the process ✨",
    hashtagSuggestions: ["grwm", "getreadywithme", "transformation"],
    niches: ["Beauty", "Lifestyle", "Fashion"],
  },
  {
    id: "day-in-the-life",
    name: "Day in the Life",
    description: "Morning to night narrative arc — full day documented.",
    whyItWorks: "Day-in-the-life carousels drive the highest dwell time. The narrative arc keeps people swiping to see what happens next.",
    slideRange: [5, 8],
    slides: [
      { position: 1, role: "hook", sceneHint: "morning-bed", outfitHint: "pajamas or loungewear", moodHint: "just woke up, cozy morning light", required: true },
      { position: 2, role: "content", sceneHint: "coffee-shop", outfitHint: "casual daytime outfit", moodHint: "morning routine, coffee", required: true },
      { position: 3, role: "content", sceneHint: "workout-action", outfitHint: "gym clothes", moodHint: "active, midday energy", required: false },
      { position: 4, role: "content", sceneHint: "city-street-style", outfitHint: "daytime outfit", moodHint: "out and about, errands/work", required: true },
      { position: 5, role: "detail", sceneHint: "food-close-up", outfitHint: "daytime outfit", moodHint: "lunch or snack aesthetic", required: false },
      { position: 6, role: "content", sceneHint: "getting-ready-after", outfitHint: "evening outfit", moodHint: "getting ready for night", required: true },
      { position: 7, role: "content", sceneHint: "restaurant-dinner", outfitHint: "evening outfit", moodHint: "dinner, warm lighting", required: true },
      { position: 8, role: "closer", sceneHint: "night-city", outfitHint: "evening outfit", moodHint: "night vibes, city lights", required: false },
    ],
    captionTemplate: "a day in my life ☀️→🌙",
    hashtagSuggestions: ["dayinthelife", "ditl", "lifestyle"],
    niches: ["Lifestyle"],
  },
  {
    id: "product-feature",
    name: "Product Feature",
    description: "UGC-style product showcase — holding, using, lifestyle shots with a product.",
    whyItWorks: "UGC carousels drive the highest conversion rates for brands. Authentic product content gets partnerships.",
    slideRange: [3, 5],
    slides: [
      { position: 1, role: "hook", sceneHint: "product-holding", outfitHint: "casual, relatable", moodHint: "excited, showing product", required: true },
      { position: 2, role: "content", sceneHint: "product-using", outfitHint: "same outfit", moodHint: "actively using the product", required: true },
      { position: 3, role: "content", sceneHint: "product-lifestyle", outfitHint: "same outfit", moodHint: "product in lifestyle context", required: true },
      { position: 4, role: "detail", sceneHint: "product-close-up", outfitHint: "none — product only", moodHint: "aesthetic product detail", required: false },
      { position: 5, role: "closer", sceneHint: "product-selfie", outfitHint: "same outfit", moodHint: "happy with product, recommending", required: false },
    ],
    captionTemplate: "obsessed with this 😍",
    hashtagSuggestions: ["favorites", "musthave", "recommendation"],
    niches: ["Beauty", "Fitness", "Lifestyle", "Tech"],
  },
  {
    id: "spicy-progression",
    name: "Spicy Progression",
    description: "Casual → suggestive escalation. Drives link-in-bio clicks.",
    whyItWorks: "Escalation carousels have the highest share rates (via DM). The progression keeps people swiping and drives premium content conversions.",
    slideRange: [3, 5],
    slides: [
      { position: 1, role: "hook", sceneHint: "mirror-selfie", outfitHint: "casual fitted outfit", moodHint: "confident, approachable", required: true },
      { position: 2, role: "content", sceneHint: "bedroom-casual", outfitHint: "loungewear or fitted dress", moodHint: "relaxed, slightly flirty", required: true },
      { position: 3, role: "content", sceneHint: "bedroom-glam", outfitHint: "lingerie or swimwear", moodHint: "bold, confident", required: true },
      { position: 4, role: "closer", sceneHint: "bedroom-tease", outfitHint: "suggestive but clothed", moodHint: "alluring, teasing", required: false },
      { position: 5, role: "detail", sceneHint: "mirror-selfie", outfitHint: "back to casual — contrast", moodHint: "casual outro, wink", required: false },
    ],
    captionTemplate: "swipe at your own risk 😏",
    hashtagSuggestions: ["vibes", "confidence", "selflove"],
    niches: ["Lifestyle"],
  },
];
```

- [ ] **Step 2: Create scene definitions**

```typescript
// src/data/scenes.ts

export interface Scene {
  id: string;
  name: string;
  setting: string;
  lighting: string;
  outfitDefault: string;
  mood: string;
  cameraStyle: string;
  niches: string[];
  tags: string[];
}

export const SCENES: Scene[] = [
  // Gym
  { id: "gym-mirror", name: "Gym Mirror Selfie", setting: "modern gym with mirrors and weights in background", lighting: "gym fluorescent lighting, mirror reflection", outfitDefault: "matching sports set", mood: "confident, checking fit", cameraStyle: "mirror selfie, shot on iPhone", niches: ["Fitness"], tags: ["gym", "selfie", "mirror"] },
  { id: "workout-action", name: "Workout Action", setting: "gym floor, mid-exercise with equipment visible", lighting: "overhead gym lighting", outfitDefault: "sports bra and leggings", mood: "intense, focused, mid-movement", cameraStyle: "action shot, slight angle, shot on iPhone", niches: ["Fitness"], tags: ["gym", "workout", "action"] },
  { id: "post-workout", name: "Post-Workout Glow", setting: "gym or locker room", lighting: "natural gym lighting", outfitDefault: "sports set, slightly sweaty", mood: "relaxed, accomplished, glowing", cameraStyle: "selfie, shot on iPhone, candid", niches: ["Fitness"], tags: ["gym", "post-workout"] },
  { id: "protein-shake", name: "Protein Shake", setting: "gym juice bar or kitchen counter", lighting: "natural daylight", outfitDefault: "gym clothes or casual", mood: "casual, refueling, healthy", cameraStyle: "holding drink, shot on iPhone", niches: ["Fitness"], tags: ["gym", "protein", "healthy"] },
  { id: "gym-detail", name: "Gym Detail Shot", setting: "gym floor, close-up on shoes or accessories", lighting: "overhead gym lighting", outfitDefault: "gym shoes, water bottle, gym bag", mood: "aesthetic detail, flat-lay feel", cameraStyle: "close-up detail, overhead angle", niches: ["Fitness"], tags: ["gym", "detail", "aesthetic"] },
  { id: "gym-bag-flatlay", name: "Gym Bag Flatlay", setting: "clean surface, gym bag contents laid out", lighting: "soft natural light from above", outfitDefault: "items: shoes, water bottle, headphones, towel", mood: "organized, aesthetic", cameraStyle: "overhead flatlay, shot on iPhone", niches: ["Fitness"], tags: ["gym", "flatlay", "aesthetic"] },

  // Coffee / Morning
  { id: "coffee-shop", name: "Coffee Shop", setting: "trendy coffee shop with warm interior", lighting: "warm natural light from window", outfitDefault: "casual oversized sweater or cute top", mood: "relaxed, cozy, candid", cameraStyle: "sitting at table, shot on iPhone, candid", niches: ["Lifestyle"], tags: ["coffee", "morning", "cozy"] },
  { id: "morning-bed", name: "Morning in Bed", setting: "clean white bed, morning light through curtains", lighting: "soft morning window light, warm tones", outfitDefault: "pajamas or oversized tee", mood: "just woke up, cozy, natural", cameraStyle: "in bed selfie, shot on iPhone", niches: ["Lifestyle"], tags: ["morning", "cozy", "bed"] },

  // City / Street
  { id: "city-street-golden", name: "City Street Golden Hour", setting: "city street at golden hour, warm sunset light", lighting: "golden hour backlighting, warm tones", outfitDefault: "stylish casual outfit", mood: "confident, walking, warm", cameraStyle: "candid walking shot, shot on iPhone", niches: ["Lifestyle", "Fashion"], tags: ["city", "golden-hour", "street"] },
  { id: "city-street-style", name: "City Street Style", setting: "urban street with interesting background", lighting: "natural daylight", outfitDefault: "streetwear or casual chic", mood: "confident, posed but natural", cameraStyle: "full body, shot on iPhone", niches: ["Fashion", "Lifestyle"], tags: ["city", "street", "outfit"] },
  { id: "night-city", name: "Night City", setting: "city street at night, neon lights or ambient lighting", lighting: "city lights, neon, ambient night", outfitDefault: "night out outfit", mood: "confident, night vibes", cameraStyle: "city background, shot on iPhone", niches: ["Lifestyle", "Fashion"], tags: ["city", "night", "going-out"] },

  // Home / Getting Ready
  { id: "mirror-selfie", name: "Mirror Selfie", setting: "bedroom or bathroom mirror, clean background", lighting: "soft overhead or natural window light", outfitDefault: "current outfit", mood: "casual, quick selfie", cameraStyle: "mirror selfie, phone at chest, shot on iPhone", niches: ["Lifestyle", "Fashion"], tags: ["mirror", "selfie", "home"] },
  { id: "getting-ready-before", name: "Getting Ready — Before", setting: "bathroom vanity or bedroom, pre-makeup", lighting: "bathroom vanity lighting", outfitDefault: "robe or loungewear, no makeup", mood: "natural, raw, just starting", cameraStyle: "selfie or mirror shot, shot on iPhone", niches: ["Beauty", "Lifestyle"], tags: ["grwm", "before", "natural"] },
  { id: "getting-ready-during", name: "Getting Ready — During", setting: "bathroom vanity, mid-process", lighting: "bathroom vanity lighting", outfitDefault: "robe, hair half done or doing makeup", mood: "in progress, candid, fun", cameraStyle: "mirror shot, shot on iPhone", niches: ["Beauty", "Lifestyle"], tags: ["grwm", "during", "process"] },
  { id: "getting-ready-after", name: "Getting Ready — After", setting: "bedroom or hallway mirror, fully ready", lighting: "warm indoor lighting", outfitDefault: "full glam outfit, hair and makeup done", mood: "confident, transformed, glowing", cameraStyle: "mirror selfie, full body, shot on iPhone", niches: ["Beauty", "Fashion"], tags: ["grwm", "after", "glam"] },
  { id: "bedroom-casual", name: "Bedroom Casual", setting: "bedroom, bed or couch visible", lighting: "soft natural window light", outfitDefault: "loungewear or casual", mood: "relaxed, at home, comfortable", cameraStyle: "casual selfie, shot on iPhone", niches: ["Lifestyle"], tags: ["home", "casual", "bedroom"] },
  { id: "bedroom-glam", name: "Bedroom Glam", setting: "bedroom with nice decor", lighting: "warm mood lighting", outfitDefault: "lingerie or swimwear", mood: "bold, confident, alluring", cameraStyle: "mirror or tripod shot, shot on iPhone", niches: ["Lifestyle"], tags: ["bedroom", "glam", "bold"] },
  { id: "bedroom-tease", name: "Bedroom Tease", setting: "bedroom, intimate setting", lighting: "warm, moody, low light", outfitDefault: "suggestive but clothed", mood: "teasing, alluring, playful", cameraStyle: "selfie or mirror, shot on iPhone", niches: ["Lifestyle"], tags: ["bedroom", "tease", "spicy"] },

  // Dining / Food
  { id: "restaurant-dinner", name: "Restaurant Dinner", setting: "upscale restaurant, candlelit or warm ambient", lighting: "warm ambient restaurant lighting, candle glow", outfitDefault: "dressed up, dinner outfit", mood: "glamorous, evening, relaxed", cameraStyle: "at table, shot on iPhone, candid", niches: ["Lifestyle", "Food"], tags: ["restaurant", "dinner", "night"] },
  { id: "food-close-up", name: "Food Close-Up", setting: "restaurant table or kitchen counter", lighting: "natural or warm ambient light", outfitDefault: "hands visible, holding utensil or reaching", mood: "aesthetic, appetizing", cameraStyle: "overhead or 45-degree angle, shot on iPhone", niches: ["Food", "Lifestyle"], tags: ["food", "detail", "aesthetic"] },

  // Beach / Pool
  { id: "beach-standing", name: "Beach Standing", setting: "sandy beach, ocean visible", lighting: "bright sunny day, natural sunlight", outfitDefault: "bikini or swimwear", mood: "sun-kissed, confident, happy", cameraStyle: "full body, shot on iPhone", niches: ["Lifestyle", "Travel"], tags: ["beach", "swimwear", "summer"] },
  { id: "beach-walking", name: "Beach Walking", setting: "shoreline, waves touching feet", lighting: "golden hour or bright sun", outfitDefault: "bikini or swimwear", mood: "candid, walking, carefree", cameraStyle: "candid walking shot, shot on iPhone", niches: ["Lifestyle", "Travel"], tags: ["beach", "walking", "candid"] },
  { id: "beach-sunset", name: "Beach Sunset", setting: "beach at sunset, warm sky", lighting: "golden hour, warm sunset tones", outfitDefault: "swimwear or sundress", mood: "peaceful, golden, warm", cameraStyle: "silhouette or backlit, shot on iPhone", niches: ["Lifestyle", "Travel"], tags: ["beach", "sunset", "golden-hour"] },
  { id: "pool-lounging", name: "Pool Lounging", setting: "pool area, lounge chair or pool edge", lighting: "bright sunny day", outfitDefault: "bikini or swimwear", mood: "relaxed, lounging, vacation", cameraStyle: "candid on lounger, shot on iPhone", niches: ["Lifestyle", "Travel"], tags: ["pool", "lounging", "summer"] },
  { id: "beach-drink", name: "Beach Drink", setting: "beach or pool bar, tropical setting", lighting: "bright natural sunlight", outfitDefault: "swimwear or coverup", mood: "tropical, refreshing, fun", cameraStyle: "holding drink, shot on iPhone", niches: ["Lifestyle", "Travel"], tags: ["beach", "drink", "tropical"] },

  // Other
  { id: "car-selfie", name: "Car Selfie", setting: "driver seat, car interior visible", lighting: "natural light through windshield", outfitDefault: "whatever current outfit is", mood: "casual, quick, candid", cameraStyle: "selfie from driver seat, shot on iPhone", niches: ["Lifestyle"], tags: ["car", "selfie", "casual"] },
  { id: "hiking-trail", name: "Hiking Trail", setting: "nature trail, trees or mountain view", lighting: "natural dappled sunlight through trees", outfitDefault: "athletic wear, hiking outfit", mood: "active, adventurous, nature", cameraStyle: "trail shot, shot on iPhone", niches: ["Fitness", "Travel"], tags: ["hiking", "nature", "outdoor"] },
  { id: "hotel-room", name: "Hotel Room", setting: "nice hotel room, robe or city view", lighting: "soft hotel room lighting or window light", outfitDefault: "hotel robe or loungewear", mood: "luxury, relaxed, travel", cameraStyle: "mirror or bed selfie, shot on iPhone", niches: ["Travel", "Lifestyle"], tags: ["hotel", "travel", "luxury"] },

  // Product
  { id: "product-holding", name: "Holding Product", setting: "clean, bright, lifestyle background", lighting: "soft natural daylight", outfitDefault: "casual and relatable", mood: "excited, showing product to camera", cameraStyle: "holding product, shot on iPhone, candid", niches: ["Beauty", "Fitness", "Tech"], tags: ["product", "ugc", "holding"] },
  { id: "product-using", name: "Using Product", setting: "relevant context for product usage", lighting: "natural light", outfitDefault: "casual", mood: "actively using, genuine reaction", cameraStyle: "in-use shot, shot on iPhone", niches: ["Beauty", "Fitness", "Tech"], tags: ["product", "ugc", "using"] },
  { id: "product-lifestyle", name: "Product Lifestyle", setting: "lifestyle context — kitchen, desk, bathroom", lighting: "natural daylight", outfitDefault: "casual", mood: "product integrated into daily life", cameraStyle: "lifestyle context, shot on iPhone", niches: ["Beauty", "Fitness", "Tech"], tags: ["product", "ugc", "lifestyle"] },
  { id: "product-close-up", name: "Product Close-Up", setting: "clean surface, product centered", lighting: "soft natural light", outfitDefault: "none — product only", mood: "aesthetic, detailed", cameraStyle: "close-up detail, shot on iPhone", niches: ["Beauty", "Fitness", "Tech"], tags: ["product", "detail", "close-up"] },
  { id: "product-selfie", name: "Product Selfie", setting: "casual setting", lighting: "natural light", outfitDefault: "casual", mood: "happy with product, recommending", cameraStyle: "selfie with product, shot on iPhone", niches: ["Beauty", "Fitness", "Tech"], tags: ["product", "ugc", "selfie"] },
  { id: "close-up-detail", name: "Close-Up Detail", setting: "neutral background", lighting: "natural soft light", outfitDefault: "accessories, jewelry, shoes visible", mood: "aesthetic detail shot", cameraStyle: "macro-style close-up, shot on iPhone", niches: ["Fashion"], tags: ["detail", "accessories", "close-up"] },
];

/** Find a scene by ID */
export function getScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/carousel-formats.ts src/data/scenes.ts
git commit -m "feat: add carousel format recipes and scene definitions"
```

---

### Task 3: Carousel Generation Server Actions

**Files:**
- Create: `src/server/actions/carousel-actions.ts`

- [ ] **Step 1: Create carousel generation action**

```typescript
// src/server/actions/carousel-actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { deductCredits } from "./credit-actions";
import { uploadImage, getSignedImageUrl, getImageBuffer } from "@/lib/s3";
import { stripAndRewrite } from "@/lib/ai/metadata-strip";
import { CAROUSEL_FORMATS, type CarouselFormat, type FormatSlide } from "@/data/carousel-formats";
import { getScene } from "@/data/scenes";
import { REALISM_BASE, CAMERA } from "@/lib/prompts";
import type { ContentSetItem, ContentItem } from "@/types/content";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY!, baseURL: "https://api.x.ai/v1" });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const CREDIT_PER_SLIDE = 1;

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Build prompt for one carousel slide ─────

function buildSlidePrompt(
  slide: FormatSlide,
  format: CarouselFormat,
  scene: ReturnType<typeof getScene>,
  gender: string,
  totalSlides: number,
  userInstructions?: string
): string {
  const subject = gender.toLowerCase() === "male" ? "man" : "woman";
  const sceneDesc = scene
    ? `${scene.setting}. ${scene.lighting}. Wearing ${slide.outfitHint || scene.outfitDefault}.`
    : `${slide.sceneHint}. Wearing ${slide.outfitHint}.`;

  const parts = [
    `That exact ${subject} from the reference image.`,
    sceneDesc,
    `Mood: ${slide.moodHint}.`,
    `This is slide ${slide.position} of ${totalSlides} in a "${format.name}" carousel.`,
    `Shot on iPhone, candid, ${scene?.cameraStyle ?? "natural angle"}.`,
  ];

  if (userInstructions?.trim()) {
    parts.push(`Additional instructions: ${userInstructions.trim()}`);
  }

  parts.push(`${REALISM_BASE}.`);

  return parts.join(" ");
}

// ─── Generate a single slide image ─────

async function generateSlideImage(
  prompt: string,
  refImage: { mimeType: string; data: string },
  userId: string,
  creatorId: string,
  index: number
): Promise<{ key: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ text: prompt }, { inlineData: refImage }],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (!part?.inlineData?.data) return null;

    const raw = Buffer.from(part.inlineData.data, "base64");
    const clean = await stripAndRewrite(raw);
    const timestamp = Date.now();
    const key = `users/${userId}/creators/${creatorId}/content/carousel-${timestamp}-${index}.jpg`;
    await uploadImage(clean, key, "image/jpeg");
    return { key };
  } catch (error) {
    console.error(`Slide ${index} generation failed:`, error);
    return null;
  }
}

// ─── Generate full carousel ─────

type CarouselResult =
  | { success: true; contentSet: ContentSetItem }
  | { success: false; error: string };

export async function generateCarousel(
  creatorId: string,
  formatId: string,
  slideCount?: number,
  userInstructions?: string
): Promise<CarouselResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const creator = await db.creator.findUnique({ where: { id: creatorId, userId: user.id } });
  if (!creator || !creator.baseImageUrl) return { success: false, error: "Creator not found" };

  const format = CAROUSEL_FORMATS.find((f) => f.id === formatId);
  if (!format) return { success: false, error: "Format not found" };

  // Determine slide count
  const count = slideCount
    ? Math.min(Math.max(slideCount, format.slideRange[0]), format.slideRange[1])
    : format.slideRange[0]; // default to minimum

  const slides = format.slides.filter((s) => s.required || s.position <= count).slice(0, count);
  const totalCredits = slides.length * CREDIT_PER_SLIDE;

  const totalUserCredits = user.planCredits + user.packCredits;
  if (totalUserCredits < totalCredits) {
    return { success: false, error: `Not enough credits. Need ${totalCredits}, have ${totalUserCredits}.` };
  }

  // Deduct credits first
  await deductCredits(user.id, totalCredits, `Carousel: ${format.name}`);

  // Get creator's base image as reference
  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const gender = (creator.settings as Record<string, string>)?.gender ?? "Female";

  // Create content set record
  const contentSet = await db.contentSet.create({
    data: {
      creatorId: creator.id,
      userId: user.id,
      type: "CAROUSEL",
      formatId,
      slideCount: slides.length,
      status: "GENERATING",
      creditsCost: totalCredits,
    },
  });

  try {
    // Build prompts and generate all slides in parallel
    const results = await Promise.all(
      slides.map((slide, i) => {
        const scene = getScene(slide.sceneHint);
        const prompt = buildSlidePrompt(slide, format, scene, gender, slides.length, userInstructions);

        return generateSlideImage(prompt, refImage, user.id, creatorId, i).then(async (result) => {
          if (!result) return null;

          const content = await db.content.create({
            data: {
              creatorId: creator.id,
              type: "IMAGE",
              status: "COMPLETED",
              url: result.key,
              outputs: JSON.parse(JSON.stringify([result.key])),
              source: "CAROUSEL",
              prompt,
              creditsCost: CREDIT_PER_SLIDE,
              contentSetId: contentSet.id,
              slideIndex: slide.position,
              slideContext: JSON.parse(JSON.stringify({
                role: slide.role,
                sceneHint: slide.sceneHint,
                outfitHint: slide.outfitHint,
                moodHint: slide.moodHint,
              })),
            },
          });

          const url = await getSignedImageUrl(result.key);
          return { ...content, url } as ContentItem & { slideIndex: number };
        });
      })
    );

    const successfulSlides = results.filter(Boolean) as (ContentItem & { slideIndex: number })[];

    // Generate caption
    const caption = await generateCaption(format, gender, creator.name);

    // Update content set
    const status = successfulSlides.length === slides.length ? "COMPLETED"
      : successfulSlides.length > 0 ? "PARTIAL" : "GENERATING";

    await db.contentSet.update({
      where: { id: contentSet.id },
      data: {
        status,
        caption: caption.text,
        hashtags: caption.hashtags,
        slideCount: successfulSlides.length,
      },
    });

    return {
      success: true,
      contentSet: {
        id: contentSet.id,
        creatorId: creator.id,
        type: "CAROUSEL",
        formatId,
        caption: caption.text,
        hashtags: caption.hashtags,
        slideCount: successfulSlides.length,
        status,
        creditsCost: totalCredits,
        createdAt: contentSet.createdAt.toISOString(),
        slides: successfulSlides.map((s) => ({
          id: s.id,
          creatorId: s.creatorId,
          type: s.type as ContentItem["type"],
          status: s.status as ContentItem["status"],
          url: s.url,
          s3Keys: [],
          source: "CAROUSEL" as const,
          prompt: s.prompt ?? undefined,
          creditsCost: s.creditsCost,
          createdAt: s.createdAt,
          contentSetId: contentSet.id,
          slideIndex: s.slideIndex,
        })),
      },
    };
  } catch (error) {
    console.error("generateCarousel error:", error);
    await db.contentSet.update({ where: { id: contentSet.id }, data: { status: "PARTIAL" } });
    return { success: false, error: "Carousel generation failed. Some slides may have been created." };
  }
}

// ─── Regenerate a single slide ─────

type RegenResult =
  | { success: true; slide: ContentItem }
  | { success: false; error: string };

export async function regenerateSlide(
  contentId: string,
  feedback?: string
): Promise<RegenResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { success: false, error: "User not found" };

  const content = await db.content.findUnique({
    where: { id: contentId },
    include: { creator: true, contentSet: { include: { contents: true } } },
  });
  if (!content || !content.contentSet || !content.creator) {
    return { success: false, error: "Slide not found" };
  }
  if (content.creator.userId !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Check credits
  const totalCredits = user.planCredits + user.packCredits;
  if (totalCredits < CREDIT_PER_SLIDE) {
    return { success: false, error: "Not enough credits" };
  }

  await deductCredits(user.id, CREDIT_PER_SLIDE, "Carousel slide regeneration");

  const creator = content.creator;
  if (!creator.baseImageUrl) return { success: false, error: "Creator has no base image" };

  const refBuffer = await getImageBuffer(creator.baseImageUrl);
  const refBase64 = refBuffer.toString("base64");
  const refImage = { mimeType: "image/jpeg", data: refBase64 };

  const format = CAROUSEL_FORMATS.find((f) => f.id === content.contentSet!.formatId);
  const slideContext = content.slideContext as { role: string; sceneHint: string; outfitHint: string; moodHint: string } | null;
  const gender = (creator.settings as Record<string, string>)?.gender ?? "Female";
  const subject = gender.toLowerCase() === "male" ? "man" : "woman";

  // Build context from other slides
  const otherSlides = content.contentSet.contents
    .filter((c) => c.id !== contentId)
    .sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0))
    .map((c) => {
      const ctx = c.slideContext as { role?: string; moodHint?: string } | null;
      return `Slide ${c.slideIndex}: ${ctx?.role ?? "content"} — ${ctx?.moodHint ?? ""}`;
    });

  const parts = [
    `That exact ${subject} from the reference image.`,
    slideContext ? `${slideContext.sceneHint}. Mood: ${slideContext.moodHint}. Wearing ${slideContext.outfitHint}.` : "",
    `This is slide ${content.slideIndex} of ${content.contentSet.slideCount} in a "${format?.name ?? "carousel"}" set.`,
    `Other slides: ${otherSlides.join("; ")}.`,
    `Generate a DIFFERENT version of this slide that stays cohesive with the set.`,
    feedback ? `User feedback: ${feedback}` : "",
    `Shot on iPhone, candid. ${REALISM_BASE}.`,
  ].filter(Boolean);

  const prompt = parts.join(" ");

  const result = await generateSlideImage(prompt, refImage, user.id, creator.id, content.slideIndex ?? 0);
  if (!result) return { success: false, error: "Failed to regenerate slide" };

  // Update the content record with new image
  await db.content.update({
    where: { id: contentId },
    data: { url: result.key, outputs: JSON.parse(JSON.stringify([result.key])), prompt },
  });

  const url = await getSignedImageUrl(result.key);

  return {
    success: true,
    slide: {
      id: content.id,
      creatorId: content.creatorId,
      type: "IMAGE",
      status: "COMPLETED",
      url,
      s3Keys: [result.key],
      source: "CAROUSEL",
      prompt,
      creditsCost: CREDIT_PER_SLIDE,
      createdAt: content.createdAt.toISOString(),
      contentSetId: content.contentSetId ?? undefined,
      slideIndex: content.slideIndex ?? undefined,
    },
  };
}

// ─── AI Caption Generation ─────

async function generateCaption(
  format: CarouselFormat,
  gender: string,
  creatorName: string
): Promise<{ text: string; hashtags: string[] }> {
  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You write Instagram captions for AI influencer posts. Output ONLY JSON: {"text": "caption text", "hashtags": ["tag1", "tag2", "tag3"]}

Rules:
- Caption: 1-2 short sentences, casual and authentic, matches the content vibe
- Use the creator's first name naturally if it fits
- 3-5 hashtags, lowercase, no # symbol
- Match the tone to the carousel format
- Never mention AI or that the person is generated`,
        },
        {
          role: "user",
          content: `Creator: ${creatorName} (${gender})
Carousel format: ${format.name}
Description: ${format.description}
Template caption: ${format.captionTemplate}

Write a caption and hashtags.`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    const json = JSON.parse(text);
    return {
      text: typeof json.text === "string" ? json.text : format.captionTemplate,
      hashtags: Array.isArray(json.hashtags) ? json.hashtags.slice(0, 5) : format.hashtagSuggestions,
    };
  } catch {
    return { text: format.captionTemplate, hashtags: format.hashtagSuggestions };
  }
}

// ─── AI Idea Suggestions ─────

export async function suggestContent(
  creatorId: string,
  userInput: string
): Promise<{ suggestions: { type: "carousel" | "photo"; formatId?: string; title: string; description: string; slideCount?: number }[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { suggestions: [] };

  const creator = await db.creator.findFirst({
    where: { id: creatorId, user: { clerkId } },
  });
  if (!creator) return { suggestions: [] };

  const settings = creator.settings as Record<string, string> | null;
  const niche = creator.niche as string[] | null;

  const formatList = CAROUSEL_FORMATS.map((f) => `${f.id}: ${f.name} — ${f.description} (${f.niches.join(", ")})`).join("\n");

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You suggest Instagram content for an AI influencer. Output ONLY a JSON array:
[{"type": "carousel" | "photo", "formatId": "id-if-carousel", "title": "Short title", "description": "1 sentence", "slideCount": N}]

Return 3-5 suggestions. Mix of carousels and single photos.
If user request is vague, suggest diverse options matching their niche.
If specific, match it directly.

Available carousel formats:
${formatList}`,
        },
        {
          role: "user",
          content: `Creator: ${creator.name}, ${(niche ?? []).join(", ")} niche, ${settings?.vibes ?? ""} vibe
Request: ${userInput || "help me come up with ideas"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "[]";
    const suggestions = JSON.parse(text);
    return { suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 5) : [] };
  } catch {
    // Fallback — suggest based on niche
    const nicheFormats = CAROUSEL_FORMATS.filter((f) =>
      f.niches.some((n) => (niche ?? []).includes(n))
    ).slice(0, 3);

    return {
      suggestions: [
        ...nicheFormats.map((f) => ({
          type: "carousel" as const,
          formatId: f.id,
          title: f.name,
          description: f.description,
          slideCount: f.slideRange[0],
        })),
        { type: "photo" as const, title: "Mirror selfie", description: "Quick mirror selfie in today's outfit" },
      ],
    };
  }
}

// ─── Rewrite Caption ─────

export async function rewriteCaption(
  contentSetId: string,
  instruction?: string
): Promise<{ caption: string; hashtags: string[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { caption: "", hashtags: [] };

  const contentSet = await db.contentSet.findFirst({
    where: { id: contentSetId, user: { clerkId } },
  });
  if (!contentSet) return { caption: "", hashtags: [] };

  const format = CAROUSEL_FORMATS.find((f) => f.id === contentSet.formatId);

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `Rewrite this Instagram caption. Output ONLY JSON: {"text": "new caption", "hashtags": ["tag1", "tag2"]}
Keep it casual, authentic. 1-2 sentences. 3-5 hashtags.`,
        },
        {
          role: "user",
          content: `Current caption: "${contentSet.caption ?? ""}"
Format: ${format?.name ?? "carousel"}
${instruction ? `Instructions: ${instruction}` : "Write a fresh version"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    const json = JSON.parse(text);
    const newCaption = typeof json.text === "string" ? json.text : (contentSet.caption ?? "");
    const newHashtags = Array.isArray(json.hashtags) ? json.hashtags.slice(0, 5) : (contentSet.hashtags ?? []);

    await db.contentSet.update({
      where: { id: contentSetId },
      data: { caption: newCaption, hashtags: newHashtags },
    });

    return { caption: newCaption, hashtags: newHashtags };
  } catch {
    return { caption: contentSet.caption ?? "", hashtags: contentSet.hashtags ?? [] };
  }
}

// ─── Get Content Sets for Creator ─────

export async function getCreatorContentSets(creatorId: string): Promise<ContentSetItem[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return [];

  const sets = await db.contentSet.findMany({
    where: { creatorId, user: { clerkId } },
    include: { contents: { orderBy: { slideIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    sets.map(async (s) => ({
      id: s.id,
      creatorId: s.creatorId,
      type: s.type as "CAROUSEL" | "PHOTO_SET",
      formatId: s.formatId ?? undefined,
      caption: s.caption ?? undefined,
      hashtags: s.hashtags,
      slideCount: s.slideCount,
      status: s.status as "GENERATING" | "COMPLETED" | "PARTIAL",
      creditsCost: s.creditsCost,
      createdAt: s.createdAt.toISOString(),
      slides: await Promise.all(
        s.contents.map(async (c) => ({
          id: c.id,
          creatorId: c.creatorId,
          type: c.type as ContentItem["type"],
          status: c.status as ContentItem["status"],
          url: c.url ? await getSignedImageUrl(c.url) : undefined,
          s3Keys: (c.outputs as string[]) ?? [],
          source: c.source as ContentItem["source"],
          prompt: c.prompt ?? undefined,
          creditsCost: c.creditsCost,
          createdAt: c.createdAt.toISOString(),
          contentSetId: c.contentSetId ?? undefined,
          slideIndex: c.slideIndex ?? undefined,
        }))
      ),
    }))
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/carousel-actions.ts
git commit -m "feat: carousel generation, per-slide regen, AI suggestions, caption assistant"
```

---

### Task 4: Carousel Detail Dialog + Instagram Preview

**Files:**
- Create: `src/components/workspace/carousel-detail.tsx`

- [ ] **Step 1: Create the carousel detail dialog component**

This is the dialog that opens when you click a carousel on the dashboard. It has two view modes: Grid (slide thumbnails) and Preview (Instagram phone mockup).

```tsx
// src/components/workspace/carousel-detail.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreatorStore } from "@/stores/creator-store";
import { regenerateSlide, rewriteCaption } from "@/server/actions/carousel-actions";
import type { ContentSetItem, ContentItem } from "@/types/content";

const CAPTION_CHIPS = ["Rewrite", "More casual", "Add CTA", "Shorter"];

function SlideGrid({ slides, onSlideClick }: { slides: ContentItem[]; onSlideClick: (index: number) => void }) {
  return (
    <div className="carousel-slide-grid">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="carousel-slide-card"
          onClick={() => onSlideClick(i)}
        >
          {slide.url ? (
            <img src={slide.url} alt={`Slide ${i + 1}`} />
          ) : (
            <div className="carousel-slide-placeholder">Generating...</div>
          )}
          <span className="carousel-slide-num">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function InstagramPreview({ slides, caption, creatorName }: { slides: ContentItem[]; caption?: string; creatorName: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="carousel-ig-preview">
      <div className="carousel-ig-phone">
        <div className="carousel-ig-image">
          {slides[currentSlide]?.url ? (
            <img src={slides[currentSlide].url} alt={`Slide ${currentSlide + 1}`} />
          ) : (
            <div className="carousel-slide-placeholder">...</div>
          )}
        </div>
        <div className="carousel-ig-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`carousel-ig-dot${i === currentSlide ? " active" : ""}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
        <div className="carousel-ig-caption">
          <span className="carousel-ig-name">{creatorName}</span>
          <span className="carousel-ig-text">{caption ?? ""}</span>
        </div>
      </div>
      <div className="carousel-ig-nav">
        <button
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide(currentSlide - 1)}
          className="carousel-ig-arrow"
        >
          ◀
        </button>
        <span className="carousel-ig-counter">{currentSlide + 1} / {slides.length}</span>
        <button
          disabled={currentSlide === slides.length - 1}
          onClick={() => setCurrentSlide(currentSlide + 1)}
          className="carousel-ig-arrow"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

function SlideLightbox({
  slide,
  slideIndex,
  totalSlides,
  onClose,
  onPrev,
  onNext,
  onRegenerated,
}: {
  slide: ContentItem;
  slideIndex: number;
  totalSlides: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRegenerated: (updated: ContentItem) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await regenerateSlide(slide.id, feedback || undefined);
    if (result.success) {
      onRegenerated(result.slide);
      setFeedback("");
    }
    setRegenerating(false);
  }

  return (
    <div className="carousel-lightbox" onClick={onClose}>
      <div className="carousel-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="carousel-lightbox-close" onClick={onClose}>✕</button>
        <div className="carousel-lightbox-nav">
          <button onClick={onPrev} disabled={slideIndex === 0} className="carousel-ig-arrow">◀</button>
          <span>Slide {slideIndex + 1} of {totalSlides}</span>
          <button onClick={onNext} disabled={slideIndex === totalSlides - 1} className="carousel-ig-arrow">▶</button>
        </div>
        {slide.url && <img src={slide.url} alt={`Slide ${slideIndex + 1}`} />}
        <div className="carousel-lightbox-regen">
          <input
            placeholder="What should be different?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !regenerating) handleRegenerate(); }}
            className="carousel-regen-input"
          />
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="carousel-regen-btn"
          >
            {regenerating ? "Regenerating..." : "Regenerate This Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CarouselDetail({
  contentSet: initialSet,
  open,
  onOpenChange,
}: {
  contentSet: ContentSetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "preview">("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [contentSet, setContentSet] = useState(initialSet);
  const [captionText, setCaptionText] = useState(initialSet?.caption ?? "");
  const [hashtags, setHashtags] = useState(initialSet?.hashtags ?? []);
  const [rewriting, setRewriting] = useState(false);
  const creator = useCreatorStore.getState().getActiveCreator();

  // Sync when prop changes
  if (initialSet && initialSet.id !== contentSet?.id) {
    setContentSet(initialSet);
    setCaptionText(initialSet.caption ?? "");
    setHashtags(initialSet.hashtags ?? []);
  }

  if (!contentSet) return null;

  const slides = contentSet.slides.sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0));
  const format = contentSet.formatId ? `${contentSet.formatId}` : "Carousel";

  function handleSlideRegenerated(updated: ContentItem) {
    setContentSet((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) => s.id === updated.id ? { ...s, ...updated } : s),
      };
    });
  }

  async function handleCaptionRewrite(instruction?: string) {
    setRewriting(true);
    const result = await rewriteCaption(contentSet!.id, instruction);
    if (result.caption) {
      setCaptionText(result.caption);
      setHashtags(result.hashtags);
    }
    setRewriting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="carousel-dialog">
        <div className="carousel-dialog-header">
          <div>
            <h3 className="carousel-dialog-title">{contentSet.formatId?.replace(/-/g, " ") ?? "Carousel"}</h3>
            <span className="carousel-dialog-meta">{slides.length} slides</span>
          </div>
          <div className="carousel-view-toggle">
            <button
              className={`carousel-view-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              className={`carousel-view-btn${viewMode === "preview" ? " active" : ""}`}
              onClick={() => setViewMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="carousel-dialog-body">
          {viewMode === "grid" ? (
            <SlideGrid slides={slides} onSlideClick={(i) => setLightboxIndex(i)} />
          ) : (
            <InstagramPreview
              slides={slides}
              caption={captionText}
              creatorName={creator?.name ?? ""}
            />
          )}
        </div>

        <div className="carousel-dialog-caption">
          <textarea
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            className="carousel-caption-input"
            rows={2}
          />
          <div className="carousel-caption-hashtags">
            {hashtags.map((h) => `#${h}`).join(" ")}
          </div>
          <div className="carousel-caption-chips">
            {CAPTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="carousel-caption-chip"
                onClick={() => handleCaptionRewrite(chip === "Rewrite" ? undefined : chip)}
                disabled={rewriting}
              >
                {chip === "Rewrite" ? "↻ Rewrite" : chip}
              </button>
            ))}
          </div>
        </div>

        <div className="carousel-dialog-footer">
          <button className="studio-btn secondary" onClick={() => {/* TODO: download all */}}>
            Download All
          </button>
          <button className="studio-btn secondary" onClick={() => navigator.clipboard.writeText(`${captionText}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`)}>
            Copy Caption
          </button>
        </div>

        {lightboxIndex !== null && slides[lightboxIndex] && (
          <SlideLightbox
            slide={slides[lightboxIndex]}
            slideIndex={lightboxIndex}
            totalSlides={slides.length}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
            onNext={() => setLightboxIndex(Math.min(slides.length - 1, lightboxIndex + 1))}
            onRegenerated={handleSlideRegenerated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/carousel-detail.tsx
git commit -m "feat: carousel detail dialog with grid, Instagram preview, per-slide regen"
```

---

### Task 5: Suggestion Cards Component

**Files:**
- Create: `src/components/workspace/suggestion-cards.tsx`

- [ ] **Step 1: Create the suggestion cards component**

```tsx
// src/components/workspace/suggestion-cards.tsx
"use client";

import { CAROUSEL_FORMATS } from "@/data/carousel-formats";

export type Suggestion = {
  type: "carousel" | "photo";
  formatId?: string;
  title: string;
  description: string;
  slideCount?: number;
};

export function SuggestionCards({
  suggestions,
  onGenerate,
  loading,
}: {
  suggestions: Suggestion[];
  onGenerate: (suggestion: Suggestion) => void;
  loading?: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-cards">
      {suggestions.map((s, i) => {
        const format = s.formatId ? CAROUSEL_FORMATS.find((f) => f.id === s.formatId) : null;
        return (
          <div key={i} className="suggestion-card">
            <div className="suggestion-card-icon">
              {s.type === "carousel" ? "📸" : "🖼️"}
            </div>
            <div className="suggestion-card-body">
              <div className="suggestion-card-title">{s.title}</div>
              <div className="suggestion-card-meta">
                {s.slideCount ? `${s.slideCount} slides · ` : ""}
                {format?.niches?.[0] ?? "Photo"}
              </div>
              <div className="suggestion-card-desc">{s.description}</div>
            </div>
            <button
              className="suggestion-card-btn"
              onClick={() => onGenerate(s)}
              disabled={loading}
            >
              Generate →
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/suggestion-cards.tsx
git commit -m "feat: AI suggestion cards component"
```

---

### Task 6: Workspace Integration — Grid Badges + Input Bar + Carousel Dialog

**Files:**
- Modify: `src/components/workspace/workspace-canvas.tsx`
- Modify: `src/stores/creator-store.ts`

This is the biggest integration task — wiring the carousel generation into the existing workspace.

- [ ] **Step 1: Update creator store with content sets**

Add to `src/stores/creator-store.ts`:

```typescript
import type { ContentSetItem } from "@/types/content";

// Add to CreatorStore type:
  contentSets: ContentSetItem[];
  setContentSets: (sets: ContentSetItem[]) => void;
  addContentSet: (set: ContentSetItem) => void;

// Add to create() initial state:
  contentSets: [],

// Add actions:
  setContentSets: (contentSets) => set({ contentSets }),
  addContentSet: (contentSet) => set((state) => ({ contentSets: [contentSet, ...state.contentSets] })),
```

- [ ] **Step 2: Update workspace-canvas.tsx — add carousel badge, suggestion cards, carousel dialog**

In `workspace-canvas.tsx`, the key changes are:

1. Import the new components and actions
2. Add state for suggestion cards and carousel dialog
3. Update the input bar submit to call `suggestContent` for idea requests
4. Add carousel badge overlay on content cards that belong to a set
5. Open carousel dialog instead of content detail when clicking a carousel card

The workspace-canvas.tsx is large so I'll describe the changes rather than rewrite the whole file:

**Add imports:**
```typescript
import { CarouselDetail } from "./carousel-detail";
import { SuggestionCards, type Suggestion } from "./suggestion-cards";
import { suggestContent, generateCarousel, getCreatorContentSets } from "@/server/actions/carousel-actions";
```

**Add state:**
```typescript
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [suggestLoading, setSuggestLoading] = useState(false);
const [carouselSet, setCarouselSet] = useState<ContentSetItem | null>(null);
const [carouselOpen, setCarouselOpen] = useState(false);
const { contentSets, addContentSet } = useCreatorStore();
```

**Update handleSubmit to detect carousel intent:**
```typescript
async function handleSubmit() {
  if (!prompt.trim() || !creator) return;
  const input = prompt.trim();
  setPrompt("");

  // If input looks like an idea request, get AI suggestions
  const ideaKeywords = ["help", "idea", "suggest", "idk", "carousel", "dump", "showcase"];
  const isIdeaRequest = ideaKeywords.some((k) => input.toLowerCase().includes(k));

  if (isIdeaRequest) {
    setSuggestLoading(true);
    const result = await suggestContent(creator.id, input);
    setSuggestions(result.suggestions);
    setSuggestLoading(false);
    return;
  }

  // Otherwise, generate single photo (existing behavior)
  // ... existing generateContent call ...
}
```

**Add suggestion card handler:**
```typescript
async function handleSuggestionGenerate(suggestion: Suggestion) {
  if (!creator) return;
  setSuggestions([]);

  if (suggestion.type === "carousel" && suggestion.formatId) {
    setIsGeneratingContent(true);
    const result = await generateCarousel(creator.id, suggestion.formatId, suggestion.slideCount);
    setIsGeneratingContent(false);
    if (result.success) {
      addContentSet(result.contentSet);
      setCarouselSet(result.contentSet);
      setCarouselOpen(true);
    } else {
      setContentError(result.error);
    }
  } else {
    // Single photo — use existing flow
    setPrompt(suggestion.title);
    handleSubmit();
  }
}
```

**Add carousel badge to content cards** — in the content grid, check if an item has `contentSetId` and show a badge:
```tsx
{item.contentSetId && (
  <span className="carousel-badge">
    {contentSets.find((s) => s.id === item.contentSetId)?.slideCount ?? ""}
  </span>
)}
```

**Render suggestion cards above input bar:**
```tsx
{suggestions.length > 0 && (
  <SuggestionCards
    suggestions={suggestions}
    onGenerate={handleSuggestionGenerate}
    loading={isGeneratingContent}
  />
)}
```

**Render carousel dialog:**
```tsx
<CarouselDetail
  contentSet={carouselSet}
  open={carouselOpen}
  onOpenChange={setCarouselOpen}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/creator-store.ts src/components/workspace/workspace-canvas.tsx
git commit -m "feat: wire carousel generation into workspace — badges, suggestions, dialog"
```

---

### Task 7: CSS for Carousel Components

**Files:**
- Modify: `src/app/workspace/workspace.css`

- [ ] **Step 1: Add carousel dialog, suggestion cards, Instagram preview, and lightbox styles**

Add styles for all the new carousel classes — `.carousel-dialog`, `.carousel-slide-grid`, `.carousel-ig-preview`, `.carousel-ig-phone`, `.suggestion-cards`, `.suggestion-card`, `.carousel-lightbox`, `.carousel-badge`, etc.

These follow the prototype-first CSS pattern — class names from the components, not Tailwind. Match the existing workspace.css patterns for spacing, colors, and brand theme.

Key styles needed:
- `.carousel-dialog` — wide dialog (max-width: 720px)
- `.carousel-slide-grid` — 3-column grid of slide thumbnails
- `.carousel-slide-card` — clickable thumbnail with position number
- `.carousel-ig-preview` — centered phone mockup container
- `.carousel-ig-phone` — phone frame with rounded corners, shadow
- `.carousel-ig-dots` — dot indicators
- `.carousel-ig-caption` — caption display below image
- `.carousel-lightbox` — full-screen overlay for single slide view
- `.carousel-caption-chips` — tone adjustment chip row
- `.suggestion-cards` — vertical stack of suggestion cards
- `.suggestion-card` — horizontal card with icon, body, generate button
- `.carousel-badge` — small slide count badge on grid cards
- Mobile overrides for all of the above (44px touch targets, stacked layouts)

- [ ] **Step 2: Commit**

```bash
git add src/app/workspace/workspace.css
git commit -m "feat: add carousel dialog, suggestion cards, and Instagram preview styles"
```

---

### Task 8: Format Browser (Templates View Update)

**Files:**
- Modify: `src/components/workspace/templates-view.tsx`

- [ ] **Step 1: Update templates view to include carousel formats**

The existing templates view shows single-photo templates. Add a section above for carousel formats, grouped by type. Each format card shows: name, description, "why it works", slide count, niche tags, and a Generate button.

Import `CAROUSEL_FORMATS` from `@/data/carousel-formats` and render them as cards above the existing single-photo templates. Add filter tabs: All | Carousels | Single Photos.

When user clicks Generate on a carousel format, call `generateCarousel()` and open the carousel dialog with results.

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/templates-view.tsx
git commit -m "feat: add carousel formats to templates browser"
```

---

### Task 9: Prompt Preview Step

**Files:**
- Create: `src/components/workspace/carousel-preview-step.tsx`

- [ ] **Step 1: Create the prompt preview dialog**

This shows between format selection and generation. Displays all slide descriptions so the user can review/edit before generating.

The component shows: format name, numbered slide descriptions, an optional instructions text input, "Back" and "Generate All" buttons. User can click "Edit" to inline-edit individual slide descriptions.

- [ ] **Step 2: Wire into workspace-canvas.tsx**

Instead of calling `generateCarousel()` directly from suggestion cards, first open the preview step. User reviews → clicks Generate All → then carousel generates.

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/carousel-preview-step.tsx src/components/workspace/workspace-canvas.tsx
git commit -m "feat: prompt preview step before carousel generation"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run migration and build**

```bash
pnpx prisma migrate dev --name add-content-sets
pnpx prisma generate
pnpm build
```

- [ ] **Step 2: Smoke test**

1. Open workspace → type "help me come up with ideas" → verify suggestion cards appear
2. Click a carousel suggestion → verify prompt preview shows slide descriptions
3. Click "Generate All" → verify carousel generates (shimmer loading)
4. Carousel dialog opens → verify grid view shows all slides
5. Toggle to Preview mode → verify Instagram phone mockup works
6. Click a slide → verify lightbox opens with regenerate option
7. Regenerate a slide → verify it updates in the grid
8. Check caption → verify it's AI-generated, rewrite chips work
9. Copy caption → verify clipboard
10. Dashboard → verify carousel has slide count badge
11. Mobile → verify all touch targets, dialog goes full-screen

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
