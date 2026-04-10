/**
 * AI auto-classify all reference accounts.
 * Analyzes: bio, categoryName, handle, top post images → outputs gender, niche, vibe.
 * Run: pnpx tsx scripts/classify-accounts.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sql = async (query: string, params?: unknown[]) => (await pool.query(query, params)).rows;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "realinfluencerstorage-media";

const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function getImageFromS3(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const CLASSIFY_PROMPT = `You are classifying an Instagram account for an AI influencer reference library. You will see the account's metadata AND several of their actual posts.

Study ALL the images carefully — look at their body type, fashion style, settings, poses, lighting, content themes, and overall energy.

Output a JSON object:

{
  "gender": "Female" or "Male",
  "niche": ["primary niche", "secondary niche"],
  "vibe": "unique 3-5 word aesthetic descriptor",
  "ethnicity": "best guess from photos, e.g. European, Latina, Asian, Mixed, Black, Middle Eastern",
  "bodyType": "e.g. Athletic, Slim, Curvy, Slim-thick, Petite, Muscular",
  "hairColor": "e.g. Blonde, Brunette, Black, Red, Auburn",
  "contentStyle": "e.g. Gym selfies, Lifestyle glamour, Beach content, Street fashion, UGC reviews",
  "avgAge": "estimated age range like 20-24 or 25-28"
}

Niche options: Fitness, Lifestyle, Beauty, Fashion, Travel, UGC, Spicy/Glamour, Food, Tech, General
- Pick 1-3 niches that actually fit. Don't just say "Lifestyle" for everything.
- "Spicy/Glamour" = accounts that lean into sex appeal, revealing outfits, thirst traps

Vibe MUST be unique and specific — NOT generic. Bad: "Sultry and confident". Good: "Miami gym baddie", "Cozy college fashionista", "Sun-kissed beach babe", "Edgy streetwear queen", "Soft girl yoga vibes".

Output ONLY valid JSON, no markdown, no explanation.`;

async function classifyAccount(account: {
  handle: string;
  name: string | null;
  bio: string | null;
  categoryName: string | null;
  followers: number | null;
}, images: string[] = []): Promise<{ gender: string; niche: string[]; vibe: string }> {
  const input = [
    `Handle: @${account.handle}`,
    account.name ? `Name: ${account.name}` : null,
    account.bio ? `Bio: ${account.bio}` : null,
    account.categoryName ? `Instagram category: ${account.categoryName}` : null,
    account.followers ? `Followers: ${(account.followers / 1000).toFixed(0)}K` : null,
    images.length > 0 ? `I'm showing you ${images.length} of their top posts. Analyze ALL of them to understand their content, style, and aesthetic.` : null,
  ].filter(Boolean).join("\n");

  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: input },
    ...images.map(img => ({ inlineData: { mimeType: "image/jpeg" as const, data: img } })),
  ];

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction: CLASSIFY_PROMPT, safetySettings: SAFETY_OFF },
    });
    const text = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      const clean = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(clean);
      return {
        gender: parsed.gender || "Female",
        niche: Array.isArray(parsed.niche) ? parsed.niche : ["General"],
        vibe: parsed.vibe || "Influencer",
        ethnicity: parsed.ethnicity || null,
        bodyType: parsed.bodyType || null,
        hairColor: parsed.hairColor || null,
        contentStyle: parsed.contentStyle || null,
        avgAge: parsed.avgAge || null,
      };
    }
  } catch (e) {
    console.warn("  Classification failed:", (e as Error).message?.substring(0, 80));
  }
  return { gender: "Female", niche: ["General"], vibe: "Influencer", ethnicity: null, bodyType: null, hairColor: null, contentStyle: null, avgAge: null };
}

async function main() {
  const accounts = await sql(`
    SELECT id, handle, name, bio, "categoryName", followers
    FROM "ReferenceAccount"
    ORDER BY followers DESC NULLS LAST
  `);

  console.log(`\n🏷️ Classifying ${accounts.length} accounts\n`);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`[${i + 1}/${accounts.length}] @${account.handle}`);

    // Get 4 diverse images — top liked, most recent, and 2 random
    const topImages: string[] = [];
    try {
      const posts = await sql(`
        (SELECT "s3Key" FROM "ReferencePost" WHERE "accountId" = $1 AND "mediaType" = 'image' ORDER BY "likeCount" DESC NULLS LAST LIMIT 2)
        UNION ALL
        (SELECT "s3Key" FROM "ReferencePost" WHERE "accountId" = $1 AND "mediaType" = 'image' ORDER BY "createdAt" DESC LIMIT 1)
        UNION ALL
        (SELECT "s3Key" FROM "ReferencePost" WHERE "accountId" = $1 AND "mediaType" = 'image' ORDER BY random() LIMIT 1)
      `, [account.id]);
      // Deduplicate
      const seen = new Set<string>();
      for (const p of posts) {
        if (seen.has(p.s3Key)) continue;
        seen.add(p.s3Key);
        try {
          const buf = await getImageFromS3(p.s3Key);
          topImages.push(buf.toString("base64"));
          if (topImages.length >= 4) break;
        } catch {}
      }
    } catch (e) {
      console.log(`  ⚠ Could not fetch images: ${(e as Error).message?.substring(0, 60)}`);
    }

    console.log(`  📸 Sending ${topImages.length} images to Gemini Flash...`);
    const result = await classifyAccount(account, topImages);
    const extras = [result.ethnicity, result.bodyType, result.hairColor, result.contentStyle, result.avgAge].filter(Boolean).join(" | ");
    console.log(`  → ${result.gender} | ${result.niche.join(", ")} | "${result.vibe}" | ${extras}`);

    const notes = [
      result.ethnicity ? `Ethnicity: ${result.ethnicity}` : null,
      result.bodyType ? `Body: ${result.bodyType}` : null,
      result.hairColor ? `Hair: ${result.hairColor}` : null,
      result.contentStyle ? `Content: ${result.contentStyle}` : null,
      result.avgAge ? `Age: ${result.avgAge}` : null,
    ].filter(Boolean).join(". ");

    await sql(`
      UPDATE "ReferenceAccount"
      SET gender = $1, niche = $2, vibe = $3, notes = $4
      WHERE id = $5
    `, [result.gender, result.niche, result.vibe, notes, account.id]);

    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Done! Classified ${accounts.length} accounts\n`);
  await pool.end();
}

main().catch(console.error);
