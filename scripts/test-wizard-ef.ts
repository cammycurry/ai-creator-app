#!/usr/bin/env npx tsx
/**
 * Wizard Prompt Test Round 2: E and D-fixed
 * E = Best of B (skin texture, baby hairs) + flat white bg + no shadow language
 * D-fixed = D hybrid but with explicit white bg reinforcement
 * All 6 creators, 4 rolls each = 48 images
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
    id: "E-clean-realism",
    label: "Clean Realism (skin texture + baby hairs, flat white bg, no shadows)",
    buildPrompt: (basePrompt) => {
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const enhanced = `${withoutRealism} ${CAMERA}. Visible pores, subtle natural skin texture, defined facial features. Baby hairs at temples. Pure white seamless background, flat even studio lighting. Photorealistic.`;
      return wrapWithSilhouette(enhanced);
    },
  },
  {
    id: "D-fixed",
    label: "Hybrid Fixed (gorgeous + selective realism + explicit white bg)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that turns heads."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const enhanced = `${withoutRealism} ${hotLine} ${CAMERA}. Visible pores, subtle natural skin texture. Baby hairs catching the light. Pure white seamless background, flat even studio lighting. Photorealistic.`;
      return wrapWithSilhouette(enhanced);
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
  console.log("═══ WIZARD PROMPT TEST ROUND 2: E + D-FIXED ═══");
  console.log(`${CREATORS.length} creators x ${strategies.length} strategies x ${ROLLS} rolls = ${total} images`);
  console.log("─".repeat(60));

  for (const creator of CREATORS) {
    console.log(`\n╔══ ${creator.name.toUpperCase()} ══╗`);
    const basePrompt = buildWizardPrompt(creator.traits);

    for (const strategy of strategies) {
      const fullPrompt = strategy.buildPrompt(basePrompt, creator.traits);
      const dir = path.join(OUTPUT_DIR, creator.name, strategy.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "prompt.txt"), fullPrompt);

      console.log(`  ${strategy.id}: ${strategy.label}`);

      const results = await Promise.all(
        Array.from({ length: ROLLS }, (_, i) =>
          generateOne(fullPrompt, path.join(dir, `roll-${i + 1}.jpg`)).then(ok => {
            console.log(`    ${ok ? "✓" : "✗"} roll-${i + 1}`);
            return ok;
          })
        )
      );
      console.log(`    ${results.filter(Boolean).length}/${ROLLS} generated`);
    }
  }

  console.log(`\nDone! Added E and D-fixed to: ${OUTPUT_DIR}`);
  console.log("Refresh http://localhost:3333 to see new columns");

  // Update the HTML to include E and D-fixed
  const htmlPath = path.join(OUTPUT_DIR, "index.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  if (!html.includes("E-clean-realism")) {
    html = html.replace(
      `{id:"D-hybrid",label:"D: Hybrid",desc:"Selective realism + gorgeous language"},`,
      `{id:"D-hybrid",label:"D: Hybrid",desc:"Selective realism + gorgeous language"},
  {id:"E-clean-realism",label:"E: Clean Realism",desc:"Skin texture + baby hairs, flat white bg, NO shadows"},
  {id:"D-fixed",label:"D-Fixed: Hybrid",desc:"Gorgeous + selective realism + explicit white bg"},`
    );
    // Update grid to 6 columns
    html = html.replace(
      "grid-template-columns: repeat(4, 1fr)",
      "grid-template-columns: repeat(6, 1fr)"
    );
    fs.writeFileSync(htmlPath, html);
  }

  const { execSync } = await import("child_process");
  execSync(`open "http://localhost:3333"`);
}

main().catch(console.error);
