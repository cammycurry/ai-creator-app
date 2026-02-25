# Content Flow - How Users Make Content

> After they have a creator, how do they actually make viral content?

---

## Three Paths to Content

```
┌─────────────────────────────────────────────────────────────┐
│                   MAKE CONTENT                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  TEMPLATES  │  │   PROMPT    │  │  STEAL IT   │         │
│  │             │  │             │  │             │         │
│  │  Browse &   │  │  Describe   │  │  Paste a    │         │
│  │  Click      │  │  What You   │  │  Video URL  │         │
│  │             │  │  Want       │  │             │         │
│  │  [Easy]     │  │  [Medium]   │  │  [Magic]    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Path 1: Template Library

### Concept

Pre-built "recipes" for viral content. User just picks one, we generate it with their creator.

### Template Structure

```javascript
{
  id: "gym_mirror_selfie",
  name: "Gym Mirror Selfie",
  category: "fitness",
  difficulty: "easy",
  
  // What we generate
  outputType: "image", // or "video" or "image+video"
  
  // The scene prompt (creator injected automatically)
  scenePrompt: `Mirror selfie of {{creator}} holding a light pink iPhone, 
    visible from hips up. She is in a gym locker room, wearing {{outfit}}.
    {{hair}}. Sweaty post-workout glow. Raw iPhone photography.`,
  
  // User customization options
  options: {
    outfit: {
      label: "Outfit",
      type: "select",
      choices: [
        { value: "matching sports bra and leggings set", label: "Matching Set" },
        { value: "oversized gym tank and shorts", label: "Oversized Tank" },
        { value: "fitted crop top and high-waist leggings", label: "Crop Top" }
      ]
    },
    hair: {
      label: "Hair Style",
      type: "select", 
      choices: [
        { value: "hair in high ponytail", label: "High Ponytail" },
        { value: "hair in messy bun", label: "Messy Bun" },
        { value: "hair down, slightly sweaty", label: "Hair Down" }
      ]
    }
  },
  
  // If video, motion settings
  videoPrompt: "Subtle movement, she adjusts her phone angle slightly, 
    checks herself in mirror. Camera handheld with visible motion.",
  videoDuration: 3,
  
  // Suggested captions/audio
  suggestedCaptions: [
    "gym check ✓",
    "she's locked in 🔒",
    "4am club"
  ],
  trendingAudio: ["audio_id_1", "audio_id_2"],
  
  // Example output (for preview)
  exampleImages: ["url1", "url2"],
  
  // Metadata
  popularity: 94, // for sorting
  tags: ["fitness", "selfie", "gym", "mirror"]
}
```

### Template Categories

| Category | Templates |
|----------|-----------|
| **Fitness** | Gym selfie, workout clip, progress check, protein shake |
| **Lifestyle** | Morning routine, coffee run, outfit check, apartment tour |
| **Get Ready** | GRWM makeup, GRWM outfit, doing hair, skincare routine |
| **Talking Head** | Storytime, hot take, advice, reaction |
| **Thirst** | Mirror selfie, POV girlfriend, waking up, pool/beach |
| **Trending** | Current viral formats (rotated frequently) |
| **UGC/Product** | Holding product, unboxing, review style |

### Template UI Flow

```
1. Browse Templates
   ┌─────────────────────────────────────────┐
   │ [Fitness ▼] [Lifestyle] [Trending]      │
   ├─────────────────────────────────────────┤
   │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
   │ │ Gym │ │Work-│ │Pro- │ │Run- │       │
   │ │Self-│ │ out │ │gress│ │ning │       │
   │ │ ie  │ │     │ │     │ │     │       │
   │ └─────┘ └─────┘ └─────┘ └─────┘       │
   └─────────────────────────────────────────┘

2. Customize Options
   ┌─────────────────────────────────────────┐
   │ GYM MIRROR SELFIE                       │
   │                                          │
   │ Outfit: [Matching Set ▼]                │
   │ Hair:   [High Ponytail ▼]               │
   │                                          │
   │ Output: ○ Image only  ● Image + Video   │
   │                                          │
   │ [Preview] [Generate]                     │
   └─────────────────────────────────────────┘

3. Generate & Pick
   - Show 4 image variations
   - User picks favorite
   - If video, generate video from that image

4. Download or Schedule
```

---

## Path 2: Free Prompting

### For Power Users

Some users will want to describe exactly what they want, not pick from templates.

### UI

```
┌─────────────────────────────────────────────────────────────┐
│ DESCRIBE YOUR SCENE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Your creator: [Sophia ▼]                                    │
│                                                              │
│ Scene description:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ She's sitting at a cozy coffee shop, working on her     │ │
│ │ laptop. Wearing a cream sweater. Natural lighting from  │ │
│ │ the window. Aesthetic vibes.                            │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Output type: ○ Image  ● Image + Video                       │
│ Video duration: [5 sec ▼]                                   │
│                                                              │
│ [Generate]                                                   │
│                                                              │
│ 💡 Tips:                                                    │
│ - Describe location, outfit, lighting, mood                  │
│ - Be specific about pose and framing                        │
│ - Add "raw iPhone photography" for realism                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### We Enhance Their Prompt

User writes casual description, we enhance it:

**User writes:**
> She's at a coffee shop working on laptop, cream sweater, cozy vibes

**We enhance to:**
> POV from across the table of {{creator}} sitting at a cozy coffee shop, 
> working on her MacBook. She's wearing a cream oversized sweater. 
> Natural window lighting creates soft shadows. Warm wood tones in background. 
> She occasionally looks up with a soft smile. Raw iPhone photography, 
> visible skin texture, candid feel.

### Prompt Enhancement Options

- **Auto-enhance:** On by default, improves prompts automatically
- **Manual mode:** Use exactly what user typed (for experts)
- **Suggestions:** "Did you mean..." or "Try adding..."

---

## Path 3: "Steal This Video"

### The Magic Flow

User sees a viral video, wants to recreate it with their creator.

```
1. User pastes video URL (TikTok, Instagram, etc.)
2. We analyze the video:
   - Scene description
   - Outfit/styling
   - Camera angles
   - Motion/actions
   - Audio/sound
3. Generate recreation with their creator
```

### Technical Approach

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Video    │ →   │   Extract  │ →   │  Generate  │
│    URL     │     │   Frames   │     │   Prompt   │
└────────────┘     └────────────┘     └────────────┘
                          │
                          ↓
                   ┌────────────┐
                   │  Analyze   │
                   │  with AI   │
                   │  (Vision)  │
                   └────────────┘
                          │
                          ↓
                   ┌────────────────────────────────┐
                   │ Scene: Mirror selfie in gym    │
                   │ Outfit: Pink sports bra,       │
                   │         black leggings         │
                   │ Hair: High ponytail            │
                   │ Action: Adjusts phone,         │
                   │         checks reflection      │
                   │ Lighting: Fluorescent gym      │
                   │ Mood: Confident, playful       │
                   └────────────────────────────────┘
                          │
                          ↓
                   ┌────────────────────────────────┐
                   │ Generate with user's creator   │
                   └────────────────────────────────┘
```

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│ RECREATE A VIDEO                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Paste video URL:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ https://tiktok.com/@user/video/123456789                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Analyze Video]                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

→ After analysis:

┌─────────────────────────────────────────────────────────────┐
│ WE ANALYZED THE VIDEO                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────┐  Scene: Gym mirror selfie                      │
│ │ Original │  Outfit: Sports bra + leggings                 │
│ │ Thumb    │  Hair: Ponytail                                │
│ └──────────┘  Action: Phone adjustment, mirror check         │
│               Duration: 3 seconds                            │
│                                                              │
│ Recreate with: [Sophia ▼]                                   │
│                                                              │
│ Customize outfit? [Keep similar ▼]                          │
│ Keep same audio? [Yes ○ No]                                 │
│                                                              │
│ [Generate Recreation]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Challenges

- **Video download:** Need to fetch video from URL
- **Analysis accuracy:** AI vision needs to be good
- **Motion matching:** Hard to exactly replicate movement
- **Audio:** Can we keep original audio? Legal?
- **Platform ToS:** Be careful with "stealing" language

### MVP Scope

For V1, maybe:
- Extract key frame(s) only
- Generate similar static image
- User can add video motion separately
- User provides their own audio

---

## Post-Generation Flow

Once content is generated:

### Quick Actions
```
┌─────────────────────────────────────────────────────────────┐
│ YOUR CONTENT IS READY                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌─────────────────────┐                                  │
│    │                     │                                  │
│    │   [Generated        │                                  │
│    │    Content]         │                                  │
│    │                     │                                  │
│    └─────────────────────┘                                  │
│                                                              │
│ [📥 Download] [📝 Add Caption] [🎵 Add Audio] [🔄 Regenerate]│
│                                                              │
│ [📅 Schedule Post] [📤 Post Now]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Caption Generator
```
Based on: Gym mirror selfie
Vibe: Motivational / Confident

Suggested captions:
• "she's in her gym era 💪"
• "4am. no excuses."
• "building the body, building the brand"
• "main character energy at the gym"

[Use this] [Generate more] [Write my own]
```

### Audio Library (Future)
- Trending sounds
- Royalty-free music
- Sound effects
- Categorized by mood/niche

---

## Content Library (User's Content)

### Saved Content View

```
┌─────────────────────────────────────────────────────────────┐
│ MY CONTENT                                     [+ New]      │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Sophia ▼] [Images ▼]                      │
│                                                              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │ 📹 │ │ 📷 │ │ 📹 │ │ 📷 │ │ 📷 │ │ 📹 │           │
│ │     │ │     │ │     │ │     │ │     │ │     │           │
│ │2/24 │ │2/23 │ │2/23 │ │2/22 │ │2/22 │ │2/21 │           │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│  Posted  Draft   Posted  Draft   Draft   Posted            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Content Item Details

```javascript
{
  id: "content_123",
  creatorId: "creator_abc",
  userId: "user_xyz",
  
  type: "video", // or "image"
  url: "s3://...",
  thumbnailUrl: "s3://...",
  
  // How it was made
  source: "template", // or "prompt" or "steal"
  templateId: "gym_mirror_selfie",
  prompt: "...",
  
  // Generation settings
  generationSettings: {...},
  
  // User additions
  caption: "gym check ✓",
  audioId: "audio_abc",
  
  // Status
  status: "draft", // or "scheduled" or "posted"
  scheduledFor: null,
  postedTo: [], // ["instagram", "tiktok"]
  
  // Timestamps
  createdAt: "...",
  updatedAt: "..."
}
```

---

## Multi-Image/Video Sets

### Carousel/Slideshow Content

Some viral formats need multiple images:
- Before/after
- Outfit dump
- Photo dump
- Multiple angles

```
┌─────────────────────────────────────────────────────────────┐
│ CREATE CAROUSEL                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Add slides:                                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                            │
│ │  1  │ │  2  │ │  3  │ │ +   │                            │
│ │     │ │     │ │     │ │ Add │                            │
│ └─────┘ └─────┘ └─────┘ └─────┘                            │
│                                                              │
│ Each slide: Different outfit/scene with same creator        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Metrics & Analytics (Future)

### What We Track

- Content generated per user
- Most used templates
- Best performing content (if posting integrated)
- Creator usage distribution
- Generation success/failure rates

### User-Facing Analytics

- "Your most engaging content type: Gym selfies"
- "Best posting time for your audience: 6-9pm"
- "Try more: Talking head videos (high engagement in your niche)"

---

## Content Moderation

### What We Prevent

- Nudity/explicit content
- Hate/violence
- Impersonation of real people
- Copyright violation (for "steal" feature)

### How

- Input filtering (prompts)
- Output scanning (generated images)
- User reporting
- Account suspension for violations

---

*v1 - 2026-02-24*
