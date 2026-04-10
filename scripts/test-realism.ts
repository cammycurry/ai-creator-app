#!/usr/bin/env npx tsx
/**
 * A/B/C Test: Current vs Full Realism vs Hybrid (hot girl + real environment)
 * Same creator (Sienna), same 3 scenes.
 * C = the hybrid: gorgeous girl + realistic environment/camera/lighting
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const NBPRO = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const FACE_REF = path.join(__dirname, "output/sienna-v3/image-3.jpg");
const faceRefBase64 = fs.readFileSync(FACE_REF).toString("base64");

const OUTPUT_DIR = path.join(__dirname, "output/realism-abc-test");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══ BEDROOM SELFIE ═══

const bedroom_A = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a close-up selfie lying in bed with white sheets. Messy morning hair, wearing a thin white tank top, soft sleepy expression with a slight smile. Warm morning sunlight on her face. Shot on iPhone, candid. Visible pores, photorealistic.`;

const bedroom_C = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a close-up selfie lying in bed. She looks absolutely gorgeous — messy morning hair, wearing a thin white tank top, soft sultry sleepy expression with a slight smile. Flawless glowing skin, full lips, beautiful eyes.

ENVIRONMENT: Unmade bed with rumpled white sheets. Phone charger cable on nightstand, water bottle, morning sunlight streaming through sheer curtains casting warm stripes across the bed.

CAMERA: iPhone front camera selfie. Off-center composition — face in upper third. Phone held above at arm's length. Warm morning color cast from window light.

REALISM: Visible skin pores. Baby hairs at temples catching the morning backlight. Fabric texture visible in tank top and sheet wrinkles. Slight motion blur on hand holding phone. Stray hair across pillow.

She looks stunning. Visible pores, photorealistic.`;

// ═══ MIRROR SELFIE ═══

const mirror_A = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a full-body mirror selfie in a modern bathroom. Wearing a matching gray sports bra and shorts, holding phone up, hip slightly popped. Clean bright bathroom, natural lighting. Shot on iPhone, mirror selfie. Visible pores, photorealistic.`;

const mirror_C = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a full-body mirror selfie in a bathroom. Wearing a matching gray sports bra and shorts, body looks incredible — toned, slim waist, chest filling the sports bra. Hip slightly popped, holding phone up with one hand. Confident sexy expression.

ENVIRONMENT: Modern bathroom mirror with visible edge. Toothbrush holder on counter, towel hanging on hook behind her. Tile floor, bathmat visible. Small product bottles on counter.

CAMERA: iPhone rear camera in mirror. Slight camera tilt. Mirror edge visible in frame. Bright overhead bathroom light mixed with natural window light from side.

REALISM: Fabric texture on sports bra — visible elastic band, compression wrinkles where body bends. Hair tie on wrist. Environmental clutter on bathroom counter. Stray hairs catching overhead light.

She looks like an absolute smoke show. Visible pores, photorealistic.`;

// ═══ COUCH SELFIE ═══

const couch_A = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up on a couch in an oversized hoodie and long socks, no pants. Holding her phone, legs tucked up, looking at camera with a relaxed flirty smile. Cozy living room, warm lighting, evening vibes. Shot on iPhone, candid. Visible pores, photorealistic.`;

const couch_C = `The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up on a couch in an oversized gray hoodie and long socks, no pants visible. Legs tucked up showing bare thighs. Looking at camera with a relaxed flirty gorgeous smile. She looks incredibly cute and sexy in a cozy effortless way.

ENVIRONMENT: Living room couch with throw blanket bunched to one side. TV remote on cushion next to her. Lamp glow in background. Phone charger cable trailing off couch arm. Wine glass on coffee table.

CAMERA: iPhone front camera selfie. Close-up angle, phone held at arm's length slightly above. Face fills upper portion, hoodie and legs in lower half. Warm lamp light from one side, cooler ambient from the other.

REALISM: Hoodie fabric texture — visible cotton weave, slightly oversized draping. Sock fabric stretched. Stray hairs catching lamp backlight. Environmental objects scattered naturally — not staged.

She looks gorgeous. Visible pores, photorealistic.`;

const tests = [
  { scene: "bedroom", A: bedroom_A, C: bedroom_C },
  { scene: "mirror", A: mirror_A, C: mirror_C },
  { scene: "couch", A: couch_A, C: couch_C },
];

async function generate(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: NBPRO,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: faceRefBase64 } },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
      return true;
    }
    console.log(`    filtered (${response.candidates?.[0]?.finishReason})`);
    return false;
  } catch (e: any) {
    console.log(`    error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("═══ A/C Test: Current vs Hybrid (hot girl + real room) ═══");
  console.log("A = current style, C = hybrid (gorgeous + environment realism)");
  console.log("─".repeat(60));

  for (const test of tests) {
    console.log(`\n${test.scene}:`);

    fs.writeFileSync(path.join(OUTPUT_DIR, `${test.scene}-A-prompt.txt`), test.A);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${test.scene}-C-prompt.txt`), test.C);

    const [a, c] = await Promise.all([
      generate(test.A, path.join(OUTPUT_DIR, `${test.scene}-A-current.jpg`)).then(ok => { if (ok) console.log(`  ✓ A (current)`); return ok; }),
      generate(test.C, path.join(OUTPUT_DIR, `${test.scene}-C-hybrid.jpg`)).then(ok => { if (ok) console.log(`  ✓ C (hybrid)`); return ok; }),
    ]);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Done! A = current, C = hybrid`);
  console.log(`Compare: ${OUTPUT_DIR}`);
  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
