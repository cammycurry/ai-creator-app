# Deep Research Prompt — AI Human Image Generation Prompts

> Copy everything below the line and paste it into Claude online as a single message.
> Ask Claude to do "extended thinking" or "deep research" on this.

---

I'm building a SaaS app that generates hyper-realistic AI influencer personas using Google's Gemini image model (specifically `gemini-3-pro-image-preview`, internally called "Nano Banana Pro"). I need you to be my prompt engineering expert for realistic human portrait generation.

**IMPORTANT: I have assumptions baked into how I'm doing things. Many of them might be wrong. For every section below, don't just answer my questions — actively challenge my assumptions. Tell me what I'm doing wrong, what I should be asking about that I'm not, and what I don't know that I don't know. If there's a fundamentally better approach I'm not considering, say so.**

## What the app does

Users create a virtual influencer by picking traits (gender, age, ethnicity, hair, eyes, body type, skin tone). The app generates 4 portrait images for them to pick from. Then that chosen image becomes the "base reference" — all future content images use it as a reference to maintain consistency (same face, same person).

## Our current assumptions (challenge ALL of these)

1. **We assume "raw iPhone photography" is the best realism keyword** — is it? Or is there something better? Is it even a good idea at all? Maybe it's limiting the model.
2. **We assume a pure white studio background is optimal** for base images — is it? Or does it make images look more artificial? Would a neutral/natural background produce more realistic results?
3. **We assume front-facing, waist-up is the best base composition** — is it? Would a different angle or framing produce better base images for future reference use?
4. **We assume "visible pores, subtle natural imperfections, fine expression lines" helps realism** — we got this from an AI influencer course (AIAC). But does it actually help with Gemini? Or does emphasizing "imperfections" make the model generate ugly/flawed faces?
5. **We assume "no makeup, no beauty filters, no digital retouching" improves output** — or does telling the model what NOT to do backfire? Does negative phrasing even work with Gemini?
6. **We assume natural language sentences are the right format** for Gemini prompts — or would comma-separated tags, structured blocks, or some other format work better?
7. **We assume more detail = better results** — or is our prompt too long? Is there a point of diminishing returns where extra detail confuses the model?
8. **We assume clothing should be described inline** in the body of the prompt — should it be? Is there a better placement or phrasing strategy?
9. **We assume "white sports bra" for females and "shirtless" for males is the standard** — we got this from course material. Is there a reason this specific clothing produces better base images, or is it arbitrary?
10. **We assume generating 4 images in parallel from the same text prompt should produce similar-looking people** — it doesn't. Is this a fundamental limitation of text-only generation, or is our prompt structured wrong?

## Current prompt structure

Here's what we're doing now for the initial base image generation:

```
Front-facing portrait of a 25-year-old Latina woman, raw iPhone photography style,
visible from waist up, standing straight with arms relaxed and hands resting naturally next to the body,
facing the camera directly against a pure white seamless studio background.
She is wearing a white sports bra, revealing a naturally athletic upper body with relaxed shoulders.
She has almond-shaped brown eyes, naturally full lips, with a calm, confident expression.
Her skin is medium olive with warm undertones, showing visible pores, subtle natural imperfections, and fine expression lines.
She has dark brown long wavy hair, with a natural and slightly uneven hairline.
Hyper-realistic, everyday human appearance.
The overall image feels unposed, authentic, and human, with no makeup or digital enhancement.
```

**Tell me everything wrong with this prompt.** Don't be nice about it. What's redundant? What's counterproductive? What's missing? What's in the wrong order? What phrases are actively hurting our results?

## Problems we're seeing

1. **All 4 images look like different people** — we generate them in parallel with the same text prompt, but each one creates a totally different person. We need consistency across the 4 options.

2. **Clothing inconsistency** — even though the prompt says "white sports bra", some images come back with jackets, tank tops, or other clothing. The prompt isn't forceful enough about clothing.

3. **"Imperfection" language may be making faces less attractive** — phrases like "subtle natural imperfections", "slightly uneven hairline", "no makeup, no beauty filters" might be pushing the model toward less attractive outputs. We want REALISTIC but still ATTRACTIVE humans. Real attractive people have pores and skin texture — but they don't have "imperfections" as a defining trait.

4. **Prompt feels messy and unstructured** — it reads like a paragraph of mixed instructions rather than a well-organized, professional prompt.

5. **No separation of concerns** — we're mixing composition (camera angle, framing), subject (who the person is), styling (clothing), and quality (realism keywords) all in one blob.

## What I need from you

### 1. Prompt Architecture Guide

Give me a structured prompt template/framework specifically for Gemini image generation of realistic human portraits. I need:

- Clear sections/blocks that separate: composition, subject description, clothing, skin/realism, photography style
- The optimal ORDER of these sections (what should come first?)
- Which sections should be "locked" (same every time) vs "variable" (changes per user)
- How to weight different parts — does Gemini pay more attention to the beginning or end of the prompt?
- **Challenge:** Is sectioning even the right approach? Maybe Gemini works better with a different structure entirely?

### 2. Realism Without Ugliness

Research the best practices for generating realistic but attractive humans with AI image models. Specifically:

- What realism keywords actually help vs which ones make the output look worse?
- Is "visible pores" helpful? What about "imperfections"? What about "no makeup"?
- How do professional AI portrait generators handle this balance?
- What phrases produce the most photorealistic AND attractive results?
- Are there better alternatives to "raw iPhone photography"?
- **Challenge:** Are we wrong to think "realism" and "attractiveness" conflict? Maybe the issue is something else entirely. What's actually causing the uncanny/unattractive outputs?

### 3. Consistency Techniques

Research how to get consistent-looking humans across multiple generations from the same prompt:

- Does prompt structure affect consistency? (e.g., more specific = more consistent?)
- What level of detail is optimal — too vague = random, too specific = fighting the model?
- Are there known techniques for Gemini specifically to improve cross-generation consistency?
- Is sequential generation (generate 1, then use it as reference for 3 more) better than parallel?
- How should the reference image prompt differ from the base generation prompt?
- **Challenge:** Is text-only generation fundamentally the wrong approach for getting 4 similar-looking options? Should we be doing something completely different — like generating 1, then doing controlled variations? Or using seed values? Or some other technique I don't even know about?

### 4. Clothing Control

Research how to get reliable clothing control in Gemini image generation:

- Why does the model sometimes ignore clothing instructions?
- Are there prompt patterns that make clothing more reliable?
- Should clothing be described at the beginning, middle, or end of the prompt?
- Does negative prompting work with Gemini? (e.g., "no jacket, no coat")
- **Challenge:** Is "white sports bra" even the right choice? Maybe a different base outfit would be more reliably generated AND produce better reference images for future content generation.

### 5. Prompt Formatting Best Practices

Research whether Gemini responds better to:

- Comma-separated tags vs natural language sentences
- Short punchy phrases vs detailed descriptions
- Numbered sections vs flowing paragraphs
- ALL CAPS for emphasis vs normal casing
- Brackets, parentheses, or other formatting for emphasis/grouping
- **Challenge:** Has anyone done systematic A/B testing on prompt formatting for Gemini image generation? Is there actual evidence, or is it all folklore?

### 6. Reference Image + Text Prompt Best Practices

When we have a reference image (for "More Like This" or content generation), research:

- How much text should accompany a reference image? (minimal vs detailed?)
- Should the text repeat the person's appearance or only describe what's DIFFERENT?
- What's the optimal prompt for "generate the same person in a different scene"?
- Does Gemini's `inlineData` work better with certain prompt structures?
- **Challenge:** Is `inlineData` even the best way to do reference-based generation with Gemini? Are there other API features, parameters, or techniques we should be using?

### 7. Professional Examples

Find and share any documented prompt templates or frameworks used by:

- Professional AI influencer creators
- AI portrait photography services
- Character consistency pipelines in production apps
- Any published research on prompt engineering for human image generation

### 8. Composition Template Images

We're considering creating a **template reference image** — like a stick figure or silhouette on the correct background with labels/annotations showing where the person should be, what the framing should look like, etc. Then passing this template as a reference image alongside the text prompt so Gemini has a visual guide for composition, not just text instructions.

- Would this work? Does Gemini understand annotated/labeled template images?
- Would a simple silhouette outline on a white background help with framing consistency?
- Or would a more detailed wireframe-style template be better?
- How should the template be designed — just shapes? Labels? Arrows? Grid lines?
- Are there better ways to control composition than a template image?
- We know Gemini's `generateContent` accepts multiple `inlineData` items in contents — could we pass BOTH a composition template AND a face reference image? How would the prompt need to be structured to make Gemini understand which image is for what?
- The `generateImages` (Imagen) API has `seed`, `negativePrompt`, `guidanceScale`, and `personGeneration` params — but we're using `generateContent` on Gemini Pro. Are we using the wrong API? Should we switch to Imagen for more control? Or is the Gemini `generateContent` approach better for realism despite fewer params?

### 9. What Am I Not Asking About?

This is the most important section. **What questions should I be asking that I'm not?** What concepts, techniques, tools, or approaches exist that I clearly don't know about based on the questions above? Examples of things I might be missing:

- Gemini-specific API parameters that affect image quality (temperature, seed, etc.)
- Prompt engineering techniques specific to Google's models vs general advice
- Ways to control the generation process that aren't just "write a better prompt"
- Pre-processing or post-processing steps that dramatically improve results
- Entirely different architectural approaches to this problem
- Known limitations of Gemini for this use case that I should work around
- Community resources, Discord servers, research papers, or tools I should know about

## Output Format

Please organize your findings as a practical reference document I can give to my developer. Include:

- **Template prompts** they can directly implement (with `{{variable}}` placeholders)
- **Do/Don't lists** for each category
- **Before/After examples** showing how to improve prompts
- **Specific keyword recommendations** ranked by effectiveness
- **A recommended prompt architecture** showing the exact structure we should use
- **"You're wrong about..." section** — explicitly list every assumption of ours that's incorrect and why

Focus on PRACTICAL, IMPLEMENTABLE advice. I don't need theory — I need prompt templates and keyword lists my developer can code into the app today.

## Context on our tech

- Model: Google Gemini `gemini-3-pro-image-preview` (Nano Banana Pro)
- API: `@google/genai` Node.js SDK
- Safety filters: All set to `BLOCK_NONE`
- Reference images passed via `inlineData` (base64)
- Response modalities: `["TEXT", "IMAGE"]`
- We generate 4 images in parallel currently
- Images are uploaded to S3 and served via signed URLs
- We also use Grok (xAI) as a prompt enhancement layer for freeform descriptions — is this a good idea or adding unnecessary complexity?
