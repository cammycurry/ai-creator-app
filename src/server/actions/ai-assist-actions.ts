"use server";

import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

// ─── Suggest Content Ideas ─────

export async function suggestContentIdeas(
  creatorId: string,
  contentType: "photo" | "carousel" | "video" | "talking-head"
): Promise<{ suggestions: string[] }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { suggestions: [] };

  const creator = await db.creator.findFirst({
    where: { id: creatorId, user: { clerkId } },
  });
  if (!creator) return { suggestions: [] };

  const niche = (creator.niche as string[])?.join(", ") || "lifestyle";
  const name = creator.name;

  const typeContext: Record<string, string> = {
    photo: "Instagram photo posts (single images)",
    carousel: "Instagram carousel posts (3-7 slide photo series)",
    video: "short video clips (5-10 seconds, lifestyle/action, no talking)",
    "talking-head": "talking-head video scripts (the creator speaks directly to camera, 15-30 seconds)",
  };

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You suggest content ideas for an AI influencer. Output ONLY a JSON array of 5 short ideas (1 sentence each). No markdown, no explanation.

The ideas should be specific, actionable, and trendy for Instagram/TikTok. Include scene details, outfit hints, and mood.`,
        },
        {
          role: "user",
          content: `Creator: ${name}, ${niche} niche
Content type: ${typeContext[contentType]}
Give me 5 ideas.`,
        },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "[]";
    const parsed = JSON.parse(text.replace(/^```json?\n?|\n?```$/g, "").trim());
    return { suggestions: Array.isArray(parsed) ? parsed.slice(0, 5) : [] };
  } catch {
    return { suggestions: getDefaultSuggestions(contentType, niche) };
  }
}

// ─── Improve Prompt ─────

export async function improvePrompt(
  currentPrompt: string,
  contentType: "photo" | "carousel" | "video" | "talking-head"
): Promise<{ improved: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { improved: currentPrompt };

  const typeHint: Record<string, string> = {
    photo: "a detailed Instagram photo description with scene, lighting, outfit, mood, and camera style",
    carousel: "a detailed carousel concept with clear slide progression",
    video: "a vivid video scene description with movement, camera motion, and action",
    "talking-head": "a natural, engaging script that sounds like a real person talking to camera (not a blog post)",
  };

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You improve content prompts for AI generation. Take the user's rough idea and turn it into ${typeHint[contentType]}.

Rules:
- Keep the core idea, just make it more detailed and vivid
- Add specific details: setting, lighting, outfit, expression, mood
- For scripts: keep it casual, 91-125 words, hook → content → CTA structure
- Output ONLY the improved text, no explanation, no quotes, no markdown`,
        },
        {
          role: "user",
          content: currentPrompt,
        },
      ],
    });

    return { improved: response.choices?.[0]?.message?.content?.trim() ?? currentPrompt };
  } catch {
    return { improved: currentPrompt };
  }
}

// ─── Write Script ─────

export async function writeScript(
  topic: string,
  creatorName: string,
  niche: string,
  duration: 15 | 30
): Promise<{ script: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { script: "" };

  const wordTarget = duration === 15 ? "40-60" : "91-125";

  try {
    const response = await grok.chat.completions.create({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content: `You write short video scripts for AI influencers. The creator speaks directly to camera.

Rules:
- ${wordTarget} words exactly
- Structure: Hook (grab attention) → Content (value/story) → CTA (engagement ask)
- Sound natural and conversational — NOT like a blog post
- Use the creator's first name naturally if it fits
- Keep it casual, relatable, authentic
- Never mention AI or that the person is generated
- Output ONLY the script text, no labels, no markdown`,
        },
        {
          role: "user",
          content: `Creator: ${creatorName}, ${niche} niche
Topic: ${topic}
Duration: ${duration} seconds`,
        },
      ],
    });

    return { script: response.choices?.[0]?.message?.content?.trim() ?? "" };
  } catch {
    return { script: "" };
  }
}

// ─── Fallback suggestions ─────

function getDefaultSuggestions(contentType: string, niche: string): string[] {
  const fitness = [
    "Post-workout mirror selfie, glowing skin, matching sports set",
    "Gym bag flatlay with protein shake, headphones, towel",
    "Walking on treadmill, side profile, determined expression",
    "Stretching on yoga mat, morning light from window",
    "Car selfie leaving the gym, hoodie on, tired but happy",
  ];
  const lifestyle = [
    "Morning coffee at a cozy café, oversized sweater, reading phone",
    "Golden hour walk through the city, casual outfit, wind in hair",
    "Getting ready in bathroom mirror, doing makeup, candid",
    "Cooking dinner in kitchen, steam rising, warm lighting",
    "Bed selfie first thing in morning, messy hair, natural light",
  ];
  return niche.toLowerCase().includes("fitness") ? fitness : lifestyle;
}
