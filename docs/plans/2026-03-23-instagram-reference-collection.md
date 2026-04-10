# Instagram AI Creator Reference Collection — Handoff Doc

> **Owner:** TBD (not the main dev — this is a research/data task)
> **Goal:** Build a structured dataset of real AI influencer accounts + their best content for use as reference material in our image generation pipeline
> **Date:** 2026-03-23

---

## Why We Need This

We're building an AI influencer creation app. To make great output, we need to study what's actually working on Instagram — what poses, compositions, outfits, settings, lighting, and styles get engagement. This reference set informs:

1. **Pre-made creator library** — our app ships with ~50 ready-to-use AI creators. We need diverse, proven archetypes.
2. **Composition templates** — silhouette references that control framing/pose during generation
3. **Content prompt library** — curated prompts that produce specific styles (beach shoot, gym selfie, cozy at home, etc.)
4. **Style training** — understanding what "good" AI influencer content looks like vs. obviously fake

---

## What To Collect

### Level 1: Account-Level Data

For each AI influencer account you find:

```
Account:
  handle: @username
  follower_count: ~number
  niche: fitness | lifestyle | beauty | fashion | travel | gaming | adult | mixed
  gender: female | male
  apparent_age: 18-25 | 25-30 | 30+
  ethnicity: european | latina | asian | black | middle-eastern | mixed
  body_type: slim | athletic | curvy | plus-size
  hair: blonde long wavy (freeform)
  vibe: sexy-confident | girl-next-door | glamorous | edgy | cute-playful | elegant
  quality_rating: 1-5 (how realistic/consistent are their images?)
  consistency_rating: 1-5 (does it look like the same person across posts?)
  engagement_rate: low | medium | high (rough estimate from likes/comments vs followers)
  notes: anything notable — what makes this account work or not work
  tool_suspected: which AI tool they likely use (if obvious from artifacts)
```

### Level 2: Post-Level Data

For each account's **best 10-20 posts** (highest engagement, best quality):

```
Post:
  account: @username
  post_url: https://instagram.com/p/xxxxx
  image_url: (downloaded locally)
  type: portrait | full-body | close-up | lifestyle | outfit | selfie
  setting: studio-white | studio-dark | outdoor-urban | outdoor-nature | indoor-home | indoor-gym | beach | pool
  outfit: sports-bra | bikini | dress | casual | lingerie | workout | formal | none
  pose: standing-front | standing-3/4 | sitting | lying | walking | over-shoulder | side-profile
  composition: head-only | bust-up | waist-up | full-body | environmental
  lighting: studio-soft | natural-golden | natural-overcast | ring-light | dramatic | backlit
  expression: smile | serious | sultry | playful | surprised | candid
  quality_rating: 1-5
  is_good_reference: yes | no (would we want to generate content like this?)
  notes: what makes this specific image good or bad
```

### Level 3: Downloaded Assets

```
reference-dataset/
  accounts/
    @username/
      account.json          ← Level 1 data
      posts/
        post-001.json       ← Level 2 data
        post-001.jpg        ← Downloaded image (1080px or original)
        post-002.json
        post-002.jpg
        ...
  summary.json              ← Index of all accounts + stats
```

---

## How To Find Accounts

### Search Strategy

1. **Hashtags:** `#aiinfluencer`, `#aimodel`, `#aigirl`, `#virtualinfluencer`, `#aiart`, `#aigenerated`, `#aibeauty`
2. **Explore page:** Instagram's algo will start suggesting similar accounts once you engage with a few
3. **Known accounts:** Start with well-known AI influencers (Aitana López, Lil Miquela, etc.) and branch out from their followers/suggested
4. **Reddit/Twitter:** r/aicreations, r/stablediffusion — people share their accounts
5. **AIAC community:** The AI Influencer Academy Discord/community will have active creators

### Target: 50-100 Accounts

Prioritize diversity:
- At least 10 male creators
- Mix of ethnicities (don't just collect blonde Europeans)
- Mix of niches (not just thirst traps — include lifestyle, fashion, fitness)
- Range of quality (some bad examples help us know what to avoid)
- Different body types
- Different content styles (studio vs lifestyle vs candid)

---

## Tools & Approach

### Option A: Manual + Browser Extension (Recommended to Start)

1. Browse Instagram normally in Chrome
2. Use a browser extension like **IG Downloader** or **SaveIG** to download images
3. Fill in the JSON metadata by hand or in a spreadsheet
4. Convert spreadsheet → JSON at the end

**Pros:** No API needed, no risk of account bans, human judgment on quality
**Cons:** Slow, tedious

### Option B: Instaloader (Semi-Automated)

```bash
pip install instaloader
instaloader --no-videos --no-captions --post-metadata-txt="" @username
```

- Downloads all images from an account
- You still need to manually rate and categorize them
- Risk: Instagram may rate-limit or ban your IP
- Use a throwaway account, not your main

### Option C: Apify Instagram Scraper (Automated)

- Apify has Instagram scrapers that handle auth/proxies
- ~$50/month for decent volume
- Returns structured data (likes, comments, image URLs)
- You'd still need to download images and add quality ratings

### Option D: Build Custom Scraper (Overkill for Now)

- Playwright + rotating proxies + anti-detection
- Only worth it if we need 1000+ accounts
- **Don't do this yet**

### Recommendation

Start with **Option A** for the first 10-20 accounts to establish the data format and understand what "good" looks like. Then switch to **Option B or C** for volume, with manual review pass afterward.

---

## Quality Criteria — What Makes a Good Reference

### Account Level: Is This Person Worth Studying?

**YES if:**
- Images are consistent (same face across 10+ posts)
- Content looks photorealistic (not obviously AI)
- Has actual engagement (not just bot followers)
- Diverse content types (not just the same pose 50 times)
- Would fool a casual viewer

**NO if:**
- Face changes noticeably between posts
- Obvious AI artifacts (extra fingers, warped backgrounds, uncanny valley eyes)
- All images are the same template with different outfits
- Very low engagement relative to follower count (bought followers)
- Only 2-3 posts total

### Post Level: Is This Image a Good Reference?

**YES if:**
- Face is clear and well-lit
- Composition is clean (good framing, not cluttered)
- Would work as inspo for our content generation pipeline
- Represents a style/pose/setting our users would want

**NO if:**
- Face is obscured, blurry, or from behind
- Heavy filters that make it hard to see actual quality
- Composition is weird or unusable as reference
- Contains text overlays, watermarks, or collages

---

## AI-Assisted Review (Phase 2)

Once we have the raw dataset, we can use Claude or GPT-4V to help categorize:

```
Prompt: "Rate this AI-generated influencer image 1-5 on realism.
Identify: pose type, setting, outfit, lighting, composition crop.
Flag any AI artifacts (extra fingers, warped text, inconsistent shadows).
Would this fool a casual Instagram viewer? yes/no"
```

This can bulk-process the downloaded images and pre-fill the Level 2 metadata, with a human doing a quick review pass.

---

## Output Format

Final deliverable is a folder that can be dropped into this repo:

```
reference-dataset/
  accounts/
    (organized by handle)
  summary.json
  stats.md                  ← How many accounts, breakdown by niche/gender/ethnicity
  best-compositions.md      ← Top 20 images for composition reference
  best-poses.md             ← Categorized pose reference sheet
```

The summary.json should look like:

```json
{
  "collected_date": "2026-03-25",
  "total_accounts": 52,
  "total_images": 847,
  "by_niche": { "fitness": 12, "lifestyle": 15, "beauty": 10, ... },
  "by_gender": { "female": 42, "male": 10 },
  "by_quality": { "5": 8, "4": 20, "3": 15, "2": 7, "1": 2 },
  "accounts": [
    {
      "handle": "@example",
      "niche": "fitness",
      "quality": 4,
      "images_collected": 15,
      "is_good_reference": true
    }
  ]
}
```

---

## Priority Order

1. **First 10 accounts** — establish the data format, learn what's out there
2. **Expand to 50** — focus on diversity (niches, ethnicities, body types)
3. **Categorize best compositions** — these become composition templates
4. **Extract pose library** — standing, sitting, candid, etc.
5. **Build content prompt library** — map real posts to generation prompts

---

## How This Feeds Back Into the App

| Dataset Output | App Feature |
|---|---|
| Account archetypes (traits) | Pre-made creator library (`src/data/premade-creators.ts`) |
| Best compositions | Composition templates (like our silhouette — `src/assets/`) |
| Pose categories | Pose picker in content generation UI |
| Setting/outfit combos | Content prompt presets ("Beach shoot", "Gym selfie", etc.) |
| Quality ratings | Training data for our own quality filter |
| Engagement patterns | Recommendations for what content to generate |

---

## Notes

- **DO NOT** store scraped images in this git repo — they'd bloat it. Use a separate folder or cloud storage.
- **DO NOT** use anyone's likeness without understanding the legal implications — these are REFERENCE images for understanding style/composition, not for direct copying.
- This dataset is internal tooling, not user-facing content.
- Instagram's ToS technically prohibits scraping — use judgment on approach and volume.
