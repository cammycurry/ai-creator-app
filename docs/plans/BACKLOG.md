# Backlog — Issues, Bugs & Test Scenarios

> Updated: 2026-04-10. Dump things here as found. Quick fixes done inline. Big stuff gets its own plan.

---

## CRITICAL BUGS

- [x] Face identity preservation — Elements system in all 3 video modes ✅
- [x] Polling timeout — 5 min video, 8 min talking head ✅
- [x] "No photos yet" bug — content browser now pushes to creator store ✅
- [ ] **Motion transfer element incomplete** — only sends `frontal_image_url`, missing `reference_image_urls` for full-body reference
- [ ] **motionSourceUrl not validated** — if expired S3 signed URL, Fal.ai fails
- [ ] **Old video thumbnails blank** — videos generated before ffmpeg extraction have no thumbnailUrl. Need fallback to creator base image.

---

## DONE (This Session)

- [x] Reference system v2 — Scene/Product types, no defaults, required selection
- [x] Pick Reference dialog — browse existing + upload new
- [x] Inline ref cards with type/mode/description (no defaults, required)
- [x] "+ Add" button on creation panel for refs
- [x] Model selector — Standard/Premium with Veo 3.1 Fast
- [x] Video prompt enhancement — 5-part formula
- [x] Talking head Fal storage upload
- [x] Motion transfer video picker
- [x] Canvas stale results fix
- [x] Error handling + NSFW friendly messages
- [x] Progress message rotation
- [x] API specs saved as authoritative reference
- [x] Content store fix (browser → creator store)
- [x] Create/Motion Transfer pills (compact, no emojis)

---

## UI / UX Fixes Needed

- [ ] **Sidebar photo → Video tab prefill** — clicking photo + "Make Video →" should auto-select it as starting image in Video tab
- [ ] **Video in browser → "Use as motion source"** — selecting video should offer this action
- [x] NSFW/safety friendly errors ✅
- [x] Progress rotation ✅
- [ ] **"Add to generation" from anywhere** — + button on images in workspace grid, detail modal, anywhere images appear
- [ ] **Dialog sizing pass** — photo picker, video picker, ref picker all too small/cramped. Need wider, more padding.

---

## Infrastructure (Other Agent)

- [x] Job queue system (BullMQ/Redis) — resolved: Fal.ai queue mode replaces need for BullMQ ✅
- [x] FFmpeg service on Railway Docker — resolved: metadata-service deployed on Railway ✅
- [x] Video post-processing pipeline (Task 8) — resolved: metadata-service handles video naturalization ✅
- [x] Fal.ai storage upload for i2v/motion transfer S3 URLs ✅

---

## Remaining Layer 1

- [x] Task 7: Model selector ✅
- [ ] Task 8: Video post-processing (other agent)
- [ ] Task 9: Upscaling (Topaz)
- [ ] Task 10: Quality/resolution display
- [x] Task 11: Error handling ✅

---

## Quality / Polish

- [x] Create/Motion Transfer compact pills ✅
- [x] Choose photo proper button styling ✅
- [ ] **Old video thumbnails blank** — fallback to creator base image for videos with no thumbnail
- [ ] **Video player poster image** — show thumbnail before play starts
- [ ] **Video duration badge** — overlay "5s" / "10s" on video cards in grid
- [ ] **Resolution badge** — show HD/4K on content cards
- [ ] **Dialog consistency** — all dialogs same width, padding, button styles
- [x] Download dialog doesn't process videos (no metadata strip — Task 8) — resolved: video downloads now route through metadata-service ✅
- [ ] "Upscale" button disabled/stubbed (Task 9)

---

## Test Scenarios

### Video Generation
- [ ] Text-to-video: correct creator face + aspect ratio
- [ ] Image-to-video: animates the selected photo
- [ ] Motion transfer: creator copies movements
- [ ] Premium: uses Veo 3.1 Fast, higher credit cost
- [ ] Credits deducted before gen, refunded on failure
- [ ] Thumbnail shows in sidebar after gen

### Talking Head
- [ ] 3-step pipeline completes (TTS → image → lip sync)
- [ ] Fal storage upload used
- [ ] Safety error caught on explicit script

### References
- [ ] Scene ref influences background
- [ ] Product ref shows item in output
- [ ] Can't generate with incomplete ref (no type selected)
- [ ] Creator face locked regardless of refs

### Content Browser
- [ ] Click photo → canvas shows that photo
- [ ] Generate video → sidebar refreshes
- [ ] "Make Video →" → Video tab with photo selected
- [ ] Filter by Videos shows correct types
