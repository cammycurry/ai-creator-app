# Deep Search Research Brief — realinfluencer.ai

> Give this entire document to Claude deep search (web). It has zero context on the product, so everything it needs is here.

---

## What This Product Is

**realinfluencer.ai** is a consumer SaaS where users create custom AI influencer personas and then generate unlimited content as those personas — photos, videos, talking-head clips, Instagram carousels. One app handles the full pipeline: character creation → image generation → video → voice → lip sync → metadata stripping → download.

The key insight: running an AI influencer today requires 5+ separate tools (Midjourney/Flux for images, Kling for video, ElevenLabs for voice, CapCut for editing, manual metadata removal). We collapse that into one product with character consistency built in.

**Business model:** Usage-based credits, not flat subscriptions. Every generation costs credits because every generation costs real API money. Plans from Free ($0, 10 credits/mo) to Unlimited ($99/mo, 1,000 credits/mo). Plus one-time credit packs ($5–$89).

**Companion course** ($197) teaches the manual AI influencer workflow. The app is the "graduate to this" moment — course → app subscription → bundle pricing.

---

## What's Built (Shipped Features)

### Creator Studio (Character Creation)
- Visual wizard: pick gender, age, ethnicity, build, hair, face shape, style
- OR describe in plain text: "25 year old latina, long dark wavy hair, athletic, warm fitness influencer vibe"
- OR upload reference photos with two modes:
  - **Exact look** — recreate that person
  - **Inspired by** — take the vibe, create someone entirely new
- AI generates 4 variations → user picks one → character is locked
- Character consistency via reference image system (up to 14 refs passed to model per generation)
- Same face, same body, every single time across unlimited content

### Pre-Made Creator Library
- 12+ ready-to-go AI influencers across niches (Fitness, Lifestyle, Beauty, Fashion, Travel)
- Zero setup — pick one and start generating immediately
- Free to browse, costs credits to customize
- Natural upgrade path: try a pre-made free → want your own → upgrade to paid plan

### Content Generation
- Type a prompt OR pick from 14 templates across 4 categories (Fitness, Lifestyle, Aesthetic, UGC)
- AI prompt enhancement: user types "coffee shop vibes" → professional AI photography director writes the real prompt (free, automatic)
- Generates 1–4 images per request
- ~10 seconds per generation
- Every download has AI metadata stripped and iPhone EXIF injected — looks like it came from an iPhone 15 Pro

### Template Library (14 templates, 4 categories)
**Fitness:** Gym Mirror Selfie, Workout Action, Progress Check, Post-Workout
**Lifestyle:** Morning Coffee, Outfit of the Day, Golden Hour Portrait, Cozy at Home
**Aesthetic:** Mirror Selfie, Beach Day, Car Selfie, Getting Ready
**UGC:** Holding Product, Product Review

### Instagram Carousels (Designed, Building Next)
- Structured 3–10 slide carousel generation
- Format library: Photo Dump (Gym Day, City Day, Beach Day), Outfit Showcase, GRWM, Day in the Life, Product Feature, Spicy Progression
- Per-slide regeneration with feedback
- Instagram phone mockup preview with swipe
- AI caption assistant with tone chips ("Make it spicier", "Add CTA", "Shorter")
- Data-backed: carousels get 10% engagement vs 7% for single photos and 6% for Reels

### Planned / Coming Soon
- **Video generation** — Kling 3.0 via Fal.ai (5s and 10s clips from any photo)
- **Voice/TTS** — ElevenLabs Turbo v3 (custom voices per creator)
- **Lip sync** — Hedra/MuseTalk (talking-head ads, reviews, tutorials)
- **Upscaling** — Clarity Upscaler (1080p → 4K)
- **Recreate from URL** — paste a TikTok/Reel URL → AI recreates the concept with your creator
- **Batch generation** — generate 10–50 pieces in one go
- **AI agents** — programmatic API access so AI agents can use the platform to autonomously run influencer accounts

### Billing & Credits
- 4 plans: Free (10 credits), Starter $19/mo (100 credits, 3 custom creators), Pro $49/mo (300 credits, 10 creators), Unlimited $99/mo (1,000 credits, unlimited creators)
- Credit packs: 25 for $5, 100 for $15, 350 for $45, 800 for $89
- Credit costs: 1 per image, 5 for creator wizard, 3 for 5s video, 5 for 10s video, 2 for voice, 5 for lip sync
- Course bundles: Course only $197, Course + Starter 3mo $247, Course + Pro 3mo $297

### Metadata Stripping
- Every download has C2PA and SynthID markers stripped
- iPhone EXIF data injected (Make: Apple, Model: iPhone 15 Pro, GPS from real cities)
- Output is indistinguishable from a real iPhone photo in metadata inspectors

---

## Competitive Landscape (What We Know)

### Direct Competitors
| Platform | What They Do | Weakness |
|---|---|---|
| Glambase | AI influencer builder | Still beta, no polish |
| TheInfluencer.ai | AI influencer SaaS ~$99/mo | Mediocre consistency |
| Arcads | AI UGC ads, ~$11/video | Ad-only, no creator persona system |
| MakeUGC | AI UGC generation | Ad-focused, limited stock avatars |
| HeyGen | AI video avatars | Stock avatars only, no custom from-scratch |
| Creatify | AI UGC generator | Ad-focused, not creator lifecycle |
| Higgsfield | AI UGC + influencer gen | Newer, Soul ID promising but unproven |
| Argil | AI clones for UGC | Need a real person to clone |

### Adjacent Players
- **Fanvue** — $65M ARR (450% YoY growth), monetization platform for AI creators. Top AI creators earn $10K–50K/month.
- **SideShift** — $2.4M ARR, 800K+ human creators, 1,000+ brands. UGC marketplace. AI is a natural expansion.
- **Midjourney** — great quality but NO production API (dealbreaker for SaaS)
- **ComfyUI + Flux + LoRA** — the "pro" manual workflow. Steep learning curve. This is what courses teach.

### Our Advantages
1. Custom AI influencers built from scratch (not stock avatars shared with everyone)
2. Full pipeline in one app (image → video → voice → lip sync → metadata strip → download)
3. Character consistency across unlimited generations (reference image system)
4. Course → app flywheel (teach the manual way, then automate it)
5. Usage-based pricing (pay for what you generate, not what you might)
6. Metadata stripping (no AI fingerprints, looks like iPhone photos)

---

## What I Need Researched

### 1. WHO IS BUYING AI INFLUENCER TOOLS RIGHT NOW?

I need to understand the actual buyers, not theoretical personas. Find:

- **Reddit communities** where people discuss running AI influencer accounts — what subreddits, what are the recurring complaints, what tools do they mention?
- **Twitter/X accounts** that openly discuss AI influencer monetization — who are the biggest voices? What are they selling?
- **Discord communities** around AI influencer creation — where do operators hang out?
- **YouTube channels** teaching AI influencer creation — who has the most views? What questions come up in comments?
- **Facebook groups** for AI content creation, AI influencers, or OFM (OnlyFans Management)
- **Telegram groups** — especially for spicy/adult AI content creators
- **Course sellers** — who is selling AI influencer courses and for how much? What do their funnels look like?

### 2. SPICY / ADULT AI CREATOR ECONOMY

This is a massive market segment I need to understand deeply:

- **Fanvue stats** — latest numbers on AI creator earnings. What niches earn the most? What's the average? What's the top 1%?
- **AI girlfriend / companion apps** — who are the biggest players? (Candy.ai, DreamGF, Kupid AI, etc.) What do they charge? How big is this market?
- **Spicy AI influencer accounts** — find real examples on Instagram, TikTok, Twitter. How many followers? What content do they post? How do they monetize?
- **OFM agencies using AI** — are agencies already using AI-generated content? How? What's their workflow? What are the pain points?
- **Platform policies** — what are Instagram, TikTok, Twitter, Fanvue, and other platforms' current policies on AI-generated content? Are people getting banned? What's the enforcement reality vs. stated policy?
- **Legal landscape** — EU AI Act Article 50 (effective August 2, 2026), US regulations, platform-specific rules. What's the real risk for operators?
- **Revenue data** — documented cases of AI influencers making real money. I've seen claims of $100K in 45 days with under 8K followers. What else is out there? Verified numbers only.

### 3. PAIN POINTS & UNMET NEEDS

What are people struggling with RIGHT NOW when trying to run AI influencer accounts?

- **Character consistency** — this is supposedly the #1 pain point. Verify. What workarounds are people using? How much time/money do they spend on it?
- **Multi-tool chaos** — how many tools does a typical AI influencer operator use? What's the actual stack? (Midjourney/Flux + Kling + ElevenLabs + CapCut + metadata tool + etc.)
- **AI detection** — are people getting flagged/banned? How? What tools detect AI content? What workarounds exist?
- **Content volume** — how much content does a successful AI influencer need per day/week? What's the bottleneck?
- **Prompt engineering** — are people still manually writing prompts from scratch? Is this a real barrier?
- **Video gap** — how badly do image-only operators need video? Is video table stakes in 2026?
- **Cost** — what are people spending per month on their AI influencer tool stack? $50? $200? $500?

### 4. DISTRIBUTION & GROWTH CHANNELS

How should we actually get users?

- **What's working for AI SaaS tools in 2026?** — SEO? TikTok? Twitter? YouTube? Reddit? Paid ads?
- **AI influencer tool reviews** — where do people go to compare tools? What review sites or YouTube channels cover this space?
- **Affiliate programs** — what commission rates are competitors offering? What structures work?
- **Course-to-product funnels** — are there examples of course sellers successfully converting students to app users? What's the conversion rate?
- **Community-led growth** — Discord servers, Skool communities, Facebook groups that drive SaaS signups
- **Content marketing angles** — what blog posts/videos about AI influencers get the most traffic? What keywords have volume?
- **Influencer marketing** — can AI influencer tools use AI influencers to market themselves? (meta, but is anyone doing it?)

### 5. PRICING & MONETIZATION INTELLIGENCE

- **What are people willing to pay?** — survey data, forum discussions, competitor pricing experiments
- **Credit-based vs subscription** — are there examples of credit-based AI tools succeeding? (Midjourney uses subscriptions, not credits)
- **Bundle pricing** — course + tool bundles in adjacent spaces (not just AI influencers). What price points convert?
- **Enterprise / agency pricing** — what would agencies pay for a managed AI content pipeline? $500/mo? $2,000/mo?
- **Marketplace take rates** — if we build a marketplace where brands hire AI creators, what's the standard take rate?

### 6. FUTURE: AI AGENTS AS USERS

This is our longer-term play. Research:

- **AI agents that run social media accounts** — does this exist yet? Who's building it?
- **Autonomous content creation pipelines** — AI that decides what to post, generates it, posts it, engages with comments
- **API-first AI content tools** — who offers APIs for AI content generation that agents could use?
- **The "agentic economy"** — what's the latest thinking on AI agents as economic actors? Are there platforms designed for agent-to-agent commerce?
- **Would our platform be useful to AI agents?** — if an AI agent wanted to run 100 Instagram accounts simultaneously, what would it need from our API?

### 7. MARKETING ANGLES THAT COULD GO VIRAL

Help me find the spiciest, most attention-grabbing angles:

- **"I made $X with an AI influencer"** — find real documented case studies with numbers
- **"This Instagram model isn't real"** — the reveal format. Has this been done? What went viral?
- **"I replaced my UGC team with AI"** — brand perspective on AI UGC
- **Before/after** — showing the AI creation process (wizard → generated content → posted on Instagram)
- **Speed runs** — "I created an AI influencer and got 10K followers in X days"
- **Controversy angles** — AI influencers stealing jobs, ethical debates, platform bans. What's the discourse?
- **Money angles** — the fact that AI influencers have zero overhead (no flights, no photoshoots, no wardrobe)
- **Scale angles** — one person running 10 AI influencer accounts simultaneously from their laptop

### 8. SEO & CONTENT STRATEGY

What should we be publishing to drive organic traffic?

- **High-volume keywords** — "AI influencer", "AI influencer generator", "create AI influencer", "AI UGC", "virtual influencer" — what's the actual search volume and competition?
- **Long-tail opportunities** — "how to make an AI influencer on Instagram", "best AI influencer tools 2026", "AI influencer monetization"
- **Comparison content** — "[our product] vs Arcads", "[our product] vs HeyGen" — do these queries exist?
- **Tutorial content** — what AI influencer tutorials get the most views? What formats work?
- **Programmatic SEO** — could we generate pages for each niche ("AI fitness influencer generator", "AI fashion influencer creator")?

---

## The Big Question

**How do we make this thing sell like hotcakes?**

We have a product that's genuinely differentiated (custom characters, full pipeline, consistency, metadata stripping, course flywheel). The features are strong. But features don't sell products — positioning, distribution, and urgency do.

I need to understand:
1. Where the buyers ARE right now (which platforms, communities, channels)
2. What language they use (what pain do they describe, what outcome do they want)
3. What triggers a purchase (what moment makes someone go from "interested" to "shut up and take my money")
4. What objections they have (and how to counter them)
5. What pricing model makes them feel smart, not ripped off
6. What social proof they need to see (case studies, before/after, revenue screenshots)

---

## Output Format

Structure your research as:

1. **Executive Summary** — the 5 most important findings
2. **Audience Segments** — who's buying, ranked by willingness to pay
3. **Pain Points** — what's broken, ranked by severity
4. **Distribution Channels** — where to find buyers, ranked by ROI
5. **Pricing Intel** — what the market will bear
6. **Marketing Angles** — the 10 best hooks for content/ads
7. **SEO Opportunities** — keywords and content ideas
8. **Competitive Gaps** — what nobody else is doing that we should
9. **Risks** — legal, platform, technical risks to watch
10. **Recommended Next Steps** — prioritized action items

Go deep. I want specifics — real numbers, real URLs, real community names, real competitor pricing. Not vague generalizations.
