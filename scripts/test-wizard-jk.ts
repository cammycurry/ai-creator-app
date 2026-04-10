#!/usr/bin/env npx tsx
/**
 * Wizard Prompt Test Round 5: J and K
 * J = Our best shot. Everything learned. Toned-down eyebags, no makeup, hair down,
 *     bra on, hips up, white bg, all good anchors, gorgeous language.
 * K = FULL SEND. Max realism with shadows + dramatic, but WITH all prompt fixes
 *     (bg, hair, no makeup, fabric, composition). "What if B was done right?"
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { buildWizardPrompt, wrapWithSilhouette, CAMERA, REALISM_BASE } from "../src/lib/prompts";
import type { StudioTraits } from "../src/stores/studio-store";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const TEMPLATE_PATH = path.join(__dirname, "../src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");

const CREATORS: { name: string; traits: StudioTraits }[] = [
  { name: "sienna", traits: { gender: "Female", age: "23", ethnicity: "European", build: "Slim", chestSize: "large", vibes: ["Sexy", "Confident", "Sultry"] } },
  { name: "valentina", traits: { gender: "Female", age: "24", ethnicity: "Scandinavian", build: "Athletic", chestSize: "medium-large", vibes: ["Confident", "Fierce", "Motivated"] } },
  { name: "jordyn", traits: { gender: "Female", age: "22", ethnicity: "Mixed Black", build: "Slim", chestSize: "medium-large", vibes: ["Sexy", "Confident", "Fierce"] } },
  { name: "nara", traits: { gender: "Female", age: "23", ethnicity: "Korean", build: "Slim", chestSize: "medium", vibes: ["Sexy", "Elegant", "Gorgeous"] } },
  { name: "camila", traits: { gender: "Female", age: "24", ethnicity: "Brazilian", build: "Slim", chestSize: "medium-large", vibes: ["Sexy", "Confident", "Radiant"] } },
  { name: "marcus", traits: { gender: "Male", age: "26", ethnicity: "Black", build: "Muscular", chestSize: null, vibes: ["Confident", "Attractive"] } },
];

type StrategyFn = (basePrompt: string, traits: StudioTraits) => string;

const strategies: { id: string; label: string; buildPrompt: StrategyFn }[] = [
  {
    id: "J-best-shot",
    label: "Best Shot (all lessons learned, max control, gorgeous)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();

      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that turns heads."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";

      const hairLine = isMale ? "" : "Hair worn down, flowing naturally.";
      const makeupLine = isMale ? "" : "No makeup, natural bare face.";

      const realism = [
        "Visible pores on forehead, nose, and cheeks.",
        "Subtle natural skin texture with fine detail.",
        "Baby hairs at temples catching the light.",
        "Natural under-eye area, not heavy shadows.",
        "Defined facial features.",
        hairLine,
        makeupLine,
        "Fabric texture visible on clothing, plain solid fabric, no logos, no branding, no text.",
        "Pure white seamless studio background.",
        "Flat even studio lighting, no directional shadows, no color cast.",
        "Photorealistic.",
      ].filter(Boolean).join(" ");

      return wrapWithSilhouette(`${withoutRealism} ${hotLine} ${CAMERA}. ${realism}`);
    },
  },
  {
    id: "K-full-send",
    label: "Full Send (MAX realism + shadows + dramatic, but with all prompt fixes)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();

      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that turns heads."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";

      const hairLine = isMale ? "" : "Hair worn down, flowing naturally.";
      const makeupLine = isMale ? "" : "No makeup, natural bare face.";

      const realism = [
        "Visible pores on forehead, nose, and cheeks. Never smooth or airbrushed.",
        "Subtle natural skin texture with fine detail and natural variation.",
        "Baby hairs at temples, flyaways catching backlight, imperfect part line.",
        "Slight under-eye shadows and fine lines, natural discoloration.",
        "Natural uneven skin tone, subtle redness on nose and cheeks.",
        "Defined facial features.",
        hairLine,
        makeupLine,
        "Fabric texture visible on clothing with natural stretch, compression wrinkles where body bends. Plain solid fabric, no logos, no branding, no text.",
        "Slight camera edge softness and subtle shadow noise.",
        "Pure white seamless studio background.",
        "Soft natural studio lighting with gentle directional light from camera-left, subtle shadows on the right side of the face.",
        "Photorealistic.",
      ].filter(Boolean).join(" ");

      return wrapWithSilhouette(`${withoutRealism} ${hotLine} ${CAMERA}. ${realism}`);
    },
  },
];

const ROLLS = 4;
const OUTPUT_DIR = path.join(__dirname, "output/wizard-prompt-test");

async function generateOne(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
      return true;
    }
    console.log(`      filtered (${response.candidates?.[0]?.finishReason})`);
    return false;
  } catch (e: any) {
    console.log(`      error: ${e.message?.substring(0, 80)}`);
    return false;
  }
}

async function main() {
  const total = CREATORS.length * strategies.length * ROLLS;
  console.log("═══ WIZARD PROMPT TEST ROUND 5: J + K ═══");
  console.log(`${total} images`);
  console.log("J = Best shot (toned eyebags, no makeup, hair down, gorgeous, flat bg)");
  console.log("K = Full send (max realism + directional lighting, but with all fixes)");
  console.log("─".repeat(60));

  for (const creator of CREATORS) {
    console.log(`\n╔══ ${creator.name.toUpperCase()} ══╗`);
    const basePrompt = buildWizardPrompt(creator.traits);

    for (const strategy of strategies) {
      const fullPrompt = strategy.buildPrompt(basePrompt, creator.traits);
      const dir = path.join(OUTPUT_DIR, creator.name, strategy.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "prompt.txt"), fullPrompt);

      console.log(`  ${strategy.id}`);
      const results = await Promise.all(
        Array.from({ length: ROLLS }, (_, i) =>
          generateOne(fullPrompt, path.join(dir, `roll-${i + 1}.jpg`)).then(ok => {
            console.log(`    ${ok ? "✓" : "✗"} roll-${i + 1}`);
            return ok;
          })
        )
      );
      console.log(`    ${results.filter(Boolean).length}/${ROLLS}`);
    }
  }

  // Update HTML
  const htmlPath = path.join(OUTPUT_DIR, "index.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  if (!html.includes("J-best-shot")) {
    html = html.replace(
      `{id:"I-true-full-gorgeous",label:"I: TRUE Full + Hot",desc:"ALL anchors + gorgeous language + white bg"},`,
      `{id:"I-true-full-gorgeous",label:"I: TRUE Full + Hot",desc:"ALL anchors + gorgeous language + white bg"},
  {id:"J-best-shot",label:"J: Best Shot",desc:"All lessons learned. Toned eyebags, no makeup, hair down, gorgeous, flat white bg"},
  {id:"K-full-send",label:"K: Full Send",desc:"MAX realism + directional shadows, but with all prompt fixes applied"},`
    );
    html = html.replace(
      "grid-template-columns: repeat(10, 1fr)",
      "grid-template-columns: repeat(12, 1fr)"
    );
    fs.writeFileSync(htmlPath, html);
  }

  console.log(`\nDone! Refresh http://localhost:3333`);
  console.log("Now 12 columns: A B C D E D-Fixed F G H I J K");
}

main().catch(console.error);
