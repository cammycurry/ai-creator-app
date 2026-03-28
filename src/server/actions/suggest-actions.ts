"use server";

import OpenAI from "openai";

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

const VALID_NICHES = ["Fitness", "Lifestyle", "Beauty", "Fashion", "Tech", "Travel", "Food", "Music", "Gaming"];

/**
 * Uses Grok Fast to suggest a creator name + niches based on traits/description/vibes.
 * Called when user enters the finishing phase — pre-fills fields so they just review + click.
 */
export async function suggestCreatorDetails(input: {
  gender: string | null;
  ethnicity: string | null;
  vibes: string[];
  description: string;
}): Promise<{ name: string; niches: string[] }> {
  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You suggest Instagram influencer persona names and content niches.

Given a description of an AI influencer, respond with ONLY valid JSON:
{"name": "FirstName LastName", "niches": ["Niche1", "Niche2"]}

Name rules:
- Catchy, memorable, Instagram-ready (like "Mia Strong", "Luna Glow", "Kai Nomad")
- Match the gender and ethnicity vibe
- First name + creative last name that hints at their niche/vibe
- NO generic names like "John Smith"

Niche rules — pick 1-3 from ONLY these: ${VALID_NICHES.join(", ")}
- Match niches to the person's vibes and description
- Fitness vibes → Fitness. Glamorous/Beauty → Beauty. Classy/Fashion → Fashion. etc.

Output ONLY the JSON. No explanations.`,
        },
        {
          role: "user",
          content: `Gender: ${input.gender ?? "Female"}
Ethnicity: ${input.ethnicity ?? "not specified"}
Vibes: ${input.vibes.length > 0 ? input.vibes.join(", ") : "confident, attractive"}
Description: ${input.description || "AI influencer"}`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    const json = JSON.parse(text);

    const name = typeof json.name === "string" ? json.name.slice(0, 30) : "My Creator";
    const niches = Array.isArray(json.niches)
      ? json.niches.filter((n: string) => VALID_NICHES.includes(n)).slice(0, 3)
      : ["Lifestyle"];

    return { name, niches };
  } catch (error) {
    console.error("suggestCreatorDetails error:", error);
    // Fallback — simple rule-based suggestion
    const gender = input.gender?.toLowerCase() ?? "female";
    const fallbackNames = gender === "male"
      ? ["Kai", "Marcus", "Jake", "Leo", "Axel"]
      : ["Mia", "Luna", "Bella", "Ava", "Zara"];
    const randomName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];

    const vibeToNiche: Record<string, string> = {
      "fitness": "Fitness", "athletic": "Fitness",
      "glamorous": "Beauty", "natural": "Beauty", "sweet": "Beauty",
      "classy": "Fashion", "baddie": "Fashion", "street": "Fashion",
      "sexy": "Lifestyle", "girl next door": "Lifestyle", "chill": "Lifestyle",
      "creative": "Tech",
    };
    const niches = [...new Set(
      input.vibes.map((v) => vibeToNiche[v.toLowerCase()]).filter(Boolean)
    )].slice(0, 2);

    return {
      name: randomName,
      niches: niches.length > 0 ? niches : ["Lifestyle"],
    };
  }
}
