// ─── Gemini API Cost Calculation ─────────────────────
// Real pricing per Google's published rates.
// Image generation uses Gemini's native image output,
// which is billed per-image, not per-token for the output.

// Gemini 3 Pro (Nano Banana Pro) image generation pricing:
// - Input text tokens: $1.25 / 1M tokens
// - Input image tokens: $1.25 / 1M tokens
// - Output image: ~$0.04 per generated image
// - Output text tokens (thinking): $10.00 / 1M tokens
//
// Gemini 2.5 Flash (text-only, prompt enhancement):
// - Input: $0.15 / 1M tokens
// - Output: $0.60 / 1M tokens
// - Thinking: $3.50 / 1M tokens

type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
};

const PRICING = {
  "gemini-3-pro-image-preview": {
    inputPerMToken: 1.25,
    outputPerMToken: 10.0,
    thoughtsPerMToken: 10.0,
    imageOutputCost: 0.04,
  },
  "gemini-3.1-flash-image-preview": {
    inputPerMToken: 0.15,
    outputPerMToken: 0.60,
    thoughtsPerMToken: 3.50,
    imageOutputCost: 0.02,
  },
  "gemini-2.5-flash": {
    inputPerMToken: 0.15,
    outputPerMToken: 0.60,
    thoughtsPerMToken: 3.50,
    imageOutputCost: 0,
  },
} as const;

type ModelId = keyof typeof PRICING;

export function calculateCost(
  modelId: string,
  usage: UsageMetadata | null | undefined,
  imageOutputCount: number = 0
): number {
  if (!usage) return 0;

  const pricing = PRICING[modelId as ModelId];
  if (!pricing) return 0;

  const inputTokens = usage.promptTokenCount ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? 0;
  const thoughtTokens = usage.thoughtsTokenCount ?? 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMToken;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMToken;
  const thoughtCost = (thoughtTokens / 1_000_000) * pricing.thoughtsPerMToken;
  const imageCost = imageOutputCount * pricing.imageOutputCost;

  return inputCost + outputCost + thoughtCost + imageCost;
}

export function sumCosts(costs: number[]): number {
  return costs.reduce((sum, c) => sum + c, 0);
}
