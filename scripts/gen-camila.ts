#!/usr/bin/env npx tsx
/**
 * Camila — travel/bikini creator @camila.vida
 * Latina, sun-kissed, beach/tropical vibes
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

// Camila — Brazilian Latina, long dark wavy hair, warm bronze skin, beach vibes
// Distinct from Sienna (European/green eyes) and Jordyn (Black/curly)
const wizardPrompt = "Sexy confident radiant 24-year-old Brazilian woman, large C-cup breasts with visible cleavage, chest filling the sports bra. Slim toned build with narrow waist, long legs. Long flowing dark wavy hair with natural sun-lightened ends, warm dark brown eyes, full lips with natural pout, deep bronze tan skin. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

const prompt = [
  "Composition: The reference image is a layout template.",
  "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
  "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
  "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
  "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.",
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
  const outputDir = path.join(__dirname, "output/camila-base");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
  console.log("Camila — wizard base (4 rolls)");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: prompt }, { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
  ])));
  console.log(`\nPick best: ${outputDir}`);
  const { execSync } = await import("child_process"); execSync(`open "${outputDir}"`);
}

async function runVariations() {
  const refPath = path.join(__dirname, "output/camila-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best to camila-base/image-PICK.jpg"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/camila-variations");
  fs.mkdirSync(outputDir, { recursive: true });
  const varPrompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";
  console.log("Camila — variations with face ref");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: varPrompt }, { inlineData: { mimeType: "image/jpeg", data: templateBase64 } }, { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
  ])));
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process"); execSync(`open "${outputDir}"`);
}

async function runFeed() {
  const refPath = path.join(__dirname, "output/camila-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best to camila-base/image-PICK.jpg"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/camila-feed");
  fs.mkdirSync(outputDir, { recursive: true });

  const shots = [
    { id: "01-beach-walk", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman walking along a tropical beach at golden hour. Wearing a white sundress, barefoot, wind catching her hair. She looks absolutely stunning. Palm trees, warm golden light, gentle waves. iPhone rear camera, candid from slightly behind. Visible pores, photorealistic." },
    { id: "02-pool-selfie", prompt: "The reference image shows the person to recreate — same face, same body, same everything. Close-up selfie of that exact woman by a pool, wet hair slicked back, glowing sun-kissed skin. Wearing a white swimsuit top. She looks gorgeous. Pool water sparkling, tropical plants behind her. iPhone front camera, close up. Visible pores, photorealistic." },
    { id: "03-resort-balcony", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman leaning on a resort balcony railing, ocean view behind her. Wearing a flowy cover-up over swimwear, tropical drink in hand. She looks stunning. Blue ocean, palm trees, golden hour. iPhone rear camera, someone took this. Visible pores, photorealistic." },
    { id: "04-boat-day", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting on the edge of a boat, ocean behind her. Wearing a sundress, sunglasses on head, hair blowing in the wind. She looks incredible. Blue water, sunny day, nautical ropes visible. iPhone rear camera, candid. Visible pores, photorealistic." },
    { id: "05-street-market", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman browsing a colorful street market abroad. Wearing a crop top and linen pants, straw bag over shoulder. She looks gorgeous. Vibrant market stalls, fruit, textiles, warm natural light. iPhone rear camera, candid from behind at angle. Visible pores, photorealistic." },
    { id: "06-morning-coffee", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman having coffee on a hotel terrace overlooking the ocean. Wearing an oversized white button-down shirt, messy beach hair. She looks beautiful and relaxed. Tropical breakfast spread, ocean in background. iPhone front camera selfie. Visible pores, photorealistic." },
    { id: "07-sunset-silhouette", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman standing at the shoreline at sunset, waves around her ankles. Wearing a sarong wrap, hair blowing. She looks ethereally beautiful. Dramatic orange sunset, silhouette lighting with warm rim light on her skin. iPhone rear camera. Visible pores, photorealistic." },
    { id: "08-hotel-mirror", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a mirror selfie in a nice hotel room before going out. Wearing a fitted summer dress and sandals. She looks absolutely stunning. Hotel room with king bed visible, good lighting, travel bag on floor. iPhone mirror selfie. Visible pores, photorealistic." },
  ];

  console.log("Camila's Feed — travel/bikini content");
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
