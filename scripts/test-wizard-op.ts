#!/usr/bin/env npx tsx
/**
 * Round 7: O and P
 * O = M/N formula but with explicit #FFFFFF hex + iPhone 17 Pro Max camera
 * P = Same + gorgeous language
 * Both have hex color in silhouette AND realism blocks
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { buildWizardPrompt, CAMERA, REALISM_BASE } from "../src/lib/prompts";
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

// Updated silhouette wrapper with explicit hex color
function wrapWithSilhouetteHex(personPrompt: string): string {
  return [
    "Composition: The reference image is a layout template.",
    "It shows a gray featureless silhouette on a pure white (#FFFFFF) background that defines the exact framing, body position, crop level, and pose.",
    "Strictly match the silhouette's composition, background color (#FFFFFF), framing, crop, and body position.",
    "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
    "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.",
    "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
    `Subject: Replace the gray silhouette with a real photorealistic person. ${personPrompt}`,
  ].join("\n");
}

function buildRealism(isMale: boolean): string {
  const genderSpecific = isMale
    ? ""
    : "Hair worn down, flowing naturally. No makeup, natural bare face. ";

  return [
    `${genderSpecific}Visible pores on forehead and nose.`,
    "Subtle natural skin texture with fine detail.",
    "Baby hairs at temples catching the light.",
    "Defined facial features.",
    "Fabric texture visible on clothing with natural stretch and compression.",
    "Plain solid fabric, no logos, no branding, no text.",
    "Pure white (#FFFFFF) seamless studio background.",
    "Flat even studio lighting, no directional shadows, no color cast.",
    "Photorealistic.",
  ].join(" ");
}

// iPhone 17 Pro Max camera settings
const IPHONE_CAMERA = "iPhone 17 Pro Max, 48MP main sensor, f/1.78 aperture, 24mm focal length, ProRAW, highest quality settings, Photonic Engine processing";

function buildRealismIphone(isMale: boolean): string {
  const genderSpecific = isMale
    ? ""
    : "Hair worn down, flowing naturally. No makeup, natural bare face. ";

  return [
    `${genderSpecific}Visible pores on forehead and nose.`,
    "Subtle natural skin texture with fine detail.",
    "Baby hairs at temples catching the light.",
    "Defined facial features.",
    "Fabric texture visible on clothing with natural stretch and compression.",
    "Plain solid fabric, no logos, no branding, no text.",
    "Pure white (#FFFFFF) seamless studio background.",
    "Flat even studio lighting, no directional shadows, no color cast.",
    "Photorealistic.",
  ].join(" ");
}

const strategies: { id: string; label: string; buildPrompt: (basePrompt: string, traits: StudioTraits) => string }[] = [
  {
    id: "O-hex-iphone",
    label: "Hex #FFFFFF + iPhone 17 Pro Max camera (no gorgeous)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      return wrapWithSilhouetteHex(`${withoutRealism} ${IPHONE_CAMERA}. ${buildRealismIphone(isMale)}`);
    },
  },
  {
    id: "P-hex-iphone-gorgeous",
    label: "Hex #FFFFFF + iPhone 17 Pro Max + gorgeous language",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that stops you mid-scroll. Stunning."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";
      return wrapWithSilhouetteHex(`${withoutRealism} ${hotLine} ${IPHONE_CAMERA}. ${buildRealismIphone(isMale)}`);
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
  console.log("═══ ROUND 7: O + P (Hex #FFFFFF + iPhone 17 Pro Max) ═══");
  console.log(`O = hex bg + iPhone 17 Pro Max 48MP f/1.78 ProRAW`);
  console.log(`P = same + gorgeous language`);
  console.log(`${total} images`);
  console.log("─".repeat(50));

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
  if (!html.includes("O-hex-iphone")) {
    html = html.replace(
      `{id:"N-final-gorgeous",label:"N: FINAL + Hot",desc:"Definitive formula + stops you mid-scroll, stunning."},`,
      `{id:"N-final-gorgeous",label:"N: FINAL + Hot",desc:"Definitive formula + stops you mid-scroll, stunning."},
  {id:"O-hex-iphone",label:"O: Hex+iPhone17",desc:"#FFFFFF hex + iPhone 17 Pro Max 48MP f/1.78 ProRAW"},
  {id:"P-hex-iphone-gorgeous",label:"P: Hex+iPhone17+Hot",desc:"#FFFFFF hex + iPhone 17 Pro Max + gorgeous language"},`
    );
    html = html.replace(
      "grid-template-columns: repeat(15, 1fr)",
      "grid-template-columns: repeat(17, 1fr)"
    );
    fs.writeFileSync(htmlPath, html);
  }

  console.log(`\nDone! Refresh http://localhost:3333`);
}

main().catch(console.error);
