#!/usr/bin/env npx tsx
/**
 * Marcus — men's fitness/OFM creator @marcusfits
 * Athletic Black male, grooming, shirtless gym, thirst traps
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

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
const mode = process.argv[2] || "base";

// Marcus — Black male, muscular, handsome, groomed
const wizardPrompt = "Confident attractive 26-year-old Black man, muscular build with broad shoulders and defined chest. Short fade haircut, dark brown eyes, strong jawline, trimmed beard, rich dark brown skin. Shirtless, wearing dark joggers. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

const prompt = [
  "Composition: The reference image is a layout template.",
  "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
  "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
  "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
  "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
  `Subject: Replace the gray silhouette with a real photorealistic person. ${wizardPrompt}`,
].join("\n");

async function gen(index: number, outputDir: string, contents: any[]): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL, contents,
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(path.join(outputDir, `image-${index}.jpg`), Buffer.from(imagePart.inlineData.data, "base64"));
      console.log(`  ✓ image-${index}`);
    } else { console.log(`  ✗ image-${index} — filtered (${response.candidates?.[0]?.finishReason})`); }
  } catch (e: any) { console.log(`  ✗ image-${index} — ${e.message}`); }
}

async function runBase() {
  const outputDir = path.join(__dirname, "output/marcus-base");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
  console.log("Marcus — wizard base (4 rolls)");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: prompt }, { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
  ])));
  console.log(`\nPick best: ${outputDir}`);
  const { execSync } = await import("child_process"); execSync(`open "${outputDir}"`);
}

async function runVariations() {
  const refPath = path.join(__dirname, "output/marcus-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best to marcus-base/image-PICK.jpg"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/marcus-variations");
  fs.mkdirSync(outputDir, { recursive: true });
  const varPrompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact man from image 2. Shirtless, wearing dark joggers. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";
  console.log("Marcus — variations with face ref");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: varPrompt }, { inlineData: { mimeType: "image/jpeg", data: templateBase64 } }, { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
  ])));
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process"); execSync(`open "${outputDir}"`);
}

async function runFeed() {
  const refPath = path.join(__dirname, "output/marcus-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best to marcus-base/image-PICK.jpg"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/marcus-feed");
  fs.mkdirSync(outputDir, { recursive: true });

  const shots = [
    { id: "01-gym-mirror", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man taking a shirtless mirror selfie at the gym, post-workout pump. Muscular chest and arms on display, slight sweat. He looks incredible. Dumbbells and machines in mirror, gym lighting. iPhone mirror selfie. Visible pores, photorealistic." },
    { id: "02-morning-routine", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man in a bathroom, shirtless, doing his skincare routine. Trimmed beard looks fresh, applying moisturizer. He looks handsome. Clean modern bathroom, grooming products on counter. iPhone front camera selfie, close up. Visible pores, photorealistic." },
    { id: "03-outfit-check", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man taking a mirror selfie showing off his outfit. Wearing a fitted black t-shirt and jeans, fresh sneakers. He looks sharp and attractive. Bedroom mirror, clean apartment. iPhone mirror selfie. Visible pores, photorealistic." },
    { id: "04-cooking", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man in a kitchen meal prepping, wearing a fitted tank top. Muscular arms visible, chopping vegetables. He looks great. Modern kitchen with containers, food on counter. iPhone rear camera, someone took this candid. Visible pores, photorealistic." },
    { id: "05-car-selfie", prompt: "The reference image shows the person to recreate — same face, same body, same everything. Close-up selfie of that exact man in a car, wearing a fitted polo, fresh haircut, sunglasses pushed up. He looks handsome. Steering wheel visible, natural light through windshield. iPhone front camera. Visible pores, photorealistic." },
    { id: "06-post-workout", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man sitting on a gym bench, towel around neck, drinking from a shaker bottle. Wearing a tank top showing muscular arms. He looks great. Gym equipment in background, bright lighting. iPhone rear camera, training partner took this. Visible pores, photorealistic." },
    { id: "07-couch-chill", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man lounging on a couch shirtless in gray sweatpants, watching TV. Muscular build on display, relaxed expression. He looks attractive. Living room, evening lamp light, remote on cushion. iPhone front camera selfie. Visible pores, photorealistic." },
    { id: "08-outdoor-run", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact man pausing during an outdoor run, wearing a fitted running tank. Muscular arms, slight sweat, confident expression. He looks great. Park path, morning light, trees. iPhone rear camera, candid. Visible pores, photorealistic." },
  ];

  console.log("Marcus's Feed — men's fitness/grooming content");
  console.log("─".repeat(50));
  for (const shot of shots) {
    console.log(`  ${shot.id}...`);
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ text: shot.prompt }, { inlineData: { mimeType: "image/jpeg", data: refBase64 } }],
        config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        fs.writeFileSync(path.join(outputDir, `${shot.id}.jpg`), Buffer.from(imagePart.inlineData.data, "base64"));
        console.log(`  ✓ ${shot.id}`);
      } else { console.log(`  ✗ ${shot.id} — filtered (${response.candidates?.[0]?.finishReason})`); }
    } catch (e: any) { console.log(`  ✗ ${shot.id} — ${e.message}`); }
  }
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process"); execSync(`open "${outputDir}"`);
}

async function main() {
  if (mode === "feed") await runFeed();
  else if (mode === "variations") await runVariations();
  else await runBase();
}
main().catch(console.error);
