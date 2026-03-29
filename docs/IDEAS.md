# Product Ideas & Future Features

## Immediate Needs

### Templates Need Real Examples
- Current templates are text-only definitions with no visual reference
- Need to generate actual example images for each carousel format + scene
- Show users what they'll get before they commit credits
- Build a library of "this is what a gym photo dump looks like" reference sets
- Could generate these in batch as seed content

### Background/Scene References
- Let users upload a background/scene image as reference
- "Put me in THIS location" — upload a photo of a beach, café, gym
- Gemini can composite the creator into the uploaded scene
- Combine with outfit references for full control

### Post Grouping / "Same Post" Tracking
- Content items need a concept of "same post" — which images go together
- Carousel slides are grouped, but even single photos could be part of a planned post
- Visual indicator on dashboard: "these 3 photos are for your Monday post"

---

## Content Generation Workspace (NEXT UP)

### Core Flow
- User types or clicks a suggestion → AI generates the content → shows in canvas
- Every generation uses the creator's base reference image for consistency
- AI suggests prompts/descriptions so users just click — minimal typing needed
- "What should [name] do next?" suggestions powered by Grok based on niche/vibe

### Carousel Generation
- Generate one hero photo → use it as reference to generate 3-5 variations
- Different angles, slight outfit changes, different expressions — same scene
- One-click "Make carousel" from any generated image
- AI generates captions/descriptions for each slide

### Creator Appearance Controls
- Change outfit per generation (not locked to sports bra forever)
- Hair up/down, makeup/no makeup, accessories
- "Dress them up" panel — quick outfit presets (casual, gym, going out, swimwear, lingerie)
- Scene-specific styling suggestions
- Tell the AI personality traits — how they talk, what they're about

### Reference Upload System
- Upload product images → creator holds/wears/uses the product (UGC)
- Upload scene/background references → creator appears in that setting
- Upload outfit references → creator wears that style
- Upload pose references → creator matches the pose
- Multiple reference types combinable: product + scene + outfit in one generation

### AI-Powered Assistance
- Auto-generate captions/descriptions for posts
- Suggest hashtags based on niche
- "Make it more [sexy/casual/professional]" refinement chips
- AI writes the prompt from a basic idea: "gym selfie" → full detailed prompt
- Suggest content calendar: what to post and when

### Content Types
- Single photo
- Carousel (3-10 images, coherent set)
- Stories format (vertical, text overlays)
- Product showcase (UGC-style with product)
- Before/after
- Day-in-the-life series

---

## Creator Studio Canvas Mode
- Wireframe-style canvas where you can drag/arrange generated images
- Select, zoom, pan on images freely
- Drawing/annotation tools to mark up images before regenerating
- "Fix this area" — draw on a region and describe what to change (inpainting)
- Side-by-side comparison view
- Full editing toolkit: crop, adjust, filter, before/after

## Picking Phase Improvements
- ~~Click into an image to see it full-size with action buttons~~ DONE
- ~~Show full body in the grid~~ DONE
- Better selection UX — click to select, lightbox for full actions

## Preset Library
- Rich preset library with actual reference images, not just text descriptions
- AI reverse-prompt: upload an image → generate a detailed prompt + trait settings from it
- Community presets / trending presets
- Categorized: by niche (fitness, lifestyle, beauty), by ethnicity, by vibe
- Preview thumbnails for each preset so users can see what they'll get

## JSON-Based Generation Schema
- Structured JSON to describe a person/creator — detailed fields for every attribute
- Use as config format for generations (like YAML config files but for people)
- "Image to JSON" — take any image and extract a structured person description
- API endpoint: POST JSON → get images back
- Makes it trivial for agents/bots to create and manage influencers programmatically
- Example schema: `{ gender, age, ethnicity, build, hair: { color, length, texture }, face: { shape, expression }, body: { chest, hips }, vibes: [], clothing, scene, camera }`

## Agent API & Automation
- Public API for creating influencers + generating content via JSON
- Agent-friendly: simple REST endpoints, clear docs, SDKs
- Bulk operations: create 10 influencers, generate 50 posts
- Webhook callbacks when generations complete
- Target: AI agent platforms can sign up and manage influencer accounts programmatically
- Discord bot integration for community management
- Marketing: teach people how to build and monetize AI influencer accounts
