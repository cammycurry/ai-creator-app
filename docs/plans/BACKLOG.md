# Backlog — Issues, Bugs & Test Scenarios

> Updated: 2026-04-14. Dump things here as found. Quick fixes done inline. Big stuff gets its own plan.

---

## CRITICAL BUGS

- [x] Face identity preservation — Elements system in all 3 video modes ✅
- [x] Polling timeout — 10 min across the board (aligned with Fal queue completion path) ✅
- [x] "No photos yet" bug — content browser now pushes to creator store ✅
- [x] Motion transfer element — now includes `reference_image_urls` ✅
- [x] motionSourceUrl — now uploaded to Fal storage before passing to API ✅
- [x] **Old video thumbnails blank** — resolved: first-frame extraction in checkVideoStatus + creator base image fallback in grid. Corrupt pre-queue-mode records deleted. ✅
- [x] **Workspace canvas polling was broken** — resolved: was only re-reading DB, now calls checkVideoStatus per GENERATING item so jobs actually complete from any view ✅
- [x] **UI blocked during video generation** — resolved: queue mode submit returns instantly, pendingVideoIds tracker fires celebration view on completion, user can submit more mid-generation ✅

---

## GENERATION STATUS / LOADING STATES ✅ DONE (2026-04-14)

Shipped on `feat/loading-states-timelines`. Full reactive async pipeline:

- **GENERATING cards** render in both workspace canvas and studio browser with stage label (Queued/Processing), live elapsed time counter, and model-aware expectation message ("Usually 1–3 min" → "Still working — this is normal" → "Taking longer than usual" → "Almost at timeout") driven by `src/lib/model-durations.ts`
- **Per-creator sidebar dot** in creator-list when any content is GENERATING, with cross-creator polling at 5s (active) / 15s (idle)
- **Polling** — 5s interval, paused when tab hidden via Page Visibility API, immediate re-poll on tab focus. Workspace canvas AND content-browser both call `checkVideoStatus(generationJobId)` per item to drive Fal.ai completion (was only DB re-read before — jobs stayed stuck forever)
- **Async submit** — video and talking-head submissions return instantly via `fal.queue.submit()`, push new GENERATING content to the creator store, user can immediately submit more. No UI blocking.
- **Celebration view** — creation-panel tracks `pendingVideoIds`, watches store reactively, and fires `setResults + showCanvas()` when any pending item transitions to COMPLETED
- **Failed state** — red card with "Credits refunded" + studio-level error toast for async failures
- **Backend** — `getCreatorContent` joins `GenerationJob` in one query for stage/startedAt/falModel; `getWorkspaceData` runs a parallel groupBy for per-creator generatingCount
- **Reactive architecture** — `content-browser` derives BrowserItems reactively from `useCreatorStore((s) => s.content)` via useMemo. Any component that pushes to store content triggers instant re-render across views
- **Shared utilities** — `formatElapsed`, `useTick(intervalMs, enabled)` (gated on anyGenerating to avoid re-rendering idle grids), `getExpectationMessage`

**Files touched:** `content-actions.ts`, `workspace-actions.ts`, `workspace-canvas.tsx`, `content-browser.tsx`, `creation-panel.tsx`, `creator-list.tsx`, `unified-studio-store.ts`, `content.ts`, `creator.ts`, + new `model-durations.ts`, `time-format.ts`, `use-tick.ts`, CSS updates

**Extensibility:** Adding a new Fal model = one entry in `MODEL_DURATIONS`. No other touchpoints.

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
- [ ] **FULL DIALOG REDESIGN (CRITICAL UX)** — ALL picker dialogs (photo picker, motion source picker, reference picker, video picker) feel minimal, featureless, and disconnected from the rest of the app. They need a dedicated design pass as a batch:
  - Should match the quality/feel of existing app dialogs (add-reference-dialog, content-detail modal)
  - Should be searchable, filterable, properly sized
  - Should feel like part of the application, not a popup afterthought
  - Motion source picker especially needs: search, filter by type, preview on hover, upload from here
  - All pickers need: consistent width/padding/buttons, proper empty states, clear labeling
  - This is a /ui-ux-pro-max or /superpowers:brainstorming task — needs design FIRST, then build

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
- [x] **Old video thumbnails blank** — resolved by queue-mode first-frame extraction + grid fallback ✅
- [ ] **Video player poster image** — show thumbnail before play starts (could now use content.thumbnailUrl which is populated on completion)
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
