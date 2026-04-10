import type { Template } from "@/types/template";

export const templates: Template[] = [
  // ─── Fitness ───
  {
    id: "gym-mirror-selfie",
    name: "Gym Mirror Selfie",
    category: "fitness",
    icon: "💪",
    description: "Classic gym mirror selfie showing off your fit",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Gym mirror selfie, wearing {outfit}, {hair} hair, phone held at chest level, gym background with weights and mirrors, natural gym lighting, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["sports bra + leggings", "tank top + shorts", "matching set"],
        default: "sports bra + leggings",
      },
      {
        key: "hair",
        label: "Hair",
        type: "select",
        options: ["ponytail", "loose", "braided"],
        default: "ponytail",
      },
    ],
    tags: ["gym", "selfie", "fitness"],
  },
  {
    id: "workout-action",
    name: "Workout Action",
    category: "fitness",
    icon: "🏋️",
    description: "Mid-workout action shot with intensity",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Action shot doing {exercise}, in a {setting}, athletic wear, mid-movement with visible effort, dynamic angle, raw iPhone photography, natural lighting, visible pores and fine details",
    customizableFields: [
      {
        key: "exercise",
        label: "Exercise",
        type: "select",
        options: ["deadlift", "squat", "running"],
        default: "deadlift",
      },
      {
        key: "setting",
        label: "Setting",
        type: "select",
        options: ["gym", "outdoor", "home"],
        default: "gym",
      },
    ],
    tags: ["workout", "action", "fitness"],
  },
  {
    id: "progress-check",
    name: "Progress Check",
    category: "fitness",
    icon: "📸",
    description: "Physique check-in with flattering angles",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Physique progress photo, {pose}, athletic wear, {lighting}, clean background, confident expression, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "pose",
        label: "Pose",
        type: "select",
        options: ["front flex", "side pose", "back pose"],
        default: "front flex",
      },
      {
        key: "lighting",
        label: "Lighting",
        type: "select",
        options: ["natural", "gym lighting"],
        default: "natural",
      },
    ],
    tags: ["progress", "physique", "fitness"],
  },
  {
    id: "post-workout",
    name: "Post-Workout",
    category: "fitness",
    icon: "😮‍💨",
    description: "Relaxed post-workout vibe with props",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Post-workout selfie, wearing {outfit}, holding {prop}, slightly sweaty, relaxed smile, gym or locker room background, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["hoodie + sweats", "sports bra", "tank"],
        default: "hoodie + sweats",
      },
      {
        key: "prop",
        label: "Prop",
        type: "select",
        options: ["protein shake", "water bottle", "towel"],
        default: "protein shake",
      },
    ],
    tags: ["post-workout", "recovery", "fitness"],
  },

  // ─── Lifestyle ───
  {
    id: "morning-coffee",
    name: "Morning Coffee",
    category: "lifestyle",
    icon: "☕",
    description: "Cozy morning coffee moment",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Morning coffee moment, wearing {outfit}, sitting in {location}, holding coffee cup, warm natural morning light, soft and cozy aesthetic, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["cream sweater", "pajamas", "casual"],
        default: "cream sweater",
      },
      {
        key: "location",
        label: "Location",
        type: "select",
        options: ["coffee shop", "kitchen", "bed"],
        default: "coffee shop",
      },
    ],
    tags: ["morning", "coffee", "cozy"],
  },
  {
    id: "outfit-of-the-day",
    name: "Outfit of the Day",
    category: "lifestyle",
    icon: "👗",
    description: "Full body outfit showcase",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Outfit of the day photo, wearing {outfit}, standing in {setting}, full body shot, confident casual pose, natural daylight, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "text",
        default: "oversized blazer and jeans",
      },
      {
        key: "setting",
        label: "Setting",
        type: "select",
        options: ["bedroom mirror", "city street", "park"],
        default: "bedroom mirror",
      },
    ],
    tags: ["ootd", "fashion", "outfit"],
  },
  {
    id: "golden-hour-portrait",
    name: "Golden Hour Portrait",
    category: "lifestyle",
    icon: "🌅",
    description: "Warm golden hour portrait with dreamy light",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Golden hour portrait, wearing {outfit}, at {location}, warm sunset backlighting, soft bokeh background, dreamy and warm tones, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["flowing dress", "casual", "athletic"],
        default: "flowing dress",
      },
      {
        key: "location",
        label: "Location",
        type: "select",
        options: ["beach", "city", "park", "field"],
        default: "beach",
      },
    ],
    tags: ["golden hour", "portrait", "sunset"],
  },
  {
    id: "cozy-at-home",
    name: "Cozy at Home",
    category: "lifestyle",
    icon: "🏡",
    description: "Relaxed at-home content",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Cozy at home, wearing {outfit}, {activity}, on couch or bed, warm indoor lighting, relaxed and comfortable vibe, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["oversized hoodie", "pajamas", "loungewear"],
        default: "oversized hoodie",
      },
      {
        key: "activity",
        label: "Activity",
        type: "select",
        options: ["reading", "scrolling phone", "watching TV"],
        default: "reading",
      },
    ],
    tags: ["cozy", "home", "relax"],
  },

  // ─── Aesthetic ───
  {
    id: "mirror-selfie",
    name: "Mirror Selfie",
    category: "aesthetic",
    icon: "🪞",
    description: "Classic mirror selfie with clean vibes",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Mirror selfie in a {setting}, wearing {outfit}, phone held at chest level, casual pose, soft overhead lighting, everyday aesthetic, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "text",
        default: "crop top and jeans",
      },
      {
        key: "setting",
        label: "Setting",
        type: "select",
        options: ["bathroom", "gym", "bedroom"],
        default: "bathroom",
      },
    ],
    tags: ["mirror", "selfie", "aesthetic"],
  },
  {
    id: "beach-day",
    name: "Beach Day",
    category: "aesthetic",
    icon: "🏖️",
    description: "Sun-kissed beach content",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Beach day photo, wearing {swimwear}, {pose} on sandy beach, bright sunny day, turquoise water in background, sun-kissed skin, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "swimwear",
        label: "Swimwear",
        type: "select",
        options: ["bikini", "one piece", "board shorts"],
        default: "bikini",
      },
      {
        key: "pose",
        label: "Pose",
        type: "select",
        options: ["standing", "laying", "walking"],
        default: "standing",
      },
    ],
    tags: ["beach", "summer", "swimwear"],
  },
  {
    id: "car-selfie",
    name: "Car Selfie",
    category: "aesthetic",
    icon: "🚗",
    description: "Quick car selfie with natural light",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Car selfie from driver seat, wearing {outfit}, {vibe} vibe, natural light coming through windshield, casual expression, car interior visible, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "outfit",
        label: "Outfit",
        type: "text",
        default: "hoodie",
      },
      {
        key: "vibe",
        label: "Vibe",
        type: "select",
        options: ["casual", "dressed up", "sporty"],
        default: "casual",
      },
    ],
    tags: ["car", "selfie", "casual"],
  },
  {
    id: "getting-ready",
    name: "Getting Ready",
    category: "aesthetic",
    icon: "✨",
    description: "Getting ready content — hair, makeup, or outfits",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Getting ready in front of mirror, {stage}, wearing {outfit}, bathroom or bedroom vanity, warm lighting, candid feel, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "stage",
        label: "Stage",
        type: "select",
        options: ["doing hair", "doing makeup", "choosing outfit"],
        default: "doing makeup",
      },
      {
        key: "outfit",
        label: "Outfit",
        type: "select",
        options: ["robe", "towel", "underwear"],
        default: "robe",
      },
    ],
    tags: ["grwm", "getting ready", "beauty"],
  },

  // ─── UGC ───
  {
    id: "holding-product",
    name: "Holding Product",
    category: "ugc",
    icon: "🤳",
    description: "Showcase a product naturally in your hands",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Holding {product} in hands, casual and natural pose, in a {setting} setting, product clearly visible, soft natural lighting, genuine expression, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "product",
        label: "Product",
        type: "text",
        default: "skincare bottle",
      },
      {
        key: "setting",
        label: "Setting",
        type: "select",
        options: ["kitchen", "bathroom", "desk", "outdoor"],
        default: "bathroom",
      },
    ],
    tags: ["ugc", "product", "brand"],
  },
  {
    id: "product-review",
    name: "Product Review",
    category: "ugc",
    icon: "⭐",
    description: "Authentic product reaction shot",
    outputType: "IMAGE",
    creditsCost: 1,
    scenePrompt:
      "Product review selfie, holding {product}, {reaction} expression, looking at camera, clean simple background, natural lighting, authentic and relatable feel, raw iPhone photography, visible pores and fine details",
    customizableFields: [
      {
        key: "product",
        label: "Product",
        type: "text",
        default: "protein powder tub",
      },
      {
        key: "reaction",
        label: "Reaction",
        type: "select",
        options: ["excited", "genuine surprise", "thoughtful"],
        default: "excited",
      },
    ],
    tags: ["ugc", "review", "reaction"],
  },
];

export const categoryLabels: Record<string, string> = {
  fitness: "Fitness",
  lifestyle: "Lifestyle",
  aesthetic: "Aesthetic",
  ugc: "UGC",
};
