#!/usr/bin/env npx tsx
/**
 * Sienna's feed v2 — face ref only, no scene refs.
 * Let the model generate person + environment together for cohesive results.
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

const OUTPUT_DIR = path.join(__dirname, "output/sienna-feed-v2");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Face ref only — describe the scene, let model generate everything cohesively
const shots = [
  {
    id: "01-bedroom-selfie",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a close-up selfie lying in bed with white sheets. Messy morning hair, wearing a thin white tank top, soft sleepy expression with a slight smile. Warm morning sunlight on her face. Shot on iPhone front camera, very close. Visible pores, photorealistic.",
  },
  {
    id: "02-mirror-bodycheck",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a full-body mirror selfie in a modern bathroom. Wearing a matching gray sports bra and shorts, holding phone up, hip slightly popped. Clean bright bathroom, natural lighting. Shot on iPhone, mirror selfie. Visible pores, photorealistic.",
  },
  {
    id: "03-couch-oversized",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman curled up on a couch in an oversized hoodie and long socks, no pants. Holding her phone, legs tucked up, looking at camera with a relaxed flirty smile. Cozy living room, warm lighting, evening vibes. Shot on iPhone, candid. Visible pores, photorealistic.",
  },
  {
    id: "04-getting-ready",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting at a vanity doing her makeup, getting ready to go out. Wearing a silk robe. Hair half done, leaning toward the mirror, focused expression. Soft warm bathroom lighting. Shot on iPhone, candid behind-the-scenes. Visible pores, photorealistic.",
  },
  {
    id: "05-night-out-dress",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman standing in a bedroom wearing a tight short black dress and heels, checking herself out. Confident expression, about to go out. Evening lighting, apartment background. Shot on iPhone, full body. Visible pores, photorealistic.",
  },
  {
    id: "06-pool-day",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting by a pool on a sunny day, feet dangling in the water. Wearing a white swimsuit, wet hair slicked back, sun-kissed glowing skin, relaxed happy expression. Bright tropical day. Shot on iPhone, candid. Visible pores, photorealistic.",
  },
  {
    id: "07-car-selfie",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a selfie in the drivers seat of a car. Wearing sunglasses pushed up on her head, a low-cut top, golden hour light coming through the window. Pouty lips, looking directly at the phone camera. Shot on iPhone front camera. Visible pores, photorealistic.",
  },
  {
    id: "08-sunset-balcony",
    prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman leaning on a balcony railing at golden hour, city skyline behind her. Wearing a sundress, wind in her hair, looking back at camera. Warm golden sunset light on her skin. Shot on iPhone, candid. Visible pores, photorealistic.",
  },
];

async function generateShot(shot: typeof shots[0]): Promise<void> {
  console.log(`  ${shot.id}...`);

  try {
    const response = await ai.models.generateContent({
      model: NBPRO,
      contents: [
        { text: shot.prompt },
        { inlineData: { mimeType: "image/jpeg", data: faceRefBase64 } },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${shot.id}.jpg`),
        Buffer.from(imagePart.inlineData.data, "base64")
      );
      console.log(`  ✓ ${shot.id}`);
    } else {
      console.log(`  ✗ ${shot.id} — filtered (${response.candidates?.[0]?.finishReason})`);
    }
  } catch (e: any) {
    console.log(`  ✗ ${shot.id} — ${e.message}`);
  }
}

async function main() {
  console.log("Sienna's Feed v2 — face ref only, no scene refs");
  console.log("─".repeat(50));

  for (const shot of shots) {
    await generateShot(shot);
  }

  console.log(`\nDone! ${OUTPUT_DIR}`);
  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
