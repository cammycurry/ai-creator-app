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

// ─── Realism Anchors ─────────────────────────────────
// These go at the end of every generation prompt.
// "Canon EOS R5" alone is enough — full lens spec doesn't help.
// "Visible pores" is essential. "Light freckles" helps for fair skin only.

export const CAMERA = "Canon EOS R5";
export const REALISM_BASE = "Visible pores, photorealistic";
export const REALISM_FRECKLES = "Visible pores, light freckles, photorealistic";

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

export function wrapWithSilhouette(personPrompt: string): string {
  return [
    "Composition: The reference image is a layout template.",
    "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
    "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
    "Frame the image from head to hips only. Crop at the hips — do not show anything below the waist.",
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
  const vibeText = traits.vibes.length > 0
    ? `${traits.vibes.join(", ")} `
    : "Sexy confident ";

  // Body + clothing — map UI labels to prompt-safe descriptions
  const BUILD_MAP: Record<string, string> = {
    "slim": "slim",
    "athletic": "athletic",
    "slim thick": "slim with wide hips and narrow waist",
    "full figure": "full-figured",
    "muscular": "muscular",
    "average": "average",
  };
  const buildDesc = BUILD_MAP[traits.build?.toLowerCase() ?? "athletic"] ?? "athletic";
  let bodyDesc = "";
  let clothingTight = "";

  if (!isMale && traits.chestSize) {
    const chest = traits.chestSize.toLowerCase();
    if (chest === "large" || chest === "medium-large") {
      bodyDesc = `, ${chest} bust with visible cleavage`;
      clothingTight = "tight ";
    } else {
      bodyDesc = `, ${chest} bust`;
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
    "Strictly match this composition — frame from head to hips only, crop at the hips.",
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
  const gymOutfit = gender?.toLowerCase() === "male"
    ? "tank top and joggers" : "matching sports set";
  const goingOutOutfit = gender?.toLowerCase() === "male"
    ? "fitted shirt and dark jeans" : "fitted dress and heels";

  return [
    `That exact ${subject} from the reference image. Relaxed and confident at a trendy coffee shop, wearing a casual oversized sweater. Looking at their phone with a subtle smile, iced latte on the table. Shot on iPhone, candid, warm natural light from the window. Visible pores, photorealistic.`,
    `That exact ${subject} from the reference image. Post-workout glow, wearing ${gymOutfit}. Mirror selfie in a modern gym, slightly sweaty, confident expression. Shot on iPhone, candid, gym fluorescent lighting. Visible pores, photorealistic.`,
    `That exact ${subject} from the reference image. Dressed up for a night out, ${goingOutOutfit}. Standing on a city street at golden hour, looking back at the camera. Shot on iPhone, candid, golden hour lighting. Visible pores, photorealistic.`,
  ];
}

// ─── "More Like This" Prompt ─────────────────────────
// Used when user picks an image and wants variations of that same person.
// Minimal text — the reference image does the heavy lifting.

export function buildVariationPrompt(
  traits: StudioTraits,
  refinement?: string
): string {
  const genderRaw = traits.gender?.toLowerCase() ?? "woman";
  const subject = genderRaw === "male" ? "man" : "woman";
  const clothing = subject === "man" ? CLOTHING_MALE.toLowerCase() : CLOTHING_FEMALE_TIGHT;

  if (refinement?.trim()) {
    return `That exact ${subject} from the reference image, but ${refinement.trim()}. Wearing a ${clothing}. White studio backdrop. ${CAMERA}. ${REALISM_BASE}.`;
  }

  return `That exact ${subject} from the reference image, wearing a ${clothing}. White studio backdrop. ${CAMERA}. ${REALISM_BASE}.`;
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

// ─── Safety Filter Softening ─────────────────────────
// If Gemini blocks a prompt, strip these words and retry once.

const SAFETY_TRIGGERS = [
  /\bshirtless\b/gi,
  /\bsports bra\b/gi,
  /\bbikini\b/gi,
  /\blingerie\b/gi,
  /\brevealing\b/gi,
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
