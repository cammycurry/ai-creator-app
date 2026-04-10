/**
 * Generate pre-made creators using the EXACT same prompt pipeline as the app wizard.
 * Imports buildWizardPrompt + wrapWithSilhouette from the actual app code.
 *
 * Run: pnpx tsx scripts/seed-from-mix.ts              — generate all from mix
 * Run: pnpx tsx scripts/seed-from-mix.ts 10            — generate first 10
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

// Import the REAL prompt builder from the app — same code the wizard uses
import { buildWizardPrompt, wrapWithSilhouette } from "../src/lib/prompts.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = async (query: string, params?: unknown[]) => (await pool.query(query, params)).rows;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "realinfluencerstorage-media";
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Same composition template the wizard uses
const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
const templateRef = { mimeType: "image/jpeg", data: templateBase64 };

async function uploadToS3(buffer: Buffer, key: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: "image/jpeg" }));
}

async function stripMeta(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality: 95 }).toBuffer();
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Build StudioTraits from a mix spec entry ──
// Maps the mix spec fields to the exact same StudioTraits interface the wizard uses

type CreatorSpec = {
  ethnicity: string;
  gender: string;
  bodyType: string;
  hairColor: string;
  age: [number, number];
  niche: string[];
};

const VIBE_OPTIONS = [
  ["Sexy confident"],
  ["Girl Next Door"],
  ["Glamorous"],
  ["Sultry"],
  ["Fitness"],
  ["Baddie"],
  ["Soft & Sweet"],
  ["Sophisticated"],
  ["Natural Beauty"],
];

const CHEST_OPTIONS_BY_BODY: Record<string, string[]> = {
  "Slim-thick": ["medium-large", "large"],
  "Curvy": ["medium-large", "large"],
  "Athletic": ["medium", "medium-large"],
  "Slim": ["small", "medium"],
  "Petite": ["small", "medium"],
  "Muscular": [],
};

const BUILD_MAP: Record<string, string> = {
  "Slim-thick": "slim thick",
  "Curvy": "full figure",
  "Athletic": "athletic",
  "Slim": "slim",
  "Petite": "slim",
  "Muscular": "muscular",
};

function specToTraits(spec: CreatorSpec): {
  gender: string | null;
  age: string | null;
  ethnicity: string | null;
  build: string | null;
  chestSize: string | null;
  vibes: string[];
} {
  const age = spec.age[0] + Math.floor(Math.random() * (spec.age[1] - spec.age[0] + 1));
  const vibes = pick(VIBE_OPTIONS);
  const build = BUILD_MAP[spec.bodyType] || "athletic";
  const chestOptions = CHEST_OPTIONS_BY_BODY[spec.bodyType] || ["medium"];
  const chestSize = spec.gender === "Male" ? null : pick(chestOptions);

  return {
    gender: spec.gender === "Male" ? "Male" : "Female",
    age: String(age),
    ethnicity: spec.ethnicity,
    build,
    chestSize,
    vibes,
  };
}

// ── Generate using the exact wizard pipeline ──

async function generateCreator(prompt: string): Promise<Buffer | null> {
  const wrapped = wrapWithSilhouette(prompt);
  try {
    const res = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ text: wrapped }, { inlineData: templateRef }],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const part = res.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (part?.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
  } catch (e) {
    console.error("  Gen failed:", (e as Error).message?.substring(0, 80));
  }
  return null;
}

// ── Main ──

async function main() {
  const limit = parseInt(process.argv[2] || "30");
  const mix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/creator-mix.json"), "utf-8"));

  // Expand mix into individual specs
  const specs: CreatorSpec[] = [];
  for (const entry of mix.creators) {
    for (let i = 0; i < entry.count; i++) {
      specs.push(entry);
    }
  }

  const toGenerate = specs.slice(0, limit);
  console.log(`\n🎨 Generating ${toGenerate.length} creators using the real wizard prompt pipeline\n`);

  let success = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const spec = toGenerate[i];
    const label = `${spec.gender} ${spec.ethnicity} ${spec.bodyType} [${spec.niche.join("/")}]`;
    console.log(`[${i + 1}/${toGenerate.length}] ${label}`);

    // Convert spec to StudioTraits and use the real buildWizardPrompt
    const traits = specToTraits(spec);
    const prompt = buildWizardPrompt(traits);
    console.log(`  📝 ${prompt}`);

    const img = await generateCreator(prompt);
    if (!img) { console.log("  ❌ Failed"); continue; }

    const clean = await stripMeta(img);
    const slug = `${spec.gender.toLowerCase()}-${spec.ethnicity.toLowerCase()}-${spec.bodyType.toLowerCase()}-${Date.now()}`;
    const key = `admin/creators/seed/${slug}.jpg`;
    await uploadToS3(clean, key);

    await sql(`
      INSERT INTO "AdminMedia" (id, "s3Key", source, "mediaType", prompt, "sourceHandle", "pipelineStage", "pipelineOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'seed-mix', 'creator', $2, $3, 'inbox', $4, NOW(), NOW())
      ON CONFLICT ("s3Key") DO NOTHING
    `, [key, prompt, spec.niche.join("/"), i]);

    success++;
    console.log(`  ✅ → ${key}`);

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n🎉 Done! ${toGenerate.length} attempted, ${success} succeeded\n`);
  await pool.end();
}

main().catch(console.error);
