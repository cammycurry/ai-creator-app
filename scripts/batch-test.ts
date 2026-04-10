#!/usr/bin/env npx tsx
/**
 * Batch Prompt Testing — Mass A/B testing
 *
 * Runs a matrix of prompt theories in parallel, each labeled for dashboard comparison.
 * Run: pnpm test:batch
 * Review: pnpm dashboard → compare runs side by side
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const OUTPUT_DIR = path.join(__dirname, "output");
const TEMPLATE_REF = path.join(__dirname, "output/2026-03-21T13-14-53_composition-template/image-2.jpg");

// ─── Test Theories ──────────────────────────────────────

interface Theory {
  label: string;
  prompt: string;
  model: string;
  ref?: string; // path to reference image
  count: number;
}

// The subject we're testing with
const SUBJECT = "25-year-old blonde woman, blue eyes, long wavy hair, thin, large bust";
const REF = TEMPLATE_REF;
const NBP = "gemini-3-pro-image-preview";
const NB2 = "gemini-3.1-flash-image-preview";

// Base instruction for all ref-based tests
const REF_PREFIX = "Replace the gray silhouette in the reference image with a real person:";
const REF_SUFFIX = "Keep the exact same framing, pose, and composition as the silhouette.";

const THEORIES: Theory[] = [
  // ─── A: REF vs NO-REF (control group) ───

  {
    label: "A1-no-ref-simple",
    prompt: `Hot sexy ${SUBJECT} in a white sports bra. Sultry look. White background. Photorealistic.`,
    model: NBP, count: 2,
  },
  {
    label: "A2-ref-simple",
    prompt: `${REF_PREFIX} hot sexy ${SUBJECT} in a white sports bra. Sultry look. Photorealistic. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "A3-no-ref-canon",
    prompt: `Hot sexy ${SUBJECT} in a white sports bra. Sultry look. White background. Canon EOS R5. Visible pores.`,
    model: NBP, count: 2,
  },
  {
    label: "A4-ref-canon",
    prompt: `${REF_PREFIX} hot sexy ${SUBJECT} in a white sports bra. Sultry look. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── B: PROMPT SIMPLICITY (all with ref) ───

  {
    label: "B1-ref-ultra-minimal",
    prompt: `${REF_PREFIX} hot blonde 25yo woman, white sports bra. Photorealistic. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "B2-ref-casual",
    prompt: `${REF_PREFIX} hot sexy thin 25 year old blonde with big tits in a white sports bra. Blue eyes, wavy hair, sultry look. Photorealistic, visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "B3-ref-medium",
    prompt: `${REF_PREFIX} sexy confident ${SUBJECT}, fair skin, full lips, sultry expression. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "B4-ref-full-v2",
    prompt: `${REF_PREFIX} a ${SUBJECT} with fair skin and light freckles, defined cheekbones, full lips, confident sultry expression with subtle catchlights in her eyes. Wearing a fitted white scoop-neck sports bra. Soft diffused studio lighting from camera-left. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field. Natural skin texture with visible pores, photorealistic. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── C: CAMERA SPECS (all with ref) ───

  {
    label: "C1-ref-no-camera",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Photorealistic, visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "C2-ref-canon-only",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "C3-ref-iphone",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Raw iPhone photography. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "C4-ref-full-lens",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Shot on Canon EOS R5, 85mm f/1.4, shallow depth of field. Soft studio lighting from camera-left. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── D: REALISM ANCHORS (all with ref) ───

  {
    label: "D1-ref-no-realism",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Canon EOS R5. Photorealistic. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "D2-ref-pores",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Canon EOS R5. Visible pores, natural skin texture. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "D3-ref-pores-freckles",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Canon EOS R5. Visible pores, light freckles across the nose, catchlights in eyes. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "D4-ref-max-realism",
    prompt: `${REF_PREFIX} sexy ${SUBJECT} in a white sports bra. Sultry expression. Canon EOS R5. Visible pores, light freckles, fine peach fuzz, natural matte skin, subtle under-eye shadows, catchlights in eyes. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── E: EXPRESSION / VIBE (all with ref) ───

  {
    label: "E1-ref-confident",
    prompt: `${REF_PREFIX} gorgeous ${SUBJECT} in a white sports bra. Confident warm expression. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "E2-ref-sultry",
    prompt: `${REF_PREFIX} gorgeous ${SUBJECT} in a white sports bra. Sultry smoldering expression, slightly parted lips, bedroom eyes. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "E3-ref-playful",
    prompt: `${REF_PREFIX} gorgeous ${SUBJECT} in a white sports bra. Playful flirty smile, tilted head. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "E4-ref-fierce",
    prompt: `${REF_PREFIX} gorgeous ${SUBJECT} in a white sports bra. Fierce editorial expression, strong eye contact. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── F: MODEL COMPARISON — NBPro vs NB2 (with ref) ───

  {
    label: "F1-nbpro-ref",
    prompt: `${REF_PREFIX} sexy confident ${SUBJECT}, fair skin, freckles, sultry expression. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "F2-nb2-ref",
    prompt: `${REF_PREFIX} sexy confident ${SUBJECT}, fair skin, freckles, sultry expression. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NB2, ref: REF, count: 2,
  },
  {
    label: "F3-nbpro-ref-simple",
    prompt: `${REF_PREFIX} hot sexy blonde 25yo in a white sports bra. Photorealistic. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "F4-nb2-ref-simple",
    prompt: `${REF_PREFIX} hot sexy blonde 25yo in a white sports bra. Photorealistic. ${REF_SUFFIX}`,
    model: NB2, ref: REF, count: 2,
  },

  // ─── G: BODY CONTROL (all with ref) ───

  {
    label: "G1-ref-no-body-mention",
    prompt: `${REF_PREFIX} sexy 25-year-old blonde woman, blue eyes, wavy hair. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "G2-ref-large-bust",
    prompt: `${REF_PREFIX} sexy 25-year-old blonde woman, blue eyes, wavy hair, very large bust with visible cleavage. Tight white sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "G3-ref-curvy-hourglass",
    prompt: `${REF_PREFIX} voluptuous curvy 25-year-old blonde, blue eyes, wavy hair. Hourglass figure, full bust, narrow waist. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "G4-ref-instagram-fitness",
    prompt: `${REF_PREFIX} 25-year-old blonde who looks like a top Instagram fitness model. Athletic curvy body, prominent bust, tiny waist. White sports bra. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },

  // ─── H: WORD ORDER (all with ref) ───

  {
    label: "H1-ref-face-first",
    prompt: `${REF_PREFIX} beautiful face with striking blue eyes, full lips, defined cheekbones. 25-year-old blonde, long wavy hair. White sports bra. Canon EOS R5. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "H2-ref-body-first",
    prompt: `${REF_PREFIX} sexy thin body with large bust, prominent cleavage in a tight white sports bra. 25-year-old blonde, blue eyes, long wavy hair. Canon EOS R5. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "H3-ref-vibe-first",
    prompt: `${REF_PREFIX} incredibly hot and sexy, seductive sultry bedroom eyes. 25-year-old blonde, blue eyes, wavy hair, white sports bra. Canon EOS R5. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
  {
    label: "H4-ref-clothing-first",
    prompt: `${REF_PREFIX} fitted white scoop-neck sports bra showing cleavage on a sexy 25-year-old blonde, blue eyes, long wavy hair. Sultry look. Canon EOS R5. Visible pores. ${REF_SUFFIX}`,
    model: NBP, ref: REF, count: 2,
  },
];

// ─── Runner ─────────────────────────────────────────────

async function generateImage(
  prompt: string,
  model: string,
  refPath: string | undefined,
  outputDir: string,
  index: number,
): Promise<boolean> {
  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (refPath && fs.existsSync(refPath)) {
    const imgBuffer = fs.readFileSync(refPath);
    const base64 = imgBuffer.toString("base64");
    const ext = path.extname(refPath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    contents.push({ inlineData: { mimeType, data: base64 } });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );

    if (!imagePart?.inlineData?.data) return false;

    const outputPath = path.join(outputDir, `image-${index}.jpg`);
    fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
    return true;
  } catch {
    return false;
  }
}

async function runTheory(theory: Theory): Promise<{ label: string; success: number; total: number }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const outputDir = path.join(OUTPUT_DIR, `${timestamp}_${theory.label}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Save metadata
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), theory.prompt);
  if (theory.ref) {
    fs.writeFileSync(path.join(outputDir, "ref-path.txt"), theory.ref);
  }
  fs.writeFileSync(path.join(outputDir, "model.txt"), theory.model);

  const results = await Promise.all(
    Array.from({ length: theory.count }, (_, i) =>
      generateImage(theory.prompt, theory.model, theory.ref, outputDir, i + 1)
    )
  );

  const success = results.filter(Boolean).length;
  return { label: theory.label, success, total: theory.count };
}

async function main() {
  const args = process.argv.slice(2);

  // Filter by prefix if provided: pnpm test:batch A  (runs only A* theories)
  let theories = THEORIES;
  if (args.length > 0 && !args[0].startsWith("--")) {
    const prefix = args[0].toUpperCase();
    theories = THEORIES.filter(t => t.label.toUpperCase().startsWith(prefix));
    if (theories.length === 0) {
      console.error(`No theories matching prefix "${prefix}"`);
      console.error(`Available prefixes: A, B, C, D, E, F, G, H`);
      process.exit(1);
    }
  }

  const totalImages = theories.reduce((sum, t) => sum + t.count, 0);
  console.log(`\n  Batch Prompt Testing`);
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  Theories: ${theories.length}`);
  console.log(`  Total images: ${totalImages}`);
  console.log(`  Est. cost: ~$${(totalImages * 0.04).toFixed(2)}`);
  console.log(`  ${"─".repeat(50)}\n`);

  // Run theories in batches of 4 to avoid rate limits
  const BATCH_SIZE = 4;
  const allResults: { label: string; success: number; total: number }[] = [];
  const startTime = Date.now();

  for (let i = 0; i < theories.length; i += BATCH_SIZE) {
    const batch = theories.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(theories.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.map(t => t.label).join(", ")}`);

    const results = await Promise.all(batch.map(t => runTheory(t)));
    allResults.push(...results);

    for (const r of results) {
      const status = r.success === r.total ? "✓" : `${r.success}/${r.total}`;
      console.log(`    ${status} ${r.label}`);
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < theories.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const totalSuccess = allResults.reduce((sum, r) => sum + r.success, 0);

  console.log(`\n  ${"─".repeat(50)}`);
  console.log(`  Done! ${totalSuccess}/${totalImages} images in ${elapsed}s`);
  console.log(`  Review: pnpm dashboard → http://localhost:4444`);
  console.log(`  ${"─".repeat(50)}\n`);

  // Print summary grouped by category
  console.log(`  Category Results:`);
  const categories = new Map<string, typeof allResults>();
  for (const r of allResults) {
    const cat = r.label.split("-")[0];
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(r);
  }
  for (const [cat, results] of categories) {
    const catLabels: Record<string, string> = {
      A: "Ref vs No-Ref", B: "Prompt Simplicity", C: "Camera Specs",
      D: "Realism Anchors", E: "Expression/Vibe", F: "NBPro vs NB2",
      G: "Body Control", H: "Word Order",
    };
    console.log(`\n  ${cat}: ${catLabels[cat] || "Unknown"}`);
    for (const r of results) {
      console.log(`    ${r.label}: ${r.success}/${r.total} generated`);
    }
  }
}

main().catch(console.error);
