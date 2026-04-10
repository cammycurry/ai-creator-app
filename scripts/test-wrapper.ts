import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
const templateRef = { mimeType: "image/jpeg", data: templateBase64 };

const PERSON = `Sexy confident 23-year-old European woman, fair light skin, blonde long wavy hair, blue eyes, full lips. Athletic build. tight white sports bra. Canon EOS R5. Visible pores, light freckles, photorealistic.`;

const WRAPPERS = {
  v2: [
    "The reference image is a composition template — a gray silhouette on a white background.",
    "Match the exact framing, pose, crop, and body position of the silhouette.",
    "Replace the silhouette with a real photorealistic person:",
    PERSON,
  ].join(" "),
  v3: [
    "Composition: The reference image is a layout template.",
    "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
    "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
    `Subject: Replace the gray silhouette with a real photorealistic person. ${PERSON}`,
  ].join("\n"),
};

async function gen(prompt: string): Promise<Buffer | null> {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [{ text: prompt }, { inlineData: templateRef }],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    return part?.inlineData?.data ? Buffer.from(part.inlineData.data, "base64") : null;
  } catch (e: any) {
    console.error("  Error:", e.message);
    return null;
  }
}

async function main() {
  const outDir = path.join(process.cwd(), "scripts/output/wrapper-test");
  fs.mkdirSync(outDir, { recursive: true });

  for (const [name, prompt] of Object.entries(WRAPPERS)) {
    console.log(`\n--- ${name.toUpperCase()} WRAPPER ---`);
    console.log(`Prompt: ${prompt.slice(0, 80)}...`);
    fs.writeFileSync(path.join(outDir, `${name}-prompt.txt`), prompt);

    const promises = Array.from({ length: 4 }, (_, i) =>
      gen(prompt).then((buf) => {
        if (buf) {
          fs.writeFileSync(path.join(outDir, `${name}-${i + 1}.jpg`), buf);
          console.log(`  ✓ ${name}-${i + 1}.jpg`);
        } else {
          console.log(`  ✗ ${name}-${i + 1} failed`);
        }
        return buf;
      })
    );
    await Promise.all(promises);
  }

  console.log(`\nDone! ${outDir}`);
  const { execSync } = await import("child_process");
  execSync(`open "${outDir}"`);
}

main().catch(console.error);
