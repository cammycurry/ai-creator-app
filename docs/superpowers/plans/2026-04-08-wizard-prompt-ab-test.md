# Wizard Prompt A/B Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definitively determine whether realism anchors improve or hurt the initial wizard generation (white background, silhouette template, creating a new creator from scratch). Separate finding from the content generation test (which already proved hybrid wins for scene content).

**Architecture:** One test script that generates the same creator 4 times under each of 4 prompt strategies. All use the exact same `wrapWithSilhouette()` + silhouette template. Only the person-description prompt varies. Output organized by strategy for easy side-by-side comparison.

**Tech Stack:** TypeScript, `@google/genai`, NBPro (`gemini-3-pro-image-preview`), composition template at `src/assets/composition-template.jpg`

**Key Question:** For the wizard's initial base generation (white bg, no face ref), should the prompt include realism anchors, attractiveness reinforcement, both, or neither? The right answer becomes the wizard prompt formula. The wrong answer gets dropped.

---

### Test Matrix

| Strategy | Realism Anchors | Attractiveness Reinforcement | What We're Testing |
|----------|:-:|:-:|---|
| **A: Current** | Minimal ("Visible pores, photorealistic") | Vibe-first ("Sexy confident") | Baseline. What the app does today. |
| **B: Full Realism** | All 6 validated (stray hairs, fabric, env noise, lighting, camera, pores) | None | Does adding realism to wizard make the base photo more real? |
| **C: Attractiveness++** | Minimal (current) | Heavy ("She looks absolutely gorgeous, stunning face, the kind of girl that stops you mid-scroll") | Does doubling down on hotness produce better wizard results? |
| **D: Hybrid** | Selective (visible pores, subtle skin texture, natural hair) | Heavy | Best of both? Or does it muddy the wizard output? |

### Test Subject

One consistent set of traits used across all 4 strategies so the only variable is the prompt structure:

```
gender: Female
age: 23
ethnicity: European
build: Slim
chestSize: large (DD-cup)
hairColor: Dark Brown
hairLength: Long
hairTexture: Straight
eyeColor: Green
vibes: ["Sexy", "Confident"]
```

This matches Sienna's traits so we can compare against her existing generations.

---

### Task 1: Write the Test Script

**Files:**
- Create: `scripts/test-wizard-prompts.ts`

- [ ] **Step 1: Create the test script with all 4 prompt strategies**

```typescript
#!/usr/bin/env npx tsx
/**
 * Wizard Prompt A/B Test
 *
 * Tests 4 prompt strategies for initial wizard generation.
 * All use wrapWithSilhouette() + silhouette template. Only the person prompt varies.
 * 4 rolls per strategy = 16 images total.
 *
 * Usage: npx tsx scripts/test-wizard-prompts.ts
 * Output: scripts/output/wizard-prompt-test/
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const SAFETY_OFF = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const TEMPLATE_PATH = path.join(__dirname, "../src/assets/composition-template.jpg");
const templateBase64 = fs.readFileSync(TEMPLATE_PATH).toString("base64");

// Exact wrapWithSilhouette() from prompts.ts — SAME for all strategies
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

// ═══ STRATEGY A: Current (what buildWizardPrompt outputs today) ═══
const STRATEGY_A = wrapWithSilhouette(
  "Sexy confident 23-year-old European woman, very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra. Slim build with narrow waist. Long straight dark brown hair, piercing green eyes, full lips, gorgeous sun-kissed skin. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, photorealistic."
);

// ═══ STRATEGY B: Full Realism (6 validated anchors, no attractiveness boost) ═══
const STRATEGY_B = wrapWithSilhouette(
  "Sexy confident 23-year-old European woman, very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra. Slim build with narrow waist. Long straight dark brown hair, piercing green eyes, full lips, gorgeous sun-kissed skin. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera. Visible pores, subtle skin texture with natural variation. Baby hairs at temples. Fabric texture visible on sports bra with natural compression wrinkles. Natural studio lighting with soft shadows. Photorealistic."
);

// ═══ STRATEGY C: Attractiveness++ (current realism, heavy attractiveness) ═══
const STRATEGY_C = wrapWithSilhouette(
  "Incredibly gorgeous stunning 23-year-old European woman, very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra. Slim build with narrow waist. Long straight dark brown hair, piercing green eyes, full pouty lips, flawless sun-kissed skin. She has the kind of face that stops you mid-scroll. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera with a confident sultry expression. She looks absolutely stunning. Visible pores, photorealistic."
);

// ═══ STRATEGY D: Hybrid (selective realism + heavy attractiveness) ═══
const STRATEGY_D = wrapWithSilhouette(
  "Incredibly gorgeous stunning 23-year-old European woman, very large DD-cup breasts with deep cleavage, extremely busty, breasts straining against the sports bra. Slim build with narrow waist. Long straight dark brown hair with natural shine, piercing green eyes, full pouty lips, flawless sun-kissed skin. She has the kind of face that stops you mid-scroll. tight white sports bra and black leggings. Canon EOS R5. Eyes open, looking directly at camera with a confident sultry expression. She looks absolutely stunning. Visible pores, subtle natural skin texture. Baby hairs at temples catching the light. Photorealistic."
);

const strategies = [
  { id: "A-current", prompt: STRATEGY_A, label: "Current (baseline)" },
  { id: "B-full-realism", prompt: STRATEGY_B, label: "Full Realism (6 anchors)" },
  { id: "C-attractiveness", prompt: STRATEGY_C, label: "Attractiveness++ (heavy hot language)" },
  { id: "D-hybrid", prompt: STRATEGY_D, label: "Hybrid (selective realism + hot language)" },
];

const ROLLS_PER_STRATEGY = 4;
const OUTPUT_DIR = path.join(__dirname, "output/wizard-prompt-test");

async function generateOne(prompt: string, outputPath: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: templateBase64 } },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        safetySettings: SAFETY_OFF,
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.data
    );
    if (imagePart?.inlineData?.data) {
      fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));
      return true;
    }
    console.log(`    filtered (${response.candidates?.[0]?.finishReason})`);
    return false;
  } catch (e: any) {
    console.log(`    error: ${e.message}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("═══ Wizard Prompt A/B Test ═══");
  console.log(`${strategies.length} strategies × ${ROLLS_PER_STRATEGY} rolls = ${strategies.length * ROLLS_PER_STRATEGY} images`);
  console.log("All use wrapWithSilhouette() + silhouette template");
  console.log("Only the person-description prompt varies");
  console.log("─".repeat(60));

  for (const strategy of strategies) {
    const stratDir = path.join(OUTPUT_DIR, strategy.id);
    fs.mkdirSync(stratDir, { recursive: true });
    fs.writeFileSync(path.join(stratDir, "prompt.txt"), strategy.prompt);

    console.log(`\n${strategy.id}: ${strategy.label}`);

    // Generate rolls sequentially per strategy to avoid rate limits
    // but strategies themselves run sequentially to keep output organized
    const results = await Promise.all(
      Array.from({ length: ROLLS_PER_STRATEGY }, (_, i) =>
        generateOne(strategy.prompt, path.join(stratDir, `roll-${i + 1}.jpg`)).then((ok) => {
          console.log(`  ${ok ? "✓" : "✗"} roll-${i + 1}`);
          return ok;
        })
      )
    );

    const passed = results.filter(Boolean).length;
    console.log(`  ${passed}/${ROLLS_PER_STRATEGY} generated`);
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("Test complete. Compare strategies:");
  console.log(`  ${OUTPUT_DIR}/A-current/`);
  console.log(`  ${OUTPUT_DIR}/B-full-realism/`);
  console.log(`  ${OUTPUT_DIR}/C-attractiveness/`);
  console.log(`  ${OUTPUT_DIR}/D-hybrid/`);
  console.log("\nEvaluation criteria:");
  console.log("  1. Face realism (does it look AI or human?)");
  console.log("  2. Attractiveness (is she hot?)");
  console.log("  3. Body accuracy (did the chest/build match the prompt?)");
  console.log("  4. Consistency (do the 4 rolls look like they could be the same person?)");
  console.log("  5. Background (clean white? or did it hallucinate a scene?)");
  console.log("  6. Composition (proper silhouette framing? waist-up crop?)");

  const { execSync } = await import("child_process");
  execSync(`open "${OUTPUT_DIR}"`);
}

main().catch(console.error);
```

- [ ] **Step 2: Save the script**

Write the above to `scripts/test-wizard-prompts.ts`.

- [ ] **Step 3: Run the test**

```bash
npx tsx scripts/test-wizard-prompts.ts
```

Expected: 16 images generated (4 per strategy), organized into 4 folders. Finder opens to the output directory.

Expected output:
```
═══ Wizard Prompt A/B Test ═══
4 strategies × 4 rolls = 16 images
...
A-current: Current (baseline)
  ✓ roll-1
  ✓ roll-2
  ✓ roll-3
  ✓ roll-4
  4/4 generated

B-full-realism: Full Realism (6 anchors)
  ✓ roll-1
  ...
```

Some may get filtered (IMAGE_OTHER or IMAGE_SAFETY). That's expected data too — if a strategy gets filtered more often, that's a signal.

- [ ] **Step 4: Commit the test script**

```bash
git add scripts/test-wizard-prompts.ts
git commit -m "test: wizard prompt A/B test — 4 strategies for initial creator generation"
```

---

### Task 2: Visual Evaluation

After generating, manually evaluate each strategy across 6 dimensions. This is the human judgment part.

- [ ] **Step 1: Open all 4 strategy folders side by side**

Compare the 4 rolls in each folder. For each strategy, score 1-5 on:

| Dimension | What to look for | Weight |
|-----------|-----------------|--------|
| **Face Realism** | Does the face look AI or human? Skin texture, eye clarity, lip detail, hair at face boundary | Highest |
| **Attractiveness** | Is she hot? Would this stop someone scrolling? | Highest |
| **Body Accuracy** | Did the chest size match DD-cup? Is the build slim? Did clothing render properly? | High |
| **Roll Consistency** | Do the 4 rolls look like they could be the same person (even without face ref)? Or are they wildly different? | Medium |
| **Background** | Clean white studio? Or did the model hallucinate a room/scene? | Medium |
| **Composition** | Proper silhouette framing? Waist-up crop? Arms at sides? | Medium |

- [ ] **Step 2: Record results in evaluation doc**

Create `scripts/output/wizard-prompt-test/EVALUATION.md`:

```markdown
# Wizard Prompt A/B Test — Evaluation

## Scores (1-5, 5 is best)

| Dimension | A: Current | B: Full Realism | C: Attractive++ | D: Hybrid |
|-----------|:---:|:---:|:---:|:---:|
| Face Realism | | | | |
| Attractiveness | | | | |
| Body Accuracy | | | | |
| Roll Consistency | | | | |
| Background | | | | |
| Composition | | | | |
| **Total** | | | | |

## Filter Rate
- A: _/4 generated
- B: _/4 generated
- C: _/4 generated
- D: _/4 generated

## Best Individual Image
Strategy: _, Roll: _
Why:

## Worst Individual Image
Strategy: _, Roll: _
Why:

## Verdict
**Winner for wizard generation:**
**Reasoning:**

## Recommendation
Should the wizard prompt change? If so, what specifically:
- [ ] Add attractiveness language to buildWizardPrompt()
- [ ] Add selective realism anchors to buildWizardPrompt()
- [ ] Keep buildWizardPrompt() as-is
- [ ] Other:
```

- [ ] **Step 3: Update the master test results doc**

Append findings to `docs/reference/PROMPT-AB-TEST-RESULTS.md` under a new section "## Round 3: Wizard Generation (Initial Creator)" so the other Claude and future sessions have the complete picture.

- [ ] **Step 4: Commit evaluation**

```bash
git add scripts/output/wizard-prompt-test/EVALUATION.md docs/reference/PROMPT-AB-TEST-RESULTS.md
git commit -m "docs: wizard prompt A/B test evaluation — [winner] wins for initial generation"
```

---

### Task 3: Apply Findings (If Wizard Prompt Should Change)

Only do this task if the evaluation shows a clear winner that's different from Strategy A (current).

- [ ] **Step 1: Update buildWizardPrompt() in src/lib/prompts.ts**

If attractiveness language won (C or D):
- Add attractiveness reinforcement to the prompt output
- Example: change the vibe default from `"Sexy confident "` to include "gorgeous" or "stunning"
- Add a line like `"She looks absolutely stunning."` before the camera/realism line

If selective realism won (B or D):
- Add "subtle natural skin texture" and/or "baby hairs at temples" to REALISM_BASE or as a WIZARD_REALISM constant
- Keep it minimal — the wizard needs clean output for a good reference photo

If current won (A):
- Do nothing. Document that the wizard prompt is already optimal.

- [ ] **Step 2: Run the test again with the updated prompt to verify**

```bash
npx tsx scripts/test-wizard-prompts.ts
```

Compare new results against the original to confirm improvement.

- [ ] **Step 3: Commit changes**

```bash
git add src/lib/prompts.ts
git commit -m "feat: update wizard prompt based on A/B test — [what changed]"
```

---

### Task 4: Document Final Wizard vs Content Prompt Strategy

- [ ] **Step 1: Update PROMPT-AB-TEST-RESULTS.md with definitive guidance**

Add a final section:

```markdown
## Definitive Prompt Strategy (Wizard vs Content)

### Wizard Generation (Creating a New Creator)
- Purpose: Generate the base reference photo on white background
- Prompt style: [winner from this test]
- Realism anchors: [which ones, if any]
- Attractiveness: [how much reinforcement]
- DO NOT: [what to avoid]
- Key principle: The reference photo must be CLEAN and GORGEOUS. It anchors all future content.

### Content Generation (Generating Posts/Feed)
- Purpose: Generate scene content using face ref
- Prompt style: Hybrid C (proven in Round 2)
- Realism anchors: Environment + fabric + lighting + camera + stray hairs + pores
- Attractiveness: Always reinforced throughout
- DO NOT: Use skin degradation anchors (under-eye, redness, uneven tone)
- Key principle: Girl stays gorgeous, environment stays real.

### Variation Generation (Confirming Face Ref)
- Purpose: Regenerate the same person with face ref for consistency check
- Prompt style: buildVariationPrompt() — minimal text, ref does the heavy lifting
- Realism anchors: None (just "Visible pores, photorealistic")
- Key principle: Let the reference image do the work. Minimal text.
```

- [ ] **Step 2: Commit final documentation**

```bash
git add docs/reference/PROMPT-AB-TEST-RESULTS.md
git commit -m "docs: definitive wizard vs content prompt strategy — complete test results"
```
