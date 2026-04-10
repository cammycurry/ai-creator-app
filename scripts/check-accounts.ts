import { config } from "dotenv";
config({ path: ".env.local" });
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(`
    SELECT handle, name, gender, niche, vibe, "categoryName", "isVerified", followers,
      (SELECT count(*) FROM "ReferencePost" WHERE "accountId" = "ReferenceAccount".id) as post_count
    FROM "ReferenceAccount"
    ORDER BY followers DESC NULLS LAST
  `);

  console.log("\n=== REFERENCE ACCOUNTS ===\n");
  for (const r of rows) {
    const f = r.followers ? `${(r.followers/1000).toFixed(0)}K` : "?";
    const niches = (r.niche || []).join(", ") || "NO NICHE";
    console.log(`@${r.handle.padEnd(20)} ${f.padStart(7)} followers | ${r.post_count.toString().padStart(3)} posts | Gender: ${(r.gender || "NONE").padEnd(8)} | Niche: ${niches.padEnd(20)} | Vibe: ${r.vibe || "NONE"} | Cat: ${r.categoryName || "-"}`);
  }

  const noGender = rows.filter((r: { gender: string | null }) => !r.gender).length;
  const noNiche = rows.filter((r: { niche: string[] | null }) => !r.niche?.length).length;
  const noVibe = rows.filter((r: { vibe: string | null }) => !r.vibe).length;

  console.log(`\n--- GAPS ---`);
  console.log(`${noGender}/${rows.length} missing gender`);
  console.log(`${noNiche}/${rows.length} missing niche`);
  console.log(`${noVibe}/${rows.length} missing vibe`);
  console.log(`Total: ${rows.length} accounts, ${rows.reduce((s: number, r: { post_count: string }) => s + parseInt(r.post_count), 0)} posts\n`);

  await pool.end();
}

main().catch(console.error);
