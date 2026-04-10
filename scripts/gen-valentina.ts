#!/usr/bin/env npx tsx
/**
 * Valentina — generate variations with locked face ref, then feed content
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

// Valentina's locked face reference
const FACE_REF = path.join(__dirname, "output/valentina-base-v2/image-1.jpg");
const faceRefBase64 = fs.readFileSync(FACE_REF).toString("base64");

const mode = process.argv[2] || "variations"; // "variations" or "feed"

async function generateOne(prompt: string, outputPath: string): Promise<void> {
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
      console.log(`  ✓ ${path.basename(outputPath)}`);
    } else {
      console.log(`  ✗ ${path.basename(outputPath)} — filtered (${response.candidates?.[0]?.finishReason})`);
    }
  } catch (e: any) {
    console.log(`  ✗ ${path.basename(outputPath)} — ${e.message}`);
  }
}

async function runVariations() {
  const TEMPLATE_PATH = path.join(__dirname, "../src/assets/composition-template.jpg");
  const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
  const outputDir = path.join(__dirname, "output/valentina-variations");
  fs.mkdirSync(outputDir, { recursive: true });

  // Exact buildVariationPrompt() from prompts.ts
  const prompt = "Image 1 is a composition template — match its framing and crop. Image 2 shows the person to recreate. That exact woman from image 2, wearing a tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.";

  console.log("Valentina — variations with locked face ref");
  console.log("─".repeat(50));

  await Promise.all([1, 2, 3, 4].map(async (i) => {
    try {
      const response = await ai.models.generateContent({
        model: NBPRO,
        contents: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
          { inlineData: { mimeType: "image/jpeg", data: faceRefBase64 } },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          safetySettings: SAFETY_OFF,
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        fs.writeFileSync(path.join(outputDir, `image-${i}.jpg`), Buffer.from(imagePart.inlineData.data, "base64"));
        console.log(`  ✓ image-${i}`);
      } else {
        console.log(`  ✗ image-${i} — filtered`);
      }
    } catch (e: any) {
      console.log(`  ✗ image-${i} — ${e.message}`);
    }
  }));

  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function runFeed() {
  const outputDir = path.join(__dirname, "output/valentina-feed");
  fs.mkdirSync(outputDir, { recursive: true });

  // Valentina's Instagram feed — fitness creator content
  const shots = [
    {
      id: "01-gym-mirror-selfie",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a mirror selfie in a modern gym. Wearing a tight black sports bra and high-waisted gray leggings, slightly sweaty, post-workout glow, holding phone up, confident smile. Dumbbells and machines visible in mirror behind her. Shot on iPhone, mirror selfie. Visible pores, photorealistic.",
    },
    {
      id: "02-post-workout",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman sitting on a gym bench after a workout, wiping sweat with a towel around her neck. Wearing a matching purple sports set, hair in a messy ponytail, flushed cheeks, satisfied expression. Bright gym lighting. Shot on iPhone, candid. Visible pores, photorealistic.",
    },
    {
      id: "03-protein-shake",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman in a kitchen holding a protein shake blender bottle, taking a selfie. Wearing a cropped tank top and leggings, toned stomach visible. Clean modern kitchen background. Morning light. Shot on iPhone, candid. Visible pores, photorealistic.",
    },
    {
      id: "04-activewear-ootd",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman standing in front of a full-length mirror showing off a new activewear set. Matching teal sports bra and biker shorts, toned athletic body. Bedroom with good natural light. Shot on iPhone, full body mirror selfie. Visible pores, photorealistic.",
    },
    {
      id: "05-outdoor-run",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman pausing during an outdoor run in a park. Wearing a running tank and shorts, airpods in, slightly out of breath, morning sun in her hair. Trees and path behind her. Shot on iPhone, candid. Visible pores, photorealistic.",
    },
    {
      id: "06-yoga-stretch",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman doing a yoga stretch on a mat in a bright living room. Wearing a matching sports set, hair in a bun, focused calm expression. Sunlight streaming in from a window. Shot on iPhone, candid. Visible pores, photorealistic.",
    },
    {
      id: "07-rest-day-selfie",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a close-up selfie on the couch on a rest day. Wearing an oversized gym hoodie, hair down, relaxed no-makeup look, holding phone close. Cozy apartment vibes. Shot on iPhone front camera, close up. Visible pores, photorealistic.",
    },
    {
      id: "08-progress-pic",
      prompt: "The reference image shows the person to recreate — same face, same body, same everything. That exact woman taking a bathroom mirror progress pic. Wearing just a sports bra and shorts, showing off toned abs and arms. Flexing slightly, proud confident expression. Clean bright bathroom. Shot on iPhone, mirror selfie. Visible pores, photorealistic.",
    },
  ];

  console.log("Valentina's Feed — fitness creator content");
  console.log("─".repeat(50));

  for (const shot of shots) {
    console.log(`  ${shot.id}...`);
    await generateOne(shot.prompt, path.join(outputDir, `${shot.id}.jpg`));
  }

  console.log(`\nDone! ${outputDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outputDir}"`);
}

async function main() {
  if (mode === "feed") {
    await runFeed();
  } else {
    await runVariations();
  }
}

main().catch(console.error);
