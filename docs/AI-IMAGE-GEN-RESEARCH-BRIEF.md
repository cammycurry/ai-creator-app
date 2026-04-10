# Deep Research Prompt — Realistic AI Human Image Generation Landscape

> Copy everything below the line and paste it into Claude online as a single message.
> Ask Claude to do "extended thinking" or "deep research" on this.

---

I'm building a SaaS app that creates hyper-realistic AI influencer personas — virtual humans that look indistinguishable from real people in photos. I need a comprehensive research report on the current state of realistic AI human image generation as of early-mid 2026.

**IMPORTANT: I have strong opinions and assumptions baked into my current approach. I need you to actively challenge them. For every section, don't just answer what I ask — tell me what I'm wrong about, what I'm missing entirely, and what the smartest people in this space are doing differently. I don't know what I don't know, and that's what I'm most worried about.**

## Our current approach & assumptions (challenge ALL of these)

Here's what we're doing and why. Tell me where we're wrong:

1. **We're all-in on Gemini `gemini-3-pro-image-preview` (Nano Banana Pro)** — we chose it because an AI influencer course recommended it as the best for realism. Is it still the best? Was it ever? Are we missing better options?

2. **We banned Flux entirely** — someone told us Gemini is just better. Should we reconsider? Is Flux actually better for certain parts of the pipeline (e.g., variations, specific poses)?

3. **We use a single model for everything** — base generation, variations, validation scenes. Should different stages use different models? Would a multi-model pipeline produce better results?

4. **We're doing text-only generation for the initial 4 options** — then using the chosen one as a reference image for variations. Is text-only the right starting point? Or should we be using some other technique from the start?

5. **We assume reference image + text prompt is sufficient for consistency** — we pass the base image as `inlineData` and say "that woman from the reference image." Is this actually how production apps solve consistency? Or are they doing something fundamentally different (LoRA, IP-Adapter, face embeddings, etc.)?

6. **We assume all 4 initial images should look different** — so the user picks their favorite face. But maybe the better UX is generating 1 face and showing 4 variations of it? We don't know which approach users actually prefer or which produces better results.

7. **We use Grok (xAI) as a prompt enhancement layer** for freeform descriptions before passing to Gemini. Is this a good idea? Does running the prompt through an LLM actually improve image output, or does it add latency and introduce drift?

8. **We strip AI metadata (C2PA, SynthID) and inject fake iPhone EXIF** — we use sharp to re-encode and add Apple EXIF. Is this sufficient? Is there hidden metadata we're missing? Are there better approaches?

9. **We assume upscaling is a separate future step** — we haven't built it yet. Is upscaling actually mandatory for production quality, or are modern models generating high enough resolution natively?

10. **We're using safety filters set to BLOCK_NONE** — is this the right approach? Are there edge cases where this causes problems? Do other models handle content policy differently in ways that might be better?

## What I need researched

### 1. Model Comparison — Who's Actually Best at Realistic Humans?

Do a deep comparison of these models specifically for **photorealistic human portrait generation** (not art, not landscapes — just realistic humans):

**Google Gemini Image Models:**
- `gemini-3-pro-image-preview` (Nano Banana Pro) — what we currently use
- `gemini-2.0-flash-preview-image-generation` (Nano Banana 2 / NB2)
- Any other Gemini image models available in 2026
- What are the actual differences? Which is better for realism? Speed? Consistency?
- How do their safety filters compare? Can they all do BLOCK_NONE?
- Are there quality/resolution differences between them?
- Does one handle reference images (inlineData) better than the other?
- **Are there Gemini API parameters we might not know about** that affect image quality? (seeds, temperature, guidance scale, etc.)

**Other Major Players:**
- **Flux** (Black Forest Labs) — Flux Pro, Flux 1.1 Pro, Flux Ultra. How do they actually compare for realism? We banned it — should we un-ban it?
- **Stable Diffusion 3.5 / SDXL** — still relevant? How do they compare?
- **Midjourney v6/v7** — better for stylized, but how's their realism now?
- **DALL-E 3 / GPT-Image** — OpenAI's latest image gen capabilities
- **Ideogram 3** — what's their strength?
- **Recraft v3** — photorealism claims?
- **Higgsfield Soul** — specifically for fashion/lifestyle AI humans
- **Leonardo AI** — their PhotoReal model specifically
- **Any models I'm not listing that I should know about?**

For each model, I need:
- Realism quality rating for human faces (1-10)
- Consistency across generations (can you get the same person twice?)
- Reference image support (can you pass in a photo and get the same person?)
- Safety filter strictness (will it generate attractive humans in minimal clothing?)
- API availability and pricing
- Resolution / quality ceiling
- Speed (time per generation)
- **What it's uniquely good at** that others aren't

### 2. The Consistency Problem — How Do People Actually Solve It?

This is the #1 technical challenge. When you generate 4 images of "a 25-year-old brunette woman", you get 4 completely different people. How do production apps and professional AI creators solve this?

**Our current approach:** Generate 4 text-only → user picks 1 → use as reference image for future gens. **Is this the right approach, or is there something fundamentally better?**

Research these approaches:

**Reference Image Anchoring:**
- How does image-to-image generation work across different models?
- What's the best practice — generate 1 base, then use it as reference for all future gens?
- How much prompt text should accompany a reference image? (minimal vs. detailed)
- Does repeating appearance details in the prompt help or hurt when a reference image is provided?

**Face/Identity Preservation Technologies:**
- IP-Adapter, InstantID, PhotoMaker, FaceSwap — what are these and how do they work?
- Which ones work with which models?
- Are any of them available via API (not just local ComfyUI)?
- How do commercial apps like Lensa, Dawn AI, Remini implement consistency?
- **Are any of these usable with Gemini, or only with SD-based models?**
- **Should we be using one of these instead of simple reference image passing?**

**LoRA / Fine-Tuning Approaches:**
- Training a LoRA on a specific face — is this still the gold standard?
- How many images do you need? How long does training take?
- Can you train LoRAs for Gemini models or only SD-based models?
- What about DreamBooth?
- **Is per-creator fine-tuning feasible at SaaS scale, or is it too expensive/slow?**

**Sequential Generation Pipelines:**
- Generate base → use as reference → generate variations — does this actually produce consistent results?
- What's the failure rate? How often does the "same person" actually look different?
- Any research on optimal pipeline structure?

**What Production Apps Actually Do:**
- How does Arcads handle character consistency?
- How does HeyGen create consistent avatars?
- How does Synthesia maintain identity across videos?
- How does Character.AI or similar platforms handle visual consistency?
- Any open-source projects that solve this well?

**Composition Template Images:**
- We're considering creating a template reference image (silhouette/wireframe on correct background) and passing it alongside the text prompt as a visual composition guide. Would this work? Does Gemini understand template/annotated images?
- Can we pass MULTIPLE reference images (e.g., composition template + face reference) and have the model understand each one's purpose?
- Is this a known technique, or are we inventing something stupid?

**API Choice — generateContent vs generateImages:**
- We're using Gemini `generateContent` with `responseModalities: ["TEXT", "IMAGE"]` — but there's also a `generateImages` (Imagen) API that has `seed`, `negativePrompt`, `guidanceScale`, `personGeneration` params. Are we using the wrong API? Which produces better realistic humans? Can the Imagen API use reference images?

**What Am I Not Considering?**
- Are there consistency techniques I haven't mentioned that are obvious to people in this space?
- Face embedding databases? Latent space manipulation? Guided diffusion?
- Is there a technique that's "the obvious answer" that I'm clearly not aware of?

### 3. Realism Techniques — What Actually Works?

Research the state of the art for making AI-generated humans look real:

**Prompt Engineering for Realism:**
- What keywords/phrases consistently improve photorealism across models?
- "Raw iPhone photography" — is this actually effective? Why? Is there something better?
- "Visible pores", "skin texture", "imperfections" — help or hurt?
- Does mentioning what to AVOID (e.g., "no airbrushing") actually work or backfire?
- Negative prompting — which models support it and does it help?
- Structured prompts vs natural language — which produces better results?
- Is there an optimal prompt length for realism?
- **What do the people getting the best results actually put in their prompts?** Not theory — actual working prompts from top creators.

**Post-Processing Pipeline:**
- Upscaling — what tools/models are best? (Lupa, Topaz, Real-ESRGAN, etc.)
- Does upscaling actually improve perceived realism or just resolution?
- Face restoration models — GFPGAN, CodeFormer, RestoreFormer
- Metadata stripping — what metadata marks images as AI-generated? (C2PA, SynthID, EXIF) Are we missing any markers?
- Color grading / film grain — do these post-processing steps help fool the eye?
- **Is there a standard post-processing pipeline that everyone uses? What does it look like step by step?**

**Common AI Tells (and how to fix them):**
- What are the most common giveaways that an image is AI-generated in 2026?
- Hands — still a problem? How do different models handle them?
- Eyes — what makes AI eyes look "dead" and how to fix it?
- Skin — over-smoothing, plastic look, uncanny valley
- Hair — common artifacts?
- Teeth — AI teeth problems?
- Background bleeding into subject
- Symmetry being too perfect
- Lighting inconsistencies
- **What tells are we probably not aware of** that trained eyes catch immediately?

### 4. The Creator/Influencer Use Case Specifically

Research how people are actually using AI image generation to create virtual influencers in 2026:

**Current Workflows:**
- What does a typical AI influencer creation pipeline look like?
- How are the top AI influencer accounts (Aitana Lopez, Lil Miquela, etc.) being produced?
- What tools do professional AI creators use? What's their actual tech stack?
- How many images does a typical creator generate per final post?
- **What's the rejection rate?** How many generations get thrown away before they get a good one?

**Content Variety Without Identity Loss:**
- How do creators generate the same person in different outfits, poses, locations?
- What's the success rate? How much do they have to regenerate/cherry-pick?
- Outfit swapping — what techniques work best?
- Scene/environment changes while maintaining identity
- Different camera angles of the same person

**Body Consistency (not just face):**
- Face consistency is one thing — how about body type, proportions, height?
- Do reference images preserve body type or just facial features?
- How do you maintain consistent body proportions across generations?

**Scale & Efficiency:**
- Professional creators who post daily — what's their generation volume?
- How do they manage reference images and prompt libraries?
- Any tools or workflows for batch generation?
- What's the typical cost per month for a professional AI influencer account?

**What's the state of AI detection?**
- Can platforms (Instagram, TikTok) detect AI-generated images now?
- What detection methods exist and how reliable are they?
- Is metadata stripping sufficient, or are there pixel-level detection methods?
- Does this affect the viability of AI influencers as a business?

### 5. API & Platform Comparison for Production Apps

For building a SaaS product, compare the practical aspects:

**API Options:**
- Google Gemini API — pricing, rate limits, image quality, safety filters
- Fal.ai — what models do they host? Pricing? Quality?
- Replicate — model selection, pricing, speed
- Together AI — image generation capabilities?
- RunPod / Modal — for self-hosted models
- Direct model APIs (Flux API, Midjourney API if it exists, etc.)
- **Any platforms I'm not listing that I should know about?**

**Cost Analysis:**
- Per-image cost across providers and models
- How does cost scale with quality/resolution?
- What do production apps spend per user per month on generation?
- Cheapest path to production-quality realistic humans?
- **Is our current approach (Gemini API direct) the most cost-effective, or should we be using a proxy/aggregator like Fal.ai or Replicate?**

**Platform Features:**
- Which platforms support reference image input?
- Inpainting / outpainting support?
- Batch generation?
- Async vs sync generation?
- Upscaling built-in or separate?

### 6. Multi-Model Pipeline Architecture

**This is something I suspect I should be doing but don't know how:**

- Should different stages of the pipeline use different models?
- Example: Gemini for base generation → Flux for variations → ESRGAN for upscaling → CodeFormer for face restoration?
- What does an optimal multi-model pipeline look like for AI influencer content?
- What are the trade-offs of multi-model vs single-model?
- How do production apps architect their generation pipelines?

### 7. Emerging Tech & What's Coming

- What's on the horizon for AI image generation in 2026-2027?
- Any new models or techniques specifically targeting human realism?
- Video generation from images — current state? (Kling, Sora, Veo, Hailuo)
- Real-time generation — is it fast enough for interactive apps yet?
- Multi-modal generation (text + image + video in one pipeline)
- **What should I be building toward** even if it's not ready yet?

### 8. What Am I Not Asking About?

**This is the most important section.** Based on everything above, what questions should I be asking that I'm clearly not? What concepts, tools, techniques, or approaches exist that are obvious to someone deep in this space but that I'm clearly unaware of?

Think about:
- Fundamental architectural decisions I might be getting wrong
- Industry-standard tools or libraries I should know about
- Communities, Discord servers, subreddits, or resources where this knowledge lives
- Research papers or blog posts that are considered essential reading
- Business model considerations (legal, ethical, platform policy) I should be aware of
- Technical debt I'm building up that will bite me later
- Scaling challenges I'll hit and should plan for now

## Output Format

Organize as a practical reference document, not an academic paper. I need:

1. **Model Tier List** — ranked specifically for realistic human generation, with scores
2. **"You're Wrong About..." Section** — explicitly list every assumption of mine that's incorrect and what the right approach is
3. **Consistency Solutions Matrix** — technique vs. quality vs. difficulty vs. cost
4. **Realism Keyword Database** — what works, what doesn't, organized by model
5. **Production Pipeline Recommendation** — "if you're building a SaaS app that generates realistic humans, here's exactly what you should use and why"
6. **Cost Breakdown** — realistic cost estimates for different quality tiers
7. **"Things You Didn't Ask About" Section** — the unknown unknowns, ranked by importance
8. **Action Items** — specific things I should test/implement, prioritized
9. **Required Reading List** — resources I need to study

Be opinionated. Don't just list options — tell me what the best approach is based on the evidence. I'm a solo developer building a product, not a researcher writing a paper. I need decisions, not options. If I'm doing something stupid, tell me directly.
