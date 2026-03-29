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
    captionTemplate: "swipe →",
    hashtagSuggestions: ["vibes", "confidence", "selflove"],
    niches: ["Lifestyle"],
  },
];
