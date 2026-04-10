---
paths:
  - "src/server/actions/generate-actions.ts"
  - "src/lib/ai/**"
---

# Generation Pipeline Rules

## Image Model
- Model: `gemini-3-pro-image-preview` (Nano Banana Pro)
- Safety filters: ALL disabled (BLOCK_NONE for all HarmCategory)
- Response modalities: ["TEXT", "IMAGE"]
- SDK: `@google/genai` (GoogleGenAI class)

## Prompt Rules (validated March 2026)
- Central prompt source: `src/lib/prompts.ts` — all prompts live there
- Wizard prompts: "Canon EOS R5. Visible pores, photorealistic."
- Lead with vibe/energy, NOT face-first descriptions
- BANNED words: "voluptuous", "curvy", "hourglass", "imperfections", "blemishes", "no makeup"
- Wizard: composition template (silhouette) controls framing — hips-up crop, white bg
- Wizard clothing: female = "white sports bra and black leggings", male = "Shirtless, wearing dark joggers"
- Variations: reference image does heavy lifting, minimal text prompt
- Content gen (not built yet): full creative freedom on outfit/setting/pose

## Prompt Enhancement
- Primary: Grok Fast (`grok-4-1-fast-non-reasoning`) via xAI API
- Fallback: Gemini Flash (`gemini-2.5-flash`)
- Last resort: `fallbackEnhance()` — wraps raw text in minimal structure
- Free to user (we eat the cost)

## Credit Costs
- Creator wizard (4 images): 5 credits
- Content generation (4 images): 2 credits
- Upscale: 1 credit
- Video 5s: 3 credits, 10s: 5 credits
- Voice: 2 credits
- Lip sync: 5 credits
