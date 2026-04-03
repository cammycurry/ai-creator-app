import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // Find the user (should exist from Clerk webhook or workspace init)
  const user = await db.user.findFirst();

  if (!user) {
    console.log("No user found. Sign in to the app first, then run seed again.");
    return;
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // Check if creators already exist
  const existing = await db.creator.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`User already has ${existing} creators. Skipping seed.`);
    return;
  }

  // Create demo creators
  const sophia = await db.creator.create({
    data: {
      userId: user.id,
      name: "Sophia",
      niche: ["fitness"],
      contentCount: 24,
      settings: {
        gender: "Female",
        age: "25",
        ethnicity: "Caucasian",
        hairColor: "Blonde",
        hairLength: "Long",
        build: "Athletic",
      },
    },
  });

  const luna = await db.creator.create({
    data: {
      userId: user.id,
      name: "Luna",
      niche: ["lifestyle", "fashion"],
      contentCount: 12,
      settings: {
        gender: "Female",
        age: "23",
        ethnicity: "East Asian",
        hairColor: "Black",
        hairLength: "Medium",
        build: "Slim",
      },
    },
  });

  const kai = await db.creator.create({
    data: {
      userId: user.id,
      name: "Kai",
      niche: ["tech"],
      contentCount: 8,
      settings: {
        gender: "Male",
        age: "28",
        ethnicity: "Mixed",
        hairColor: "Dark Brown",
        hairLength: "Short",
        build: "Average",
      },
    },
  });

  // Create some content records for Sophia so the grid shows
  const contentTypes = ["IMAGE", "VIDEO", "IMAGE", "IMAGE", "VIDEO", "IMAGE", "IMAGE", "VIDEO"] as const;
  for (let i = 0; i < 8; i++) {
    await db.content.create({
      data: {
        creatorId: sophia.id,
        type: contentTypes[i],
        status: "COMPLETED",
        source: "FREEFORM",
        creditsCost: contentTypes[i] === "VIDEO" ? 3 : 2,
        tags: ["demo"],
      },
    });
  }

  console.log(`Created creators: ${sophia.name}, ${luna.name}, ${kai.name}`);
  console.log(`Created 8 content items for ${sophia.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
