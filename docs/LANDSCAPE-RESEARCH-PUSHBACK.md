# Pushback on "The Definitive Guide to Building an AI Influencer SaaS in 2026"

> Paste this back into the same Claude conversation as a follow-up message.

---

I appreciate the depth of this research but I think you hallucinated or got wrong several critical things. I've been hands-on building this product and testing these models daily. Let me push back and I need you to verify your claims or correct them.

## 1. Gemini Model Version — You Said It Was Deprecated?

You claim `gemini-3-pro-image-preview` was "deprecated on March 9, 2026." I'm actively using this model right now and it works fine. Can you verify this claim with an actual source? What's the actual current state of Gemini image generation models?

Also, you mention "Seedream-based models" in passing but never actually explain what SeedDream is. SeedDream is the underlying image generation architecture powering Gemini's native image generation — and it's been iterating fast. I believe we're on SeedDream 5 now. This seems like a massive omission. Can you research SeedDream specifically — versions, capabilities, how it compares to diffusion-based models like Flux, and why Google chose this architecture?

## 2. Your Gemini Pricing Is Wrong

You say Gemini costs $0.134/image. Where did you get this number? The Gemini API pricing for image generation through `generateContent` is based on token costs, not a flat per-image rate. Can you show your math? Because I've been generating thousands of images and my costs are nowhere near that.

Also compare this properly — Gemini generates images as part of a multimodal `generateContent` call. The pricing model is fundamentally different from dedicated image APIs like Flux. You can't just compare flat per-image rates when one is a multimodal API and the other is a dedicated image endpoint.

## 3. I've Actually Tested These Models — NBPro Wins

You ranked FLUX 2 Max and Higgsfield Soul as S-tier and Gemini as B+. I've been testing multiple models hands-on for weeks. Nano Banana Pro (Gemini) produces the most photorealistic human faces I've seen from any model. The realism — skin texture, pores, natural lighting, the way hair catches light — is consistently better than what I've gotten from Flux.

Can you provide actual evidence (benchmark studies, blind comparisons, controlled tests) for your ranking? Or is this based on general community sentiment and marketing materials? Because my hands-on testing contradicts your tier list.

## 4. FLUX Kontext Pro — Is It Really That Good for Faces?

You claim FLUX Kontext Pro is "the missing piece in my stack" with 90-93% identity fidelity. But:
- What's your source for that 90-93% number?
- Is Kontext Pro optimized for photorealistic human faces specifically, or is it a general-purpose image editing model?
- How does it handle skin texture and realism compared to Gemini's native output?
- You say it costs $0.04/image — is that through fal.ai? What about rate limits?
- Has anyone done a direct Kontext Pro vs Gemini comparison specifically for AI influencer portrait generation?

I'm not opposed to trying it, but "abandon your working model for this one" is a big claim that needs evidence.

## 5. The "Ban Flux" Pushback

You say banning Flux was "the single biggest mistake in our architecture." But I banned it based on actual testing where Gemini produced better results for our specific use case (photorealistic human portraits). You seem to be conflating "Flux has a bigger open-source ecosystem" with "Flux produces better faces." Those are different claims.

Can you find any blind comparison studies or benchmarks specifically comparing Flux vs Gemini for photorealistic human face generation quality? Not artistic quality, not text rendering, not general image quality — specifically human faces that look like real photos.

## 6. Your Safety Filter Claims

You say Gemini has "brutal safety restrictions" and "hard blocks remain" even with BLOCK_NONE. In my experience, I've been generating attractive women in sports bras with BLOCK_NONE without issues. The safety filter concern seems overstated for my use case. Can you clarify exactly what IS hard-blocked vs what BLOCK_NONE actually disables?

## 7. The Grok Enhancement Take

You say to "remove Grok prompt enhancement layer" and replace with static templates. But you also say in the first doc (prompt engineering guide) that "using another LLM to transform simple user inputs into rich, structured prompts is standard industry practice and dramatically improves results." These are contradictory recommendations. Which is it?

My use case for Grok: users type casual descriptions like "hot blonde at the beach." The LLM translates that into a structured, detailed prompt. Static templates can't handle freeform user input. So this recommendation seems wrong for my specific use case.

## 8. Things I Think You Got Right (Keep These)

To be clear, I'm not dismissing everything. These parts were valuable:
- The consistency solutions matrix — even if the specific numbers are uncertain, knowing about Kontext, LoRA, PuLID, InstantID as options is useful
- The face-swap + face-restore post-processing concept as a QC fallback
- The cost analysis framework (even if specific numbers need verification)
- The EU AI Act / C2PA warning (I'll think about this)
- The community resources list
- The concept of a multi-model pipeline
- The ArcFace face similarity scoring for QC

## What I Need From You Now

1. **Verify or correct your Gemini pricing and deprecation claims** with actual sources
2. **Research SeedDream specifically** — versions 1 through 5, what changed, why it matters for my use case
3. **Find actual blind comparison data** between Gemini/SeedDream and Flux for photorealistic human face generation — not marketing, not community sentiment, actual controlled comparisons
4. **Revise your model tier list** accounting for the possibility that your Gemini ranking is based on outdated or incorrect information
5. **Be honest about what you actually know vs what you inferred** — several of your claims read like confident assertions built on uncertain foundations. Flag your confidence level on each major claim.

I'd rather have an honest "I'm not sure, here's what I could find" than a confidently wrong recommendation that sends me down the wrong path.
