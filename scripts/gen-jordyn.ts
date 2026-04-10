#!/usr/bin/env npx tsx
/**
 * Jordyn — fashion/nightlife creator @jordynxo
 * Visually distinct from Sienna (brunette) and Valentina (blonde)
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

const mode = process.argv[2] || "base"; // "base", "variations", or "feed"

// Jordyn — Mixed/Black, curly hair, fashion-forward, nightlife energy
// Completely different look from Sienna and Valentina
const wizardPrompt = "Sexy confident fierce 22-year-old mixed Black woman, large C-cup breasts with visible cleavage, chest filling the sports bra. Slim build with narrow waist and long legs. Long curly dark hair with honey highlights, hazel-brown eyes, full pouty lips, rich caramel brown skin. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

const prompt = [
  "Composition: The reference image is a layout template.",
  "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
  "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
  "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
  "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.",
  "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
  `Subject: Replace the gray silhouette with a real photorealistic person. ${wizardPrompt}`,
].join("\n");

async function gen(index: number, outputDir: string, genPrompt: string, contents: any[]): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
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
  const outputDir = path.join(__dirname, "output/jordyn-base");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);

  console.log("Jordyn — wizard base generation (4 rolls, pick best face)");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i =>
    gen(i, outputDir, prompt, [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
    ])
  ));
  console.log(`\nPick the best face: ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function runVariations() {
  const refPath = path.join(__dirname, "output/jordyn-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) {
    console.log("First pick the best base image and copy it to jordyn-base/image-PICK.jpg");
    return;
  }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/jordyn-variations");
  fs.mkdirSync(outputDir, { recursive: true });

  const varPrompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

  console.log("Jordyn — variations with locked face ref");
  console.log("─".repeat(50));
  await Promise.all([1, 2, 3, 4].map(i =>
    gen(i, outputDir, varPrompt, [
      { text: varPrompt },
      { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
      { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
    ])
  ));
  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function runFeed() {
  const refPath = path.join(__dirname, "output/jordyn-base/image-PICK.jpg");
  if (!fs.existsSync(refPath)) {
    console.log("First pick the best base image and copy it to jordyn-base/image-PICK.jpg");
    return;
  }
  const refBase64 = fs.readFileSync(refPath).toString("base64");
  const outputDir = path.join(__dirname, "output/jordyn-feed");
  fs.mkdirSync(outputDir, { recursive: true });

  // Jordyn's feed — fashion/nightlife creator content
  const shots = [
    {
      id: "01-ootd-mirror",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a full-length mirror selfie showing off her outfit. Wearing a tight mini dress and strappy heels, clutch in hand, about to go out. She looks absolutely stunning. Bedroom with warm lighting, mirror leaning against wall. iPhone mirror selfie, off-center. Visible pores, photorealistic.",
    },
    {
      id: "02-glam-selfie",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. Close-up selfie of that exact woman after getting glammed up. Full makeup, lashes, glossy lips, gold hoop earrings. Wearing a low-cut going out top. She looks gorgeous. Bathroom vanity with makeup products visible. iPhone front camera selfie, warm lighting. Visible pores, photorealistic.",
    },
    {
      id: "03-brunch",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman at a trendy brunch spot, mimosa on the table. Wearing a cute crop top and high-waisted jeans, sunglasses pushed up on her head. She looks incredible. Restaurant patio, plants, natural sunlight. iPhone rear camera, natural depth. Visible pores, photorealistic.",
    },
    {
      id: "04-shopping",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a mirror selfie in a clothing store fitting room. Trying on a sexy bodycon dress, checking herself out. She looks like a smoke show. Fitting room with multiple mirrors, clothes hanging on hooks. iPhone mirror selfie. Visible pores, photorealistic.",
    },
    {
      id: "05-car-arrive",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting in the backseat of a car, dressed up for a night out. Tight dress, heels, clutch. She looks gorgeous. Taking a selfie with city lights blurred through the window behind her. iPhone front camera, warm interior light mixed with cool city glow. Visible pores, photorealistic.",
    },
    {
      id: "06-lazy-morning",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman lounging in bed scrolling her phone, morning after going out. Wearing an oversized band tee, messy curls, no makeup, still looks beautiful. Messy bed, water glass on nightstand, morning light through blinds. iPhone front camera selfie, close up. Visible pores, photorealistic.",
    },
    {
      id: "07-rooftop",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman on a rooftop bar at golden hour, city skyline behind her. Wearing a chic fitted top and tailored pants, drink in hand. She looks absolutely stunning. Golden warm light on her skin, city buildings out of focus behind. iPhone rear camera, someone else took this. Visible pores, photorealistic.",
    },
    {
      id: "08-getting-ready",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman doing her hair with a curling iron, getting ready to go out. Wearing just a bra and jeans, stomach visible. She looks gorgeous. Bathroom counter with hair products, straightener, makeup scattered. iPhone propped up taking a video-style still. Warm bathroom light. Visible pores, photorealistic.",
    },
  ];

  console.log("Jordyn's Feed — fashion/nightlife content");
  console.log("─".repeat(50));

  for (const shot of shots) {
    console.log(`  ${shot.id}...`);
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [
          { text: shot.prompt },
          { inlineData: { mimeType: "image/jpeg", data: refBase64 } },
        ],
        config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        fs.writeFileSync(path.join(outputDir, `${shot.id}.jpg`), Buffer.from(imagePart.inlineData.data, "base64"));
        console.log(`  ✓ ${shot.id}`);
      } else {
        console.log(`  ✗ ${shot.id} — filtered (${response.candidates?.[0]?.finishReason})`);
      }
    } catch (e: any) {
      console.log(`  ✗ ${shot.id} — ${e.message}`);
    }
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
