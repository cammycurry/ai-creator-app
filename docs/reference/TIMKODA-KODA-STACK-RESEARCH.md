# Timkoda Koda-Stack & UGC System Research

> Research compiled March 27, 2026
> Sources: github.com/timkoda/koda-stack, adlibrary.com UGC prompting guide
> Note: The Notion page "The Claude Code UGC System — Build Your AI Talent Roster" could not be fetched (JS-rendered). This doc covers what we could extract from timkoda's GitHub repo and related UGC research.

---

## Koda-Stack: 10-Skill Content Pipeline

timkoda built a Claude Code skill system that automates the full content pipeline from idea to published reel. The pipeline is sequential:

```
/brief → /trends → /concept → /script → /art-direction → /storyboard → /generate → /assemble → /publish → /repurpose
```

### Architecture

- Each skill is a `SKILL.md` file in `~/.claude/skills/koda-stack/skills/<name>/`
- A central `CLAUDE.md` acts as "Creative DNA" — brand fingerprint every skill reads before doing anything
- Skills are independent but designed to chain — output of one feeds the next

### CLAUDE.md — Creative DNA Template

Defines the creator's identity that all content inherits:

- **Voice**: Tone, language, signature phrases, banned words
- **Visual Identity**: Primary colors (hex), style, lighting, composition, typography
- **Content Format**: Platform, duration, structure (e.g. "hook → walkthrough → CTA"), aspect ratio
- **Tools**: Image gen, video gen, voiceover, editing, publishing tools
- **Audience**: Who they are, what they want, what they struggle with
- **Rules**: Hard constraints (e.g. "scripts must be under 125 words")

### Key Skills (Relevant to Our System)

#### /brief — The Planner
- Converts vague ideas into structured creative briefs
- Output: Topic, Angle, Audience, Platform, Format, Tone, Key Message, References, Constraints
- Asks max 3 clarifying questions if concept is too vague
- Rule: Brief must be specific enough for anyone to start work independently

#### /concept — The Creative Director
- Takes a brief → produces 3 fundamentally different visual concepts
- Each concept includes: title, narrative angle, visual environment, emotional tone, reference, opening strategy
- "Concepts must diverge substantially from one another"
- All concepts must be feasible with AI tools
- Avoids default aesthetics (dark mode, cyberpunk) unless brand demands it

#### /art-direction
- Generates visual guidance from a script/concept
- Output: Palette (3-5 hex colors), Mood (one sentence), Lighting (specific setup), Composition (framing rules), Environment, Texture (grain/digital/matte), Typography, References (real findable sources), Do-NOT list
- "Visual direction must serve the script — not the other way around"

#### /script — The Scriptwriter
- Produces 5-block video scripts: Hook → Pre-CTA → Walkthrough → Transition → CTA
- 91-125 words max
- Hook = two flowing sentences (claim + payoff), never fragments
- "Every word must earn its place"
- Read aloud test — shouldn't sound like a blog post

#### /generate — The Producer
- Creates AI images from shot decks
- Reads art direction, crafts optimized prompts per shot
- Default 9:16 aspect ratio
- Prompt requirements: lighting, camera angle, lens, composition
- Appends "photograph, ultra realistic, editorial quality" for photorealistic work
- Failed generations → refine prompt, don't just re-run
- Outputs to `visuals/` folder as `shot-01.png`, `shot-02.png`, etc.

#### /storyboard — The Storyboarder
- Maps shots with timecodes, durations, types, descriptions, text overlays
- Shot types: AI (full-screen editorial), SCREEN REC, TEXT, VIDEO
- AI content must be >= 80% of total
- Screen recordings capped at 20%
- Hard cuts only — no fades/dissolves
- Opening shot = strongest visual
- Text overlays: 3-4 words max, avoid top-right corner
- New sentences land on cuts

#### /assemble — The Editor
- Combines visuals + audio + text into final video
- Output: MP4 (H.264), 1080x1920, 30fps, 256kbps AAC
- Ken Burns effects on static images (zoom/pan)
- Hard cuts only unless explicitly requested
- Bold high-contrast text overlays for mobile
- Produces draft (720p) and final (1080p)

#### /publish — The Social Manager
- Creates captions, hashtags, posting strategy
- CTA in first line only
- Max 3 hashtags in lowerCamelCase
- "Tease the reel content without revealing steps"
- Tone: intimate and personal, not commercial

#### /repurpose — The Repurposer
- Adapts one piece of content into platform-native formats:
  - X/Twitter: 4-6 tweet thread
  - LinkedIn: Professional angle with storytelling
  - YouTube Shorts: Reframed for vertical
  - Instagram Carousel: 5-7 slides
  - Stories: 3-5 frames, bold text, minimal words
- "Repurposing amplifies — not dilutes"

---

## UGC Prompting Research (AdLibrary Guide, March 2026)

### Core Principle
"Describe real moments, not photoshoots." UGC works because it feels real, casual, and unpolished.

### Authenticity Modifiers (What Makes AI UGC Look Real)
- "shot on iPhone" / "smartphone camera quality"
- "candid" / "unposed" / "caught mid-action"
- "natural imperfections" / "slight grain" / "not retouched"
- "casual home environment" / "messy background"
- "available light" / "room lighting" / "no studio"

### Negative Prompts (What to Avoid)
Standard UGC negative set:
> "studio lighting, professional photography, stock photo, model, perfect skin, heavy makeup, perfect composition, centered framing, staged, commercial, advertisement"

Context-specific negatives:
- Home: + "showroom, designer interior, staged home"
- Selfies: + "DSLR, professional camera, tripod, ring light, beauty filter"
- Outdoor: + "landscape photography, HDR, oversaturated"

### Platform-Specific Prompt Approaches
- **TikTok**: Vertical 9:16, ring light reflections, text overlay space, "raw and unedited look"
- **Instagram**: Warmer tones, golden hour, "effortlessly aesthetic", slight portrait blur, 4:5 format
- **YouTube**: Well-lit faces, desk/studio visible, "trustworthy and knowledgeable", 16:9

### Emotion-First Prompt Structure
`[Emotion] + [Person] + [Product interaction] + [Environment] + [Camera details]`

Emotional contexts:
- **Trust**: Direct eye contact, confident smile, clean environment, good lighting
- **Excitement**: Wide eyes, open mouth, dynamic composition, bright colors
- **Relief**: Relaxed posture, peaceful expression, after-use context
- **Curiosity**: Close examination, focused expression

### Character Consistency
1. Detailed character brief — paste into every prompt
2. Reference images (Gemini/Nano Banana Pro) — upload hero image with each generation
3. Seed fixing (Midjourney) — same seed for variations

### UGC vs Our Current Wizard Approach

| Aspect | Our Wizard (Current) | UGC Content Style |
|--------|---------------------|-------------------|
| Camera | Canon EOS R5 | "shot on iPhone", smartphone quality |
| Lighting | Studio, controlled | Natural, available light, room lighting |
| Background | White seamless studio | Messy real environments (bathroom, kitchen, bedroom) |
| Composition | Centered, posed, template-locked | Candid, unposed, slight imperfection |
| Feel | Professional headshot | Real person's selfie / casual photo |
| Clothing | Sports bra / shirtless (neutral base) | Actual outfits (casual, gym, going out) |

### Key Insight for Our System
The wizard creates a **reference character** (professional, clean, consistent). Content generation should shift to **UGC style** — the same person but in real-world, casual, "shot on iPhone" contexts. These are two fundamentally different prompt systems:

1. **Wizard prompt** = clean reference photo (what we have now — Canon EOS R5, studio, controlled)
2. **Content prompt** = Instagram-style posts (what the user wants — iPhone, real settings, candid, emotional)

---

## Takeaways for Our Implementation

### What Koda-Stack Gets Right
1. **Creative DNA as config** — one file defines the creator's identity, every generation reads it
2. **Pipeline thinking** — brief → concept → script → visuals → publish, not everything at once
3. **Art direction before generation** — define the visual language BEFORE prompting the image model
4. **Platform-native output** — different platforms get different formats, not one-size-fits-all

### What We Should Apply
1. **Creator profile = Creative DNA** — our creator's traits/settings should inform every content generation, not just the wizard
2. **Content scenes, not more references** — after the wizard creates a base character, "More Like This" should generate CONTENT (Instagram posts, TikTok moments, lifestyle shots), not more studio headshots
3. **UGC prompt style for content** — switch from Canon EOS R5 to "shot on iPhone" when generating actual posts
4. **Emotion-first prompting** — describe the vibe/moment, not the camera specs
5. **Platform-aware generation** — Instagram = warm/aesthetic, TikTok = raw/energetic, etc.

### Proposed Two-System Prompt Architecture
```
WIZARD (character creation):
  - Canon EOS R5, studio lighting, white background
  - Silhouette composition template for consistency
  - "Visible pores, photorealistic" — clean reference
  - Purpose: establish the character's face/body/identity

CONTENT (Instagram/TikTok generation):
  - "Shot on iPhone" / smartphone camera quality
  - Real environments (coffee shop, gym, bedroom, beach)
  - Candid, unposed, natural imperfections
  - Reference image of creator passed for face consistency
  - Purpose: generate actual social media posts
```
