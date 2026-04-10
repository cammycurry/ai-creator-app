#!/usr/bin/env npx tsx
/**
 * Nara — K-Beauty/Aesthetic creator @narakim_
 * East Asian, soft glam, clean girl, café aesthetic
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

// Nara — Korean, soft glam, dewy skin, elegant
const wizardPrompt = "Sexy elegant gorgeous 23-year-old Korean woman, medium B-cup breasts. Slim petite build with narrow waist. Long straight silky black hair with subtle auburn tint, dark brown almond eyes, soft full lips, flawless porcelain skin with natural dewy glow. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

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
    } else {
      console.log(`  ✗ image-${index} — filtered (${response.candidates?.[0]?.finishReason})`);
    }
  } catch (e: any) {
    console.log(`  ✗ image-${index} — ${e.message}`);
  }
}

async function runBase() {
  const outputDir = path.join(__dirname, "output/nara-base");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
  console.log("Nara — wizard base (4 rolls)");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: prompt },
    { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
  ])));
  console.log(`\nPick best: ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function runVariations() {
  const refPath = path.join(__dirname, "output/nara-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best image to nara-base/image-PICK.jpg first"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/nara-variations");
  fs.mkdirSync(outputDir, { recursive: true });
  const varPrompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";
  console.log("Nara — variations with locked face ref");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i => gen(i, outputDir, [
    { text: varPrompt },
    { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
    { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
  ])));
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function runFeed() {
  const refPath = path.join(__dirname, "output/nara-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) { console.log("Copy best image to nara-base/image-PICK.jpg first"); return; }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/nara-feed");
  fs.mkdirSync(outputDir, { recursive: true });

  const shots = [
    { id: "01-skincare-selfie", prompt: "The reference image shows the person to recreate — same face, same body, same everything. Close-up selfie of that exact woman applying skincare serum, dewy glowing skin, wearing a thin headband pushing hair back. She looks absolutely gorgeous — glass skin, natural beauty. Bathroom counter with skincare products lined up. iPhone front camera selfie, close up, warm bathroom light. Visible pores, photorealistic." },
    { id: "02-cafe-window", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting at a café window, holding a matcha latte. Wearing a cream cashmere sweater, minimal gold jewelry. She looks stunning — soft, elegant, effortless. Cozy café interior, plants on windowsill, natural light. iPhone rear camera, someone across the table took this. Visible pores, photorealistic." },
    { id: "03-mirror-outfit", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a mirror selfie in a minimalist apartment. Wearing a fitted ribbed top and high-waisted trousers, chic and put together. She looks gorgeous. Clean modern apartment, full-length mirror, neutral tones. iPhone mirror selfie. Visible pores, photorealistic." },
    { id: "04-golden-hour", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman walking down a city street at golden hour. Wearing a flowing midi dress, hair catching the warm light. She looks ethereally beautiful. Urban setting, warm golden tones, trees lining the street. iPhone rear camera, candid from behind at an angle. Visible pores, photorealistic." },
    { id: "05-morning-bed", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman lying in bed with white linen sheets, morning light on her face. Wearing a silk camisole, hair spread on pillow, sleepy gorgeous expression. She looks beautiful. Minimalist bedroom, plant on nightstand, soft warm light. iPhone front camera selfie from above. Visible pores, photorealistic." },
    { id: "06-makeup-vanity", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman at a vanity doing soft glam makeup, leaning toward a round mirror. Wearing a silk robe. She looks stunning — halfway through makeup, one eye done. Vanity with Korean beauty products, warm lighting, organized aesthetic setup. iPhone propped up, candid angle. Visible pores, photorealistic." },
    { id: "07-bookshelf", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up reading a book on a window seat. Wearing an oversized knit sweater and cozy socks. She looks gorgeous — intellectual and soft. Bookshelf behind her, fairy lights, warm afternoon light through window. iPhone rear camera, candid. Visible pores, photorealistic." },
    { id: "08-rooftop-sunset", prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman on a rooftop at sunset, city skyline behind her. Wearing a sleek slip dress, hair blowing slightly. She looks absolutely stunning. Golden hour warm light, cocktail glass on railing. iPhone rear camera, someone took this for her. Visible pores, photorealistic." },
  ];

  console.log("Nara's Feed — K-Beauty/aesthetic content");
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
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function main() {
  if (mode === "feed") await runFeed();
  else if (mode === "variations") await runVariations();
  else await runBase();
}
main().catch(console.error);
