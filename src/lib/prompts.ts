/**
 * Central prompt templates for all image generation.
 *
 * Edit these to change how every generation call behaves.
 * generate-actions.ts imports from here — no prompts live there anymore.
 *
 * Research & rationale: docs/reference/PROMPT-ENGINEERING-RESEARCH.md
 * Course notes: docs/courses/aiac/master-prompts.md, docs/courses/ai-realism/
 */

import type { StudioTraits } from "@/stores/studio-store";

// ─── User Input Sanitization ────────────────────────
// Custom user inputs (build, age, vibe) go into prompts.
// Strip anything that looks like prompt injection or system instructions.
function sanitizeUserInput(input: string): string {
  return input
    .replace(/[{}[\]<>]/g, "") // strip brackets that could be prompt syntax
    .replace(/\b(system|ignore|override|instruction|prompt|forget)\b/gi, "") // strip injection keywords
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 100); // cap length
}

// ─── Realism Anchors ─────────────────────────────────
// These go at the end of every generation prompt.
// "Canon EOS R5" alone is enough — full lens spec doesn't help.
// "Visible pores" is essential. "Light freckles" helps for fair skin only.

export const CAMERA = "Canon EOS R5";
export const EYES_OPEN = "Eyes open, looking directly at camera";
export const REALISM_BASE = `${EYES_OPEN}. Visible pores, photorealistic`;
export const REALISM_FRECKLES = `${EYES_OPEN}. Visible pores, light freckles, photorealistic`;

// ─── Validated Realism Anchors (from A/B/C testing) ──
// These 6 improve realism WITHOUT hurting attractiveness.
// See: docs/reference/PROMPT-AB-TEST-RESULTS.md
export const REALISM_CONTENT = [
  "Visible fabric texture with natural wrinkles where body bends",
  "Baby hairs and flyaways catching light",
  "Visible pores, photorealistic",
].join(". ") + ".";

// ─── Camera Profiles ────────────────────────────────
export const CAMERA_SELFIE = "iPhone front camera selfie, arm extended at natural distance, slightly off-center composition, face fills upper third, natural selfie angle slightly above eye level";
export const CAMERA_REAR = "iPhone rear camera, natural depth of field, background slightly soft, medium distance, full upper body, true-to-life proportions";
export const CAMERA_MIRROR = "Mirror selfie with iPhone rear camera, mirror edge partially visible, phone at chest level, slight tilt";

// ─── Seed Generation Prompt ──────────────────────────
export const SEED_GENERATION_PROMPT = `Analyze this person and write a dense, specific physical description paragraph that could be used to consistently recreate them in future AI image generations.

Include:
- Hair: color, length, texture, style, notable features (highlights, part line, baby hairs)
- Eyes: color, shape, lash density, brow shape
- Skin: tone (include approximate hex code), texture, any marks (freckles, beauty marks, moles)
- Face: jawline shape, lip fullness, nose shape, face shape
- Build: body type, notable features
- Vibe: how they carry themselves, their energy

Format: One dense paragraph, 80-120 words. Start with "That exact [age estimate]-year-old [gender] with..."
Do NOT include clothing, setting, or pose. Only describe the PERSON.
Be specific enough that this description alone could recreate the same person every time.
Emphasize their most attractive and distinctive features — this person should look gorgeous in every generation.`;

// ─── Banned Words ────────────────────────────────────
// NEVER use these in any prompt. Tested — they hurt output quality.
//
// "voluptuous/curvy/hourglass" → triggers plus-size body type
// "instagram fitness"          → triggers athletic/bodybuilder
// "imperfections"              → makes skin look diseased
// "no makeup"                  → makes face look washed out
// "blemishes/uneven hairline"  → Gemini takes it literally
// Face-first descriptions      → produces generic model look

export const BANNED_WORDS = [
  "voluptuous", "curvy", "hourglass",
  "instagram fitness",
  "imperfections", "blemishes", "uneven hairline",
  "no makeup",
];

// ─── Clothing Defaults ───────────────────────────────
// Wizard always uses these. Content gen will have its own clothing logic.

export const CLOTHING_FEMALE = "white sports bra and black leggings";
export const CLOTHING_FEMALE_TIGHT = "tight white sports bra and black leggings";
export const CLOTHING_MALE = "Shirtless, wearing dark joggers";

// ─── Silhouette Wrapper ──────────────────────────────
// Wraps around ANY person-description prompt when using the composition template.
// The silhouette ref image controls framing/pose/composition.
//
// Research findings (March 2026):
// - Google/NBPro guides: describe the reference image's ROLE first
// - "Strictly control the composition and layout" with sketches/wireframes
// - Explicit preservation: say WHAT to keep and WHAT to replace
// - Natural language sentences > keyword lists
// - awesome-nanobanana-pro repo: "Important: do not change [X]" pattern works
// - Labeled sections (Composition, Subject) communicate hierarchy

// AIAC reference: front-facing, calm confident expression, arms down, waist-up crop.
// Strict crop enforcement — no hip dips, no nudity, always clothed.
export function wrapWithSilhouette(personPrompt: string): string {
  return [
    "Composition: The reference image is a layout template.",
    "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
    "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
    "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
    "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.",
    "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
    `Subject: Replace the gray silhouette with a real photorealistic person. ${personPrompt}`,
  ].join("\n");
}

// ─── Wizard Base Prompt ──────────────────────────────
// Builds a prompt from the trait picker UI.
//
// Structure (tested, vibe-first beats face-first):
//   {vibe} {age}-year-old {ethnicity} {gender}, {body}.
//   {build} build. {clothing}.
//   Canon EOS R5. Visible pores, photorealistic.
//
// Target: 40-80 words. Medium detail — not too sparse, not an essay.

export function buildWizardPrompt(traits: StudioTraits): string {
  const genderRaw = traits.gender?.toLowerCase() ?? "woman";
  const isMale = genderRaw === "male";
  const subject = isMale ? "man" : "woman";
  const age = traits.age ?? "25";
  const ethnicity = traits.ethnicity ? `${traits.ethnicity} ` : "";

  // Vibe — always leads (tested: vibe-first > face-first)
  // Sanitize custom vibes (user-typed, not from preset list)
  const vibeText = traits.vibes.length > 0
    ? `${traits.vibes.map(sanitizeUserInput).join(", ")} `
    : "Sexy confident ";

  // Body + clothing — map UI labels to prompt-safe descriptions
  // Custom user inputs (not in map) are sanitized and used as-is
  const BUILD_MAP: Record<string, string> = {
    "slim": "slim",
    "athletic": "athletic",
    "slim thick": "slim with wide hips and narrow waist",
    "full figure": "full-figured",
    "muscular": "muscular",
    "average": "average",
  };
  const rawBuild = traits.build?.toLowerCase() ?? "athletic";
  const buildDesc = BUILD_MAP[rawBuild] ?? sanitizeUserInput(rawBuild);
  let bodyDesc = "";
  let clothingTight = "";

  // Chest size mapping — be very explicit so Gemini actually renders the difference
  if (!isMale && traits.chestSize) {
    const CHEST_MAP: Record<string, string> = {
      "small": "small A-cup breasts, modest chest",
      "medium": "medium B-cup breasts",
      "medium-large": "large C-cup breasts with visible cleavage, chest filling the sports bra",
      "large": "very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra",
    };
    const chestDesc = CHEST_MAP[traits.chestSize.toLowerCase()] ?? "medium breasts";
    bodyDesc = `, ${chestDesc}`;
    if (traits.chestSize.toLowerCase() === "large" || traits.chestSize.toLowerCase() === "medium-large") {
      clothingTight = "tight ";
    }
  }

  const clothing = isMale
    ? `${CLOTHING_MALE}.`
    : `${clothingTight}${CLOTHING_FEMALE}.`;

  return [
    `${vibeText}${age}-year-old ${ethnicity}${subject}${bodyDesc}.`,
    `${buildDesc.charAt(0).toUpperCase() + buildDesc.slice(1)} build. ${clothing}`,
    `${CAMERA}. ${REALISM_BASE}.`,
  ].filter(Boolean).join(" ");
}

// ─── Reference-Based Generation Prompt ───────────────
// Used when user uploads face/body/full reference images.
// Two modes: "exact" (recreate the person) vs "inspired" (similar vibe, different person).

export function buildReferencePrompt(
  traits: StudioTraits,
  description: string | undefined,
  mode: "exact" | "inspired",
  slots: ("face" | "body" | "full")[]
): string {
  const isMale = traits.gender?.toLowerCase() === "male";
  const subject = isMale ? "man" : "woman";

  // Image 0 is always the silhouette composition template (handled by wrapWithSilhouetteAndRefs).
  // User reference images start at index 1, so offset by +2 for human-readable numbering.
  const roleDescs: string[] = [];
  slots.forEach((slot, i) => {
    const imgNum = i + 2; // image 1 = silhouette, image 2+ = user refs
    if (slot === "face") roleDescs.push(`Image ${imgNum} shows the face to ${mode === "exact" ? "recreate" : "draw inspiration from"}.`);
    if (slot === "body") roleDescs.push(`Image ${imgNum} shows the body type to match.`);
    if (slot === "full") roleDescs.push(`Image ${imgNum} shows the full person to ${mode === "exact" ? "recreate" : "draw inspiration from"}.`);
  });

  const modeInstruction = mode === "exact"
    ? `Create a photorealistic portrait of that exact ${subject}. Maintain identical facial features, skin tone, and all identifying details.`
    : `Create a completely different ${subject} inspired by the reference — similar vibe and aesthetic, but a unique individual.`;

  const descLine = description?.trim()
    ? `\n${description.trim()}`
    : "";

  const traitLine = !description?.trim() ? buildTraitSummary(traits) : "";

  return [
    roleDescs.join(" "),
    modeInstruction,
    descLine,
    traitLine,
    `${CAMERA}. Visible pores, photorealistic.`,
  ].filter(Boolean).join("\n");
}

// Wraps a reference-based prompt with silhouette composition instructions.
// Image 1 = silhouette template, Images 2+ = user reference photos.
export function wrapWithSilhouetteAndRefs(refPrompt: string): string {
  return [
    "Composition: Image 1 is a layout template showing a gray featureless silhouette on a white background.",
    "It defines the exact framing, body position, crop level, and pose.",
    "Strictly match this composition — frame from top of head to belly button ONLY. Do not show hips or anything below.",
    "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear.",
    "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
    `Subject: Replace the silhouette with a real photorealistic person. ${refPrompt}`,
  ].join("\n");
}

function buildTraitSummary(traits: StudioTraits): string {
  const parts: string[] = [];
  if (traits.age) parts.push(`${traits.age} years old`);
  if (traits.ethnicity) parts.push(traits.ethnicity);
  if (traits.build) parts.push(`${traits.build} build`);
  if (traits.vibes.length > 0) parts.push(`${traits.vibes.join(", ")} vibe`);
  return parts.length > 0 ? parts.join(", ") + "." : "";
}

// ─── Sample Content Prompts (UGC Style) ──────────────
// Generated automatically after wizard to hook the user.

export function buildSampleContentPrompts(gender: string | null): string[] {
  const subject = gender?.toLowerCase() === "male" ? "man" : "woman";
  const pronoun = gender?.toLowerCase() === "male" ? "He" : "She";
  const gymOutfit = gender?.toLowerCase() === "male"
    ? "tank top and joggers" : "matching black sports set";

  return [
    `That exact ${subject} from the reference image. Relaxed at a trendy coffee shop, wearing an oversized cream sweater, holding iced latte, looking at phone with a warm smile. ${pronoun} looks absolutely gorgeous.

ENVIRONMENT: Wooden table with napkin and pastry plate, earbuds case, warm pendant lights above, other customers blurred in background. Coffee shop menu board partially visible.

CAMERA: Selfie front camera, arm extended, off-center composition, window light on face from the left.

REALISM: Sweater fabric texture visible, baby hairs catching window light. Visible pores, photorealistic.`,

    `That exact ${subject} from the reference image. Post-workout energy, wearing ${gymOutfit}, slightly sweaty, powerful confident expression. ${pronoun} looks incredible — strong and sexy.

ENVIRONMENT: Modern gym mirrors, dumbbells on rack in background, water bottle on bench, towel draped over equipment, rubber floor visible.

CAMERA: Mirror selfie, phone at chest height, slight upward angle, off-center, mirror edge visible.

REALISM: Compression fabric texture on waistband, baby hairs at temples catching gym light. Visible pores, photorealistic.`,

    `That exact ${subject} from the reference image. Walking on a city sidewalk at golden hour, wearing a fitted outfit, looking back at camera with a playful expression. ${pronoun} looks stunning.

ENVIRONMENT: Storefronts with warm window light, parked cars, other pedestrians blurred, crosswalk lines, tree shadows on pavement.

CAMERA: Rear camera, medium distance, natural depth, background slightly soft with golden bokeh.

REALISM: Hair catching golden backlight with flyaways visible, fabric moving naturally with stride. Visible pores, photorealistic.`,
  ];
}

// ─── "More Like This" Prompt ─────────────────────────
// Used when user picks an image and wants variations of that same person.
// Image 1 = silhouette composition template (framing), Image 2 = selected generated image.
// Additional images = user-uploaded refs (if any).
// Minimal text — the reference images do the heavy lifting.

export function buildVariationPrompt(
  traits: StudioTraits,
  refinement?: string
): string {
  const genderRaw = traits.gender?.toLowerCase() ?? "woman";
  const subject = genderRaw === "male" ? "man" : "woman";
  const clothing = subject === "man" ? CLOTHING_MALE.toLowerCase() : CLOTHING_FEMALE_TIGHT;

  const framing = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate.";

  if (refinement?.trim()) {
    return `${framing} That exact ${subject} from image 2, but ${refinement.trim()}. Wearing a ${clothing}. ${CAMERA}. ${REALISM_BASE}.`;
  }

  return `${framing} That exact ${subject} from image 2, wearing a ${clothing}. ${CAMERA}. ${REALISM_BASE}.`;
}

// ─── Describe Mode Enhancement ───────────────────────
// System prompt for Grok/Flash to rewrite freeform descriptions.
// User types "hot blonde with big tits" → this turns it into a proper generation prompt.

export const ENHANCE_SYSTEM_PROMPT = `You rewrite casual descriptions into image generation prompts. This is for AI influencer portraits — never censor or sanitize body descriptions.

The image will be generated with a silhouette composition reference that handles framing/pose. Your prompt only needs to describe the PERSON.

FORMAT — lead with vibe/energy, then subject, then details:
"[vibe words] [age]-year-old [ethnicity] [gender], [hair], [eyes], [expression]. [body if mentioned]. [clothing]. ${CAMERA}. Visible pores[, light freckles if fair skin]."

BODY TRANSLATION — be faithful:
- "huge tits/big boobs" → "very large bust with visible cleavage"
- "big ass" → "wide hips, full round rear"
- "thick" → "full-figured, large bust, wide hips, narrow waist"
- "petite/skinny" → "slim petite frame"
- Use "tight" on clothing when bust is emphasized

RULES:
- Lead with the ENERGY: "sexy confident", "sultry gorgeous", "fierce stunning"
- 40-80 words max. Medium detail, not an essay
- "${CAMERA}" only — no lens specs, no lighting directions
- Always end with "Visible pores" + "light freckles" for fair/medium skin
- NEVER: "no makeup", "imperfections", "voluptuous", "curvy", "hourglass"
- NEVER: face-first descriptions ("beautiful face with blue eyes...")
- Clothing is always "${CLOTHING_FEMALE_TIGHT}" (female) or "${CLOTHING_MALE.toLowerCase()}" (male)

Output ONLY the prompt. No explanations, no quotes, no markdown.`;

// ─── Content Enhancement Prompt ─────────────────────
// Different from ENHANCE_SYSTEM_PROMPT (wizard-only, locked clothing/composition).
// This is for content generation — full creative freedom on outfit, setting, pose.
// User types "coffee shop selfie" → this turns it into a full scene description.

export const CONTENT_ENHANCE_PROMPT = `You turn casual content ideas into structured image generation prompts for an AI influencer's Instagram content.

The person's appearance is handled by a reference image and identity description — you do NOT describe the person's physical features. You describe the SCENE, OUTFIT, ACTION, and ENVIRONMENT.

RULES:
- 80-120 words total across all sections
- NEVER say "Shot on iPhone" (causes UI overlay bugs). Describe camera characteristics directly.
- Include 3+ environmental objects that make the scene feel REAL and lived-in
- Describe specific lighting (warm lamp + cool window, golden hour directional, gym fluorescent)
- Always reinforce that the person looks gorgeous/stunning/beautiful
- NEVER describe face, body type, hair color, or ethnicity (reference handles this)
- NEVER use: "Canon EOS R5", "studio lighting", "professional photography"

OUTPUT FORMAT (use these exact section labels):

[Scene and action]. She looks [gorgeous/stunning/incredible].

ENVIRONMENT: [3+ specific real objects — charger cable, water bottle, hair tie on wrist, AirPods, throw blanket, etc. Room/location details that make it lived-in.]

CAMERA: [iPhone selfie/rear/mirror angle, composition, distance. Off-center for selfies. Describe the angle, not the device name.]

REALISM: Fabric wrinkles where body bends, baby hairs catching light. Visible pores, photorealistic.

EXAMPLES:

Input: "gym selfie"
Output:
Post-workout mirror selfie, sports bra and leggings, glistening with light sweat, confident powerful expression. She looks absolutely gorgeous — strong and sexy.

ENVIRONMENT: Gym equipment in background, water bottle on bench, AirPods case on folded towel, gym bag strap at edge of frame. Rubber floor mats visible.

CAMERA: Mirror selfie, phone at waist level, slight upward angle. Off-center composition, mirror edge visible on left side.

REALISM: Compression visible on waistband seams, baby hairs at temples catching gym light. Visible pores, photorealistic.

Input: "laying in bed"
Output:
Laying in bed scrolling phone, wearing an oversized t-shirt, messy morning hair, sleepy but gorgeous smile. She looks stunning — effortlessly beautiful.

ENVIRONMENT: Unmade white sheets, phone charger cable on nightstand, water bottle, warm morning light through sheer curtains casting soft shadows.

CAMERA: Selfie from above, arm extended, slightly off-center, face fills upper portion of frame. Natural morning light on face.

REALISM: T-shirt fabric drapes naturally with visible wrinkles, stray hairs across pillow. Visible pores, photorealistic.

Output ONLY the structured prompt. No explanations, no quotes, no markdown.`;

// ─── Video Enhancement Prompt ────────────────────────

export const VIDEO_ENHANCE_PROMPT = `You turn casual video ideas into motion-focused prompts for AI video generation.

The person's appearance is handled by a reference image — you describe the MOVEMENT, CAMERA MOTION, and ENVIRONMENT only.

STRUCTURE your output as:
[Cinematography/camera] + [Subject action with physics] + [Environment context] + [Style/ambiance]

RULES:
- 40-80 words, single paragraph
- Focus on PHYSICS and MOTION: describe HOW things move, not just what happens. "Each step lands heel-first then rolls forward, arms swing loosely" instead of "woman walks"
- Anchor hands to objects: "right hand wraps around ceramic mug, thumb resting on rim"
- Break expressions into stages: "eyebrows lift barely, then more, mouth curves into smile"
- ONE primary action verb — multiple motion verbs cause chaos
- Include UGC imperfection cues: slight handheld shake, off-center framing, casual environment
- Describe camera movement if any (slow pan, static, tracking)
- Include 2-3 environmental details for realism
- NEVER describe face, body type, hair color, or ethnicity
- NEVER say "Shot on iPhone" or name specific cameras
- NEVER add subtitles, text overlays, or title cards

EXAMPLES:

Input: "gym workout"
Output: Handheld medium shot, slight upward angle. She lifts a dumbbell in slow controlled curls, bicep tensing on the up-pull, exhaling softly. Gym fluorescents overhead mix with warm window light from the left. Water bottle on the bench beside her, AirPods in, towel draped over the rack. Subtle camera drift to the right. Warm, energetic atmosphere.

Input: "walking in city"
Output: Tracking shot from waist level following her stride down a busy sidewalk. Each step lands heel-first, hair shifts with the pace, tote bag swings gently at her side. Afternoon golden light between buildings casts long shadows. A coffee cup in her left hand, phone screen glowing in the other. Slight handheld wobble. Warm urban energy.

Output ONLY the motion prompt. No explanations, no quotes, no markdown.`;

// ─── Safety Filter Softening ─────────────────────────
// If Gemini blocks a prompt, strip these words and retry once.

const SAFETY_TRIGGERS = [
  /\bshirtless\b/gi,
  /\bsports bra\b/gi,
  /\bbikini\b/gi,
  /\blingerie\b/gi,
  /\brevealing\b/gi,
  /\bskimpy\b/gi,
  /\blace\b/gi,
  /\bprovocative(ly)?\b/gi,
  /\bseductive(ly)?\b/gi,
  /\bsultry\b/gi,
  /\bnude\b/gi,
  /\bnaked\b/gi,
  /\btopless\b/gi,
  /\bunderwear\b/gi,
  /\bcleavage\b/gi,
  /\bbusty\b/gi,
  /\bbreasts?\b/gi,
  /\btits?\b/gi,
  /\bdeep neckline\b/gi,
  /\blow[- ]cut\b/gi,
];

export function softenPrompt(prompt: string): string {
  let softened = prompt;
  for (const re of SAFETY_TRIGGERS) {
    softened = softened.replace(re, "");
  }
  return softened.replace(/\s{2,}/g, " ").trim();
}

// ─── Fallback Enhancement ────────────────────────────
// If both Grok and Flash fail to enhance a describe-mode prompt,
// wrap it in minimal structure so it still works.

export function fallbackEnhance(rawDescription: string): string {
  return `Sexy confident ${rawDescription}. ${CLOTHING_FEMALE_TIGHT}. ${CAMERA}. ${REALISM_BASE}.`;
}
