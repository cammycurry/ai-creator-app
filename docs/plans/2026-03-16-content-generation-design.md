# Content Generation Pipeline — Design

## Summary
Wire the floating input bar so users can type a prompt and generate images of their active Creator. No prompt enhancement yet — user input goes through prompt builder with AIAC structure + creator traits.

## Flow
```
User types prompt + picks count (1-4)
  → buildContentPrompt(creator, userPrompt)
  → Nano Banana Pro × N parallel
  → Upload to S3
  → Create Content record in DB
  → Deduct credits (1 per image)
  → Display in canvas
```

## Prompt Structure (Content, not Wizard)
```
"That [woman/man] from the reference image,
[user's scene/prompt],
[locked traits: hair color, eye color, build, skin tone],
raw iPhone photography style, visible skin texture, natural lighting, hyper-realistic"
```

## Credits
- 1 credit per image
- User picks count 1-4 via +/- control in toolbar
- Default: 1

## S3 Path
`users/{userId}/creators/{creatorId}/content/{timestamp}-{i}.png`

## Files
**Create:**
- `src/server/actions/content-actions.ts` — generateContent() + getCreatorContent()
- `src/types/content.ts` — Content type for frontend

**Modify:**
- `src/components/workspace/workspace-canvas.tsx` — wire input bar to generation
- `src/stores/creator-store.ts` — add content list + generation state

## DB
Uses existing Content model in Prisma schema. Stores: type "photo", prompt, S3 keys, creator reference.
