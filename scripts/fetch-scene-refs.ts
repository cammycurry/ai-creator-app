#!/usr/bin/env npx tsx
/**
 * Fetch EMPTY scene reference photos from Unsplash — no people.
 * These are background refs for placing AI creators into scenes.
 *
 * Usage: npx tsx scripts/fetch-scene-refs.ts
 */
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!;

// All queries emphasize EMPTY / no people / interior / background only
const SCENES = [
  { id: "gym-mirror", query: "empty gym interior mirror no people", description: "Empty gym with mirrors" },
  { id: "coffee-shop", query: "empty cafe interior window seat no people cozy", description: "Empty café interior" },
  { id: "beach-sunset", query: "empty tropical beach sunset no people palm trees", description: "Empty beach at sunset" },
  { id: "bedroom-morning", query: "empty bedroom morning sunlight white sheets no people", description: "Empty bedroom morning light" },
  { id: "city-street", query: "empty city sidewalk golden hour no people urban", description: "Empty city street" },
  { id: "bathroom-mirror", query: "modern bathroom mirror interior no people clean", description: "Empty bathroom with mirror" },
  { id: "pool", query: "empty hotel pool luxury no people tropical", description: "Empty luxury pool" },
  { id: "night-out", query: "empty cocktail bar interior dim lighting no people", description: "Empty bar/lounge" },
];

const PER_SCENE = 5;
const OUTPUT_DIR = path.join(__dirname, "output/scene-refs-v2");

async function fetchScene(scene: typeof SCENES[0]): Promise<void> {
  const sceneDir = path.join(OUTPUT_DIR, scene.id);
  fs.mkdirSync(sceneDir, { recursive: true });

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(scene.query)}&per_page=${PER_SCENE}&client_id=${ACCESS_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ✗ ${scene.id}: API error ${res.status}`);
      return;
    }
    const data = await res.json();
    const photos = data.results || [];

    if (photos.length === 0) {
      console.log(`  ✗ ${scene.id}: no results`);
      return;
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const imgUrl = photo.urls?.regular;
      if (!imgUrl) continue;

      const imgRes = await fetch(imgUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const outPath = path.join(sceneDir, `${i + 1}.jpg`);
      fs.writeFileSync(outPath, buffer);
      console.log(`  ✓ ${scene.id}/${i + 1}.jpg — ${photo.alt_description || "no desc"}`);
    }

    fs.writeFileSync(
      path.join(sceneDir, "metadata.json"),
      JSON.stringify(photos.map((p: any) => ({
        id: p.id,
        description: p.alt_description,
        photographer: p.user?.name,
        photoUrl: p.links?.html,
      })), null, 2)
    );
  } catch (e: any) {
    console.log(`  ✗ ${scene.id}: ${e.message}`);
  }
}

async function main() {
  if (!ACCESS_KEY) {
    console.log("Missing UNSPLASH_ACCESS_KEY in .env.local");
    return;
  }

  console.log(`Fetching EMPTY scene backgrounds from Unsplash (${SCENES.length} scenes × ${PER_SCENE} each)`);
  console.log("─".repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const scene of SCENES) {
    console.log(`\n${scene.id} — ${scene.description}`);
    await fetchScene(scene);
  }

  console.log(`\nDone! Browse: ${OUTPUT_DIR}`);
  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
