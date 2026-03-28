# Product Ideas & Future Features

## Creator Studio Canvas Mode
- Wireframe-style canvas where you can drag/arrange generated images
- Select, zoom, pan on images freely
- Drawing/annotation tools to mark up images before regenerating
- "Fix this area" — draw on a region and describe what to change (inpainting)
- Side-by-side comparison view
- Full editing toolkit: crop, adjust, filter, before/after

## Picking Phase Improvements
- Click into an image to see it full-size with action buttons (Use This Look, More Like This, Refine)
- Better dialog/modal for selection instead of just border highlight
- Show full body in the grid — images are currently cropped by the card aspect ratio

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
