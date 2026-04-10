#!/usr/bin/env npx tsx
/**
 * DEFINITIVE Wizard Prompt A/B Test
 *
 * Tests 4 prompt strategies across ALL 6 roster creators.
 * Uses buildWizardPrompt() from the ACTUAL app code with real StudioTraits objects.
 * Uses wrapWithSilhouette() from the ACTUAL app code.
 * Uses the ACTUAL silhouette composition template.
 * 4 rolls per strategy per creator = 96 images total.
 *
 * This tests the INITIAL wizard generation (white bg, no face ref).
 * NOT content generation (that was already tested in realism-ab-test).
 *
 * Usage: npx tsx scripts/test-wizard-prompts.ts
 * Output: scripts/output/wizard-prompt-test/
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Import ACTUAL app functions ─────────────────────
// We import the real buildWizardPrompt and wrapWithSilhouette
// so we're testing EXACTLY what the app does
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

// ─── ALL 6 ROSTER CREATORS ──────────────────────────
// These are the exact StudioTraits objects a user would create in the wizard

const CREATORS: { name: string; traits: StudioTraits }[] = [
  {
    name: "sienna",
    traits: {
      gender: "Female",
      age: "23",
      ethnicity: "European",
      build: "Slim",
      chestSize: "large",
      vibes: ["Sexy", "Confident", "Sultry"],
    },
  },
  {
    name: "valentina",
    traits: {
      gender: "Female",
      age: "24",
      ethnicity: "Scandinavian",
      build: "Athletic",
      chestSize: "medium-large",
      vibes: ["Confident", "Fierce", "Motivated"],
    },
  },
  {
    name: "jordyn",
    traits: {
      gender: "Female",
      age: "22",
      ethnicity: "Mixed Black",
      build: "Slim",
      chestSize: "medium-large",
      vibes: ["Sexy", "Confident", "Fierce"],
    },
  },
  {
    name: "nara",
    traits: {
      gender: "Female",
      age: "23",
      ethnicity: "Korean",
      build: "Slim",
      chestSize: "medium",
      vibes: ["Sexy", "Elegant", "Gorgeous"],
    },
  },
  {
    name: "camila",
    traits: {
      gender: "Female",
      age: "24",
      ethnicity: "Brazilian",
      build: "Slim",
      chestSize: "medium-large",
      vibes: ["Sexy", "Confident", "Radiant"],
    },
  },
  {
    name: "marcus",
    traits: {
      gender: "Male",
      age: "26",
      ethnicity: "Black",
      build: "Muscular",
      chestSize: null,
      vibes: ["Confident", "Attractive"],
    },
  },
];

// ─── 4 PROMPT STRATEGIES ─────────────────────────────
// Each takes the base wizard prompt and wraps it differently

type StrategyFn = (basePrompt: string, traits: StudioTraits) => string;

const strategies: { id: string; label: string; buildPrompt: StrategyFn }[] = [
  {
    id: "A-current",
    label: "Current (exact app behavior)",
    buildPrompt: (basePrompt) => {
      // This is EXACTLY what the app does: buildWizardPrompt → wrapWithSilhouette
      return wrapWithSilhouette(basePrompt);
    },
  },
  {
    id: "B-full-realism",
    label: "Full Realism (6 validated anchors added)",
    buildPrompt: (basePrompt) => {
      // Take the base prompt, strip the existing realism line, add full anchors
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const enhanced = `${withoutRealism} ${CAMERA}. Visible pores, subtle skin texture with natural variation. Baby hairs at temples. Fabric texture visible on clothing with natural compression wrinkles. Soft natural studio lighting with gentle shadows. Photorealistic.`;
      return wrapWithSilhouette(enhanced);
    },
  },
  {
    id: "C-attractiveness",
    label: "Attractiveness++ (heavy gorgeous language)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that turns heads."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";
      // Insert attractiveness reinforcement before the camera/realism line
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const enhanced = `${withoutRealism} ${hotLine} ${CAMERA}. ${REALISM_BASE}.`;
      return wrapWithSilhouette(enhanced);
    },
  },
  {
    id: "D-hybrid",
    label: "Hybrid (selective realism + gorgeous language)",
    buildPrompt: (basePrompt, traits) => {
      const isMale = traits.gender?.toLowerCase() === "male";
      const hotLine = isMale
        ? "He is incredibly handsome, the kind of guy that turns heads."
        : "She is incredibly gorgeous, the kind of face that stops you mid-scroll. Absolutely stunning.";
      const withoutRealism = basePrompt.replace(`${CAMERA}. ${REALISM_BASE}.`, "").trim();
      const enhanced = `${withoutRealism} ${hotLine} ${CAMERA}. Visible pores, subtle natural skin texture. Baby hairs catching the light. Photorealistic.`;
      return wrapWithSilhouette(enhanced);
    },
  },
];

const ROLLS = 4;
const OUTPUT_DIR = path.join(__dirname, "output/wizard-prompt-test");

// ─── Generation ──────────────────────────────────────

async function generateOne(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.data
    );
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
      return true;
    }
    const reason = response.candidates?.[0]?.finishReason || "unknown";
    console.log(`      filtered (${reason})`);
    return false;
  } catch (e: any) {
    console.log(`      error: ${e.message?.substring(0, 80)}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const totalImages = CREATORS.length * strategies.length * ROLLS;
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DEFINITIVE WIZARD PROMPT A/B TEST");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Creators: ${CREATORS.map((c) => c.name).join(", ")}`);
  console.log(`  Strategies: ${strategies.length} (A/B/C/D)`);
  console.log(`  Rolls per combo: ${ROLLS}`);
  console.log(`  Total images: ${totalImages}`);
  console.log(`  Model: ${IMAGE_MODEL}`);
  console.log(`  Pipeline: buildWizardPrompt() → wrapWithSilhouette() → generate`);
  console.log(`  This is EXACTLY how the app generates wizard images.`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const results: Record<string, Record<string, { generated: number; filtered: number }>> = {};

  for (const creator of CREATORS) {
    console.log(`\n╔══ ${creator.name.toUpperCase()} ══╗`);

    // Build the base prompt using the ACTUAL app function
    const basePrompt = buildWizardPrompt(creator.traits);
    console.log(`  Base prompt: ${basePrompt.substring(0, 80)}...`);

    results[creator.name] = {};

    for (const strategy of strategies) {
      const fullPrompt = strategy.buildPrompt(basePrompt, creator.traits);
      const dir = path.join(OUTPUT_DIR, creator.name, strategy.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "prompt.txt"), fullPrompt);

      console.log(`\n  ${strategy.id}: ${strategy.label}`);

      // Generate all rolls in parallel (same as the app does)
      const rollResults = await Promise.all(
        Array.from({ length: ROLLS }, (_, i) =>
          generateOne(fullPrompt, path.join(dir, `roll-${i + 1}.jpg`)).then((ok) => {
            console.log(`    ${ok ? "✓" : "✗"} roll-${i + 1}`);
            return ok;
          })
        )
      );

      const generated = rollResults.filter(Boolean).length;
      const filtered = ROLLS - generated;
      results[creator.name][strategy.id] = { generated, filtered };
      console.log(`    ${generated}/${ROLLS} generated`);
    }
  }

  // ─── Summary Table ─────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("Generation success rate (generated/total):\n");
  const header = ["Creator", ...strategies.map((s) => s.id)];
  console.log(`  ${header.join(" | ")}`);
  console.log(`  ${header.map((h) => "-".repeat(h.length)).join(" | ")}`);

  for (const creator of CREATORS) {
    const row = [
      creator.name.padEnd(10),
      ...strategies.map((s) => {
        const r = results[creator.name][s.id];
        return `${r.generated}/${ROLLS}`.padEnd(s.id.length);
      }),
    ];
    console.log(`  ${row.join(" | ")}`);
  }

  // Totals
  const totals = strategies.map((s) => {
    let gen = 0;
    let tot = 0;
    for (const creator of CREATORS) {
      gen += results[creator.name][s.id].generated;
      tot += ROLLS;
    }
    return { id: s.id, generated: gen, total: tot };
  });

  console.log(`  ${"TOTAL".padEnd(10)} | ${totals.map((t) => `${t.generated}/${t.total}`.padEnd(t.id.length)).join(" | ")}`);

  // ─── Write summary to file ─────────────────────────
  const summaryLines = [
    "# Wizard Prompt A/B Test Results\n",
    `Date: ${new Date().toISOString().split("T")[0]}`,
    `Model: ${IMAGE_MODEL}`,
    `Pipeline: buildWizardPrompt() → wrapWithSilhouette() → generate (EXACT app flow)`,
    `Rolls per combo: ${ROLLS}`,
    `Total images: ${totalImages}\n`,
    "## Strategies",
    ...strategies.map((s) => `- **${s.id}**: ${s.label}`),
    "\n## Creators",
    ...CREATORS.map((c) => `- **${c.name}**: ${c.traits.ethnicity} ${c.traits.gender}, ${c.traits.build}, chest=${c.traits.chestSize || "N/A"}, vibes=[${c.traits.vibes.join(", ")}]`),
    "\n## Generation Success Rate\n",
    `| Creator | ${strategies.map((s) => s.id).join(" | ")} |`,
    `| --- | ${strategies.map(() => "---").join(" | ")} |`,
    ...CREATORS.map((c) => `| ${c.name} | ${strategies.map((s) => `${results[c.name][s.id].generated}/${ROLLS}`).join(" | ")} |`),
    `| **TOTAL** | ${totals.map((t) => `**${t.generated}/${t.total}**`).join(" | ")} |`,
    "\n## Evaluation\n",
    "Browse each creator's folders and score on:",
    "1. **Face Realism** (1-5): Does the face look AI or human?",
    "2. **Attractiveness** (1-5): Is she/he hot?",
    "3. **Body Accuracy** (1-5): Did chest/build match the prompt?",
    "4. **Roll Consistency** (1-5): Do the 4 rolls look similar (even without face ref)?",
    "5. **Background** (1-5): Clean white studio? Or hallucinated scene?",
    "6. **Composition** (1-5): Proper silhouette framing? Waist-up crop?",
    "\n## Verdict\n",
    "Winner: ___",
    "Reasoning: ___",
  ];

  fs.writeFileSync(path.join(OUTPUT_DIR, "RESULTS.md"), summaryLines.join("\n"));

  console.log(`\n\nOutput: ${OUTPUT_DIR}`);
  console.log("Browse each creator → strategy → rolls for comparison");

  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
