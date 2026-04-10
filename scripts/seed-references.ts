/**
 * Seed AI creator base images from classified Instagram reference accounts.
 * Uses silhouette composition template + wizard-format prompts.
 *
 * Run: pnpx tsx scripts/seed-references.ts 10        — 10 unique creators from top accounts
 * Run: pnpx tsx scripts/seed-references.ts 20 2      — 20 creators, up to 2 per account
 * Run: pnpx tsx scripts/seed-references.ts 5 1 jessvibeszz  — 5 from specific account
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = async (query: string, params?: unknown[]) => (await pool.query(query, params)).rows;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY!, baseURL: "https://api.x.ai/v1" });
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "realinfluencerstorage-media";
const IMAGE_MODEL = "gemini-3-pro-image-preview";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const TEMPLATE_PATH = path.join(process.cwd(), "src/assets/composition-template.jpg");
let _templateBase64: string | null = null;
function getTemplate(): { mimeType: string; data: string } {
  if (!_templateBase64) _templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");
  return { mimeType: "image/jpeg", data: _templateBase64 };
}

async function getImageFromS3(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadToS3(buffer: Buffer, key: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: "image/jpeg" }));
}

async function stripMeta(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality: 95 }).toBuffer();
}

// ── Variation engine ──
// Injects randomness so each generation from the same account is unique

const VIBE_VARIATIONS = [
  "Sexy confident", "Fierce stunning", "Dangerously beautiful", "Effortlessly gorgeous",
  "Sultry mysterious", "Warm radiant", "Bold commanding", "Playfully seductive",
];

const AGE_RANGE = [20, 21, 22, 23, 24, 25, 26, 27, 28];

const HAIR_VARIATIONS: Record<string, string[]> = {
  "Blonde": ["platinum blonde", "honey blonde", "dirty blonde", "golden blonde", "ash blonde", "strawberry blonde"],
  "Brunette": ["dark brown", "chestnut", "chocolate brown", "light brown", "caramel brown"],
  "Black": ["jet black", "dark black with blue undertones", "soft black"],
  "Red": ["auburn", "copper red", "fiery red", "dark red"],
  "Auburn": ["auburn", "warm auburn", "dark auburn with red highlights"],
};

const HAIR_STYLES = [
  "long loose waves", "straight hair past shoulders", "messy beach waves",
  "sleek blowout", "long layered waves", "tousled shoulder-length hair",
  "long curly hair", "straight with curtain bangs", "long with soft layers",
];

const CHEST_OPTIONS = [
  { desc: "small A-cup breasts, modest chest", tight: false },
  { desc: "medium B-cup breasts", tight: false },
  { desc: "large C-cup breasts with visible cleavage, chest filling the sports bra", tight: true },
  { desc: "very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra", tight: true },
];

const BUILD_OPTIONS = ["slim", "athletic", "slim with wide hips and narrow waist", "toned", "curvy"];

const EYE_COLORS = ["brown", "hazel", "green", "blue", "dark brown", "light brown", "grey-green"];

const EXPRESSIONS = [
  "confident expression", "warm smile", "intense gaze", "soft smile with parted lips",
  "playful smirk", "relaxed confident look", "direct eye contact with slight smile",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function buildVariedPrompt(account: {
  gender: string | null;
  notes: string | null;
  vibe: string | null;
  niche: string[] | null;
}): string {
  const notes = account.notes || "";
  const ethnicity = notes.match(/Ethnicity: ([^.]+)/)?.[1] || "European";
  const bodyType = (notes.match(/Body: ([^.]+)/)?.[1] || "Athletic").toLowerCase();
  const hairColor = notes.match(/Hair: ([^.]+)/)?.[1] || "Brunette";
  const ageStr = notes.match(/Age: (\d+)-?(\d+)?/);
  const ageMin = parseInt(ageStr?.[1] || "22");
  const ageMax = parseInt(ageStr?.[2] || String(ageMin + 4));

  // Slight variation — stay close to the source characteristics
  const vibe = pick(VIBE_VARIATIONS);
  const age = ageMin + Math.floor(Math.random() * (ageMax - ageMin + 1));
  const hairVariant = pick(HAIR_VARIATIONS[hairColor] || HAIR_VARIATIONS["Brunette"]);
  const hairStyle = pick(HAIR_STYLES);
  const eyes = pick(EYE_COLORS);
  const expression = pick(EXPRESSIONS);

  // Body type stays FAITHFUL to source — only slight variation
  let build: string;
  let chest: typeof CHEST_OPTIONS[number];

  if (bodyType.includes("curvy") || bodyType.includes("slim-thick") || bodyType.includes("thick")) {
    build = pick(["slim with wide hips and narrow waist", "curvy with narrow waist"]);
    chest = pick([CHEST_OPTIONS[2], CHEST_OPTIONS[3]]); // C or DD only
  } else if (bodyType.includes("athletic")) {
    build = pick(["athletic", "toned athletic"]);
    chest = pick([CHEST_OPTIONS[1], CHEST_OPTIONS[2]]); // B or C
  } else if (bodyType.includes("slim") && !bodyType.includes("thick")) {
    build = pick(["slim", "slender"]);
    chest = pick([CHEST_OPTIONS[0], CHEST_OPTIONS[1]]); // A or B
  } else if (bodyType.includes("petite")) {
    build = "petite";
    chest = pick([CHEST_OPTIONS[0], CHEST_OPTIONS[1]]); // A or B
  } else {
    build = pick(BUILD_OPTIONS);
    chest = pick(CHEST_OPTIONS);
  }

  const clothing = chest.tight
    ? "Tight white sports bra and black leggings"
    : "White sports bra and black leggings";

  const isMale = (account.gender || "Female").toLowerCase() === "male";
  if (isMale) {
    return `${vibe} ${age}-year-old ${ethnicity} man, ${hairStyle} ${hairVariant} hair, ${eyes} eyes, ${expression}. ${build} build. Shirtless, wearing dark joggers. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.`;
  }

  return `${vibe} ${age}-year-old ${ethnicity} woman, ${hairStyle} ${hairVariant} hair, ${eyes} eyes, ${expression}. ${build} build, ${chest.desc}. ${clothing}. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic.`;
}

// Use the EXACT same prompt wrapper as the working wizard (src/lib/prompts.ts)
function wrapWithSilhouette(personPrompt: string): string {
  return [
    "Composition: The reference image is a layout template.",
    "It shows a gray featureless silhouette on a white background that defines the exact framing, body position, crop level, and pose.",
    "Strictly match the silhouette's composition — do not change the framing, crop, or body position.",
    "Frame from the top of the head to the belly button ONLY. Crop at the belly button — do not show hips, waist, or anything below.",
    "IMPORTANT: All clothing must be fully visible and covering. No nudity, no exposed underwear, no see-through clothing.",
    "Pose: Front-facing, standing straight, arms relaxed at sides. Face looking directly at camera. Calm, confident, attractive expression.",
    `Subject: Replace the gray silhouette with a real photorealistic person. ${personPrompt}`,
  ].join("\n");
}

// EXACT same call pattern as generateWithRetry in generate-actions.ts:
// contents = [{ text: wrappedPrompt }, { inlineData: templateRef }]
// NO extra reference images — the silhouette template is the ONLY image
async function generateWithTemplate(prompt: string): Promise<Buffer | null> {
  const template = getTemplate();
  const wrappedPrompt = wrapWithSilhouette(prompt);

  try {
    const res = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ text: wrappedPrompt }, { inlineData: template }],
      config: { responseModalities: ["TEXT", "IMAGE"], safetySettings: SAFETY_OFF },
    });
    const part = res.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p.inlineData?.data
    );
    if (part?.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
  } catch (e) {
    console.error("  Gen failed:", (e as Error).message?.substring(0, 100));
  }
  return null;
}

// ── Main ──

async function main() {
  const limit = parseInt(process.argv[2] || "10");
  const perAccount = parseInt(process.argv[3] || "1");
  const filterHandle = process.argv[4] || null;

  console.log(`\n🎨 Generating ${limit} AI creators (up to ${perAccount} per account)${filterHandle ? ` from @${filterHandle}` : ""}\n`);

  const accounts = await sql(`
    SELECT a.id, a.handle, a.followers, a.gender, a.niche, a.vibe, a.name, a."categoryName", a.notes
    FROM "ReferenceAccount" a
    WHERE EXISTS (SELECT 1 FROM "ReferencePost" WHERE "accountId" = a.id AND "mediaType" = 'image')
    ${filterHandle ? `AND a.handle = '${filterHandle}'` : ""}
    ORDER BY a.followers DESC NULLS LAST
  `);

  console.log(`Found ${accounts.length} accounts\n`);

  let done = 0;
  let success = 0;

  for (const account of accounts) {
    if (done >= limit) break;

    const countForThisAccount = Math.min(perAccount, limit - done);

    for (let v = 0; v < countForThisAccount; v++) {
      done++;

      const varLabel = countForThisAccount > 1 ? ` (var ${v + 1}/${countForThisAccount})` : "";
      console.log(`[${done}/${limit}] @${account.handle}${varLabel}`);

      // Build prompt with random variations from classification data
      const prompt = buildVariedPrompt(account);
      console.log(`  📝 ${prompt.substring(0, 140)}`);

      // Generate using EXACT same pattern as the working wizard:
      // wrapWithSilhouette(prompt) + [silhouette template image]
      // NO reference images — silhouette template is the only image
      const img = await generateWithTemplate(prompt);
      if (!img) {
        console.log("  ❌ Generation failed");
        continue;
      }

      const clean = await stripMeta(img);
      const key = `admin/creators/seed/${account.handle}-v${v}-${Date.now()}.jpg`;
      await uploadToS3(clean, key);

      await sql(`
        INSERT INTO "AdminMedia" (id, "s3Key", source, "mediaType", prompt, "sourceHandle", "pipelineStage", "pipelineOrder", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, 'seed-script', 'creator', $2, $3, 'inbox', $4, NOW(), NOW())
        ON CONFLICT ("s3Key") DO NOTHING
      `, [key, prompt, account.handle, done]);

      success++;
      console.log(`  ✅ → ${key}`);

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n🎉 Done! ${done} attempted, ${success} succeeded\n`);
  await pool.end();
}

main().catch(console.error);
