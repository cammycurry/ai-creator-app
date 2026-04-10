#!/usr/bin/env npx tsx
/**
 * FINAL FINAL: M and N
 * M = The definitive formula WITHOUT gorgeous language
 * N = The definitive formula WITH gorgeous language
 * All 6 creators, 4 rolls each
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

// The shared realism block (proven winners from A-L testing)
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
    "Keep the exact same background color and tone from the reference image layout template.",
    "Flat even studio lighting, no directional shadows, no color cast.",
    "Photorealistic.",
  ].join(" ");
}

const strategies: { id: string; label: string; buildPrompt: (basePrompt: string, traits: StudioTraits) => string }[] = [
  {
    id: "M-final-clean",
    label: "FINAL without gorgeous language",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      return wrapWithSilhouette(`${withoutRealism} ${CAMERA}. ${buildRealism(isMale)}`);
    },
  },
  {
    id: "N-final-gorgeous",
    label: "FINAL with gorgeous language",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that stops you mid-scroll. Stunning."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";
      return wrapWithSilhouette(`${withoutRealism} ${hotLine} ${CAMERA}. ${buildRealism(isMale)}`);
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
  console.log("═══ THE FINAL TEST: M vs N ═══");
  console.log(`M = definitive formula, no gorgeous language`);
  console.log(`N = definitive formula + gorgeous language`);
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
  if (!html.includes("M-final-clean")) {
    html = html.replace(
      `{id:"L-final",label:"L: FINAL",desc:"F + hair down + no makeup + no logos. The answer."},`,
      `{id:"L-final",label:"L: FINAL",desc:"F + hair down + no makeup + no logos. The answer."},
  {id:"M-final-clean",label:"M: FINAL Clean",desc:"Definitive formula. No gorgeous language."},
  {id:"N-final-gorgeous",label:"N: FINAL + Hot",desc:"Definitive formula + stops you mid-scroll, stunning."},`
    );
    html = html.replace(
      "grid-template-columns: repeat(13, 1fr)",
      "grid-template-columns: repeat(15, 1fr)"
    );
    fs.writeFileSync(htmlPath, html);
  }

  console.log(`\nDone! Refresh http://localhost:3333`);
  console.log("Last 2 columns: M (clean) vs N (gorgeous)");
}

main().catch(console.error);
