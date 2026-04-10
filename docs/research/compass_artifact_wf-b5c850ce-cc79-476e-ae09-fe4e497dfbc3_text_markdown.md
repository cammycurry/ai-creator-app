# Async video pipeline infrastructure for realinfluencer.ai

**The optimal architecture routes fal.ai webhooks to a persistent FastAPI service on Railway — not Vercel serverless — for video completion processing, S3 uploads, and pipeline orchestration.** This matters because Vercel's 4.5 MB body limit and function timeouts make it unsuitable for downloading and re-uploading 50 MB video files, while Railway's always-on containers handle this naturally. The three-service architecture (Next.js on Vercel for UI/auth, FastAPI on Railway for orchestration, fal.ai for generation) cleanly separates concerns and avoids fighting platform constraints. Below is the complete technical reference for building this pipeline.

---

## 1. Fal.ai Queue API: the complete reference

### Submit, track, and retrieve

The Queue API lives at `https://queue.fal.run/{model_id}` and provides durable, persistent request processing. Requests move through three states — `IN_QUEUE` → `IN_PROGRESS` → `COMPLETED` — and are never dropped. If no runners are available, fal auto-scales.

**`fal.queue.submit()`** sends a request and returns immediately:

```typescript
// JavaScript SDK
const { request_id } = await fal.queue.submit("fal-ai/kling-video/v2/master/text-to-video", {
  input: { prompt: "A person speaking on camera", duration: "5", aspect_ratio: "16:9" },
  webhookUrl: "https://your-api.railway.app/api/fal/webhook",
});
```

The REST response shape:
```json
{
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "response_url": "https://queue.fal.run/fal-ai/kling-video/.../response",
  "status_url": "https://queue.fal.run/fal-ai/kling-video/.../status",
  "cancel_url": "https://queue.fal.run/fal-ai/kling-video/.../cancel",
  "queue_position": 0
}
```

**`fal.queue.status()`** returns one of exactly three statuses. There is **no explicit `FAILED` status** — failed requests reach `COMPLETED` with `error` and `error_type` fields present.

| Status | HTTP Code | Key Fields |
|--------|-----------|------------|
| `IN_QUEUE` | 202 | `queue_position` (requests ahead of yours) |
| `IN_PROGRESS` | 202 | `logs[]` with `message`, `level`, `timestamp` |
| `COMPLETED` | 200 | `metrics.inference_time`; on failure: `error`, `error_type` |

```typescript
const status = await fal.queue.status("fal-ai/kling-video/v2/master/text-to-video", {
  requestId: "764cabcf-...",
  logs: true,
});
```

**`fal.queue.result()`** retrieves the model output. For video models, the response includes a `video` object with a CDN URL:

```json
{
  "video": { "url": "https://v3.fal.media/files/..." },
  "duration": 15.3
}
```

**`fal.queue.cancel()`** uses a PUT to the cancel URL. When `IN_QUEUE`, the request is removed immediately and never processed. When `IN_PROGRESS`, a cancellation signal is sent to the runner, but the request **may still complete** if the model doesn't handle cancellation. Returns `202 Accepted` with `"status": "CANCELLATION_REQUESTED"`.

### Why `subscribe()` and `subscribeToStatus()` are wrong for serverless

Both `fal.subscribe()` and `fal.queue.subscribeToStatus()` **block the calling process** while polling via SSE. In serverless environments like Vercel Functions, this wastes execution time and risks timeout. Video generation with Kling models takes **2–12 minutes** — far exceeding any reasonable function timeout. The official docs explicitly recommend: *"For long-running requests, rely on Webhooks instead of blocking while waiting for the result."* Use `submit()` + `webhookUrl` instead.

### Webhook system in depth

Configure webhooks by passing `webhookUrl` on submit (SDK) or `fal_webhook` query parameter (REST). The webhook payload differs for success and failure:

**Success payload** (`status: "OK"`):
```json
{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "gateway_request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "OK",
  "payload": {
    "video": { "url": "https://v3.fal.media/files/...", "content_type": "video/mp4" }
  }
}
```

**Error payload** (`status: "ERROR"`):
```json
{
  "request_id": "123e4567-...",
  "status": "ERROR",
  "error": "Invalid status code: 422",
  "payload": { "detail": [{"loc": ["body", "prompt"], "msg": "field required"}] }
}
```

The `request_id` stays the same across retries; `gateway_request_id` changes per retry attempt. **Delivery timeout is 15 seconds** — your handler must return 200 quickly. Failed deliveries retry **up to 10 times over 2 hours**. Design handlers to be idempotent using `request_id` for deduplication.

### Webhook signature verification uses ED25519, not HMAC

Fal.ai uses **ED25519 public-key signatures** verified against a JWKS endpoint — not the HMAC pattern common with Stripe or GitHub. The incoming webhook includes four headers:

- `X-Fal-Webhook-Signature` — hex-encoded ED25519 signature
- `X-Fal-Webhook-Request-Id` — unique request ID
- `X-Fal-Webhook-User-Id` — your user ID
- `X-Fal-Webhook-Timestamp` — Unix epoch seconds

Verification steps: fetch the JWKS from `https://rest.alpha.fal.ai/.well-known/jwks.json` (cache up to 24 hours), validate the timestamp is within ±300 seconds, construct the message as `request_id\nuser_id\ntimestamp\nsha256_hex_of_body`, then verify the ED25519 signature against each public key from the JWKS.

```python
from nacl.signing import VerifyKey
import hashlib, base64

async def verify_fal_signature(request_id, user_id, timestamp, signature_hex, body_bytes):
    if abs(time.time() - int(timestamp)) > 300:
        return False
    body_hash = hashlib.sha256(body_bytes).hexdigest()
    message = f"{request_id}\n{user_id}\n{timestamp}\n{body_hash}".encode("utf-8")
    jwks = await get_jwks()  # Cached JWKS fetch
    for key_info in jwks["keys"]:
        pk_bytes = base64.urlsafe_b64decode(key_info["x"] + "==")
        try:
            VerifyKey(pk_bytes).verify(message, bytes.fromhex(signature_hex))
            return True
        except Exception:
            continue
    return False
```

You can also allowlist webhook source IPs from `GET https://api.fal.ai/v1/meta` → `webhook_ip_ranges`.

### Media URL expiration and storage uploads

Output URLs from fal.ai (`https://v3.fal.media/files/...`) are **publicly accessible without authentication** but **temporary**. Expiration is configurable via the `X-Fal-Object-Lifecycle-Preference` header — set `expiration_duration_seconds` to control retention, or `null` to disable expiration. Request payload JSON is retained for 30 days. **For production, always download output files to your own S3 immediately.** Never rely on fal CDN URLs for permanent storage.

`fal.storage.upload()` (JS) or `fal_client.upload_file()` (Python) uploads local files to fal's CDN, returning a `https://v3.fal.media/files/...` URL. Use it when a model input expects a URL and you have local data. Not needed if you already have a publicly accessible URL for your input.

### Retry behavior and error types

Fal automatically retries on **503** (runner terminated), **504** (TCP health check failure), and connection errors — up to **10 retries** with intelligent backoff. 429 (concurrency limit) retries have **no maximum** — the request waits indefinitely until a slot opens unless `start_timeout` is set. Client errors (4XX) are never retried. **Failed requests returning 5xx are not billed.** Disable retries with the `X-Fal-No-Retry: 1` header.

Known `error_type` values include `request_timeout`, `runner_disconnected`, `generation_timeout`, `content_policy_violation`, `no_media_generated`, `image_too_small`, `image_too_large`, and `image_load_error`.

### Concurrency limits, not rate limits

Fal uses **concurrency limits** (simultaneous `IN_PROGRESS` requests), not traditional rate limits. New accounts get 2 concurrent slots; this scales to 40+ with credit purchases. Only `IN_PROGRESS` requests count — you can submit unlimited requests to the queue. No explicit rate limit on status polling is documented, though SSE streaming (`/status/stream`) is recommended over repeated polling.

---

## 2. Vercel serverless constraints with Fluid Compute

### Timeout limits transformed by Fluid Compute

**Fluid Compute became the default for new projects on April 23, 2025**, dramatically changing the timeout landscape. It is available on **all plans** including Hobby.

| Plan | Fluid Compute Max | Legacy Max |
|------|-------------------|------------|
| **Hobby** | **300s** (5 min) | 60s |
| **Pro** | **800s** (~13 min) | 300s |
| **Enterprise** | **800s** (~13 min) | 900s |

Fluid Compute turns single-invocation functions into concurrent "mini-servers" that handle multiple requests on one instance. It enables **active CPU pricing** (billed only during execution, not I/O wait), bytecode caching for faster cold starts, and cross-region failover. Enable it on existing projects via Project Settings → Functions tab, or via `vercel.json`:

```json
{ "fluid": true }
```

Set per-route timeouts in Next.js App Router by exporting `maxDuration`:

```typescript
// app/api/generate-video/route.ts
export const maxDuration = 300; // seconds — up to 800 on Pro

export async function POST(request: Request) {
  // Long-running work...
}
```

### `waitUntil()` and `after()` for post-response work

**`waitUntil()`** from `@vercel/functions` extends function lifetime beyond the response. It enqueues a promise that runs after the response is sent, keeping the function alive until the promise resolves. It shares the same `maxDuration` timeout as the function itself.

```typescript
import { waitUntil } from '@vercel/functions';

export async function POST(request: Request) {
  const jobId = await submitToFal(request);
  waitUntil(logAnalytics({ jobId, timestamp: Date.now() })); // Runs after response
  return Response.json({ jobId, status: 'queued' });
}
```

**`after()`** from `next/server` is the Next.js framework equivalent, introduced as stable in **Next.js 15.1**. It works in Server Components, Server Actions, Route Handlers, and Middleware. Under the hood, it uses `waitUntil` on Vercel. Use `after()` for Next.js 15.1+ projects; use `waitUntil()` in non-Next.js frameworks.

```typescript
import { after } from 'next/server';

export async function POST(request: Request) {
  const data = await processRequest(request);
  after(async () => {
    await updateAnalytics(data); // Runs after response sent
  });
  return Response.json({ status: 'success' });
}
```

Both are **fire-and-forget** — no retries, no failure handling. Use them for logging, analytics, and cache warming, not critical business logic.

### Body size, memory, and large file handling

The **4.5 MB limit** applies to HTTP request and response bodies passing through Vercel's router. This is a hard platform limit across all plans. Streaming responses bypass this limit. Next.js Server Actions default to **1 MB** (configurable via `next.config.js` but still capped at 4.5 MB on Vercel).

Memory defaults to **2 GB / 1 vCPU** on all plans. Pro and Enterprise can configure up to **4 GB / 2 vCPU** via the dashboard. Bundle size limit is 250 MB uncompressed.

**Can you download a 50 MB video and re-upload to S3 within a Vercel function?** Yes — internal `fetch()` operations are not subject to the 4.5 MB limit. The limit only applies to what enters/leaves via Vercel's HTTP router. A 50 MB file fits comfortably in the 2–4 GB memory allocation. With Fluid Compute on Pro (800s timeout), network transfer time is not a concern. The recommended pattern:

```typescript
export const maxDuration = 300;

export async function POST(request: Request) {
  const { videoUrl, s3Key } = await request.json();
  const videoResponse = await fetch(videoUrl); // NOT subject to 4.5MB limit
  
  // Stream directly to S3 to minimize memory usage
  const upload = new Upload({
    client: s3Client,
    params: { Bucket: 'my-bucket', Key: s3Key, Body: videoResponse.body },
  });
  await upload.done();
  
  return Response.json({ success: true, key: s3Key }); // Small JSON response
}
```

However, **the recommended architecture routes webhooks to FastAPI on Railway instead**, avoiding Vercel's constraints entirely and keeping orchestration logic in a persistent process.

### Best patterns for async work on Vercel

For video generation pipelines, the correct pattern is **webhook-driven**: submit to fal.ai queue, return immediately to the client, and handle completion via a webhook endpoint. Never hold a serverless function open waiting for video generation. For truly long-running work beyond what `after()` can handle, use external job queue services like Inngest, Trigger.dev, or Upstash QStash. Vercel Cron Jobs (via `vercel.json`) can serve as a safety-net poller for missed webhooks.

---

## 3. Railway deployment handles what Vercel cannot

### Build, deploy, and expose the service

Railway auto-detects a `Dockerfile` at the project root and uses it for builds — this takes priority over all other build methods. Without a Dockerfile, Railway uses **Railpack** (the successor to Nixpacks) to auto-detect language and framework. For a FastAPI service, either approach works.

**Production Dockerfile for FastAPI:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Railway injects the **`PORT` environment variable** at runtime. Your app **must** listen on `0.0.0.0:$PORT`. For Dockerfile builds, declare build-time variables with `ARG`.

**`railway.json` for the metadata service:**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Key `deploy` fields include `startCommand`, `healthcheckPath`, `healthcheckTimeout`, `restartPolicyType`, `restartPolicyMaxRetries`, `numReplicas`, `sleepApplication`, `cronSchedule`, and `multiRegionConfig`. Environment variables **cannot** be set in `railway.json` — use the dashboard or CLI (`railway variables --set "KEY=value"`).

Services are **not publicly accessible by default**. Generate a domain via Settings → Networking → "Generate Domain" to get a URL like `your-service-production.up.railway.app`. Custom domains with automatic SSL are supported on paid plans. Services within the same project communicate over private networking using `<service>.railway.internal`.

### Pricing makes this very affordable

Railway uses subscription + usage-based pricing. The **Hobby plan at $5/month** includes $5 in usage credits. Resource pricing: **$10/GB/month for RAM**, **$20/vCPU/month for CPU**, billed by the minute.

A lightweight FastAPI metadata service using ~128 MB RAM and ~0.1 vCPU costs approximately **$3.28/month** — well within the Hobby plan's included credits. With serverless sleep mode enabled, costs drop further since you only pay for active time.

| Plan | Subscription | Included Credits | Max RAM | Max vCPU |
|------|-------------|-----------------|---------|----------|
| Hobby | $5/mo | $5/mo | 48 GB | 48 vCPU |
| Pro | $20/mo | $20/mo | 1 TB | 1,000 vCPU |

### No cold starts, native health checks, vertical autoscaling

**Railway is not serverless by default — services run as always-on containers with zero cold starts.** Optional "Serverless mode" can be enabled per-service to reduce costs; it sleeps the service after 10+ minutes of no outbound traffic and wakes on the next inbound request with a cold-boot delay. **Keep this disabled for a production orchestration service** that receives webhooks.

Health checks run **only at deployment time** — Railway queries your health endpoint until it receives HTTP 200 before routing traffic to the new deployment (zero-downtime deploys). They are not used for continuous monitoring. Railway **vertically autoscales** automatically — your service uses only the CPU/RAM it needs, up to plan limits, with no configuration required. Horizontal scaling is manual via `numReplicas`.

---

## 4. The complete integration architecture

### System design and data flow

```
┌──────────────┐      ┌───────────────────┐      ┌──────────────┐
│   Next.js    │─────▶│  FastAPI Service   │─────▶│   fal.ai     │
│  (Vercel)    │      │   (Railway)        │      │  Queue API   │
│              │      │                    │      │              │
│ • UI/Auth    │      │ • Pipeline orch.   │      │ • Kling Video│
│ • Client API │      │ • Webhook handler  │      │ • Lip Sync   │
│ • fal proxy  │      │ • S3 uploads       │      │ • TTS/Image  │
└──────────────┘      │ • Idempotency      │      └──────────────┘
       ▲              └────────┬───────────┘              │
       │                       │                          │
       │              ┌────────▼───────────┐              │
       │              │    PostgreSQL       │              │
       │              │    (Railway)        │              │
       │              │ • Job state machine │              │
       │              │ • Idempotency keys  │              │
       │              └────────────────────┘              │
       │                       │                          │
       │              ┌────────▼───────────┐              │
       └──────────────│     AWS S3         │◀─────────────┘
                      │ • Permanent video  │  (fal CDN URLs
                      │ • Audio/images     │   are temporary)
                      └────────────────────┘
```

**The flow:** User triggers generation from Next.js → Next.js calls FastAPI on Railway → FastAPI runs TTS and image generation synchronously → FastAPI submits lip-sync to fal.ai queue with webhook URL → fal.ai POSTs webhook to FastAPI on completion → FastAPI verifies signature, checks idempotency, downloads video from fal CDN, uploads to S3, updates job status → Next.js polls FastAPI for status or receives real-time update.

### Talking head pipeline orchestration

The three-step pipeline runs TTS and face generation in parallel (they're independent), then submits lip-sync async:

```python
import asyncio
import fal_client

async def run_talking_head_pipeline(job_id: str, text: str, character_desc: str):
    await update_job(job_id, step="generating", status="in_progress")
    
    # Steps 1 & 2 run in PARALLEL (independent inputs)
    tts_task = asyncio.create_task(generate_tts(text))
    image_task = asyncio.create_task(generate_image(character_desc))
    
    tts_result, image_result = await asyncio.gather(tts_task, image_task)
    audio_url = tts_result["audio"]["url"]
    image_url = image_result["images"][0]["url"]
    
    # Step 3: Lip sync — ASYNC via queue + webhook
    handler = fal_client.submit(
        "fal-ai/kling-video/lipsync/audio-to-video",
        arguments={"audio_url": audio_url, "image_url": image_url},
        webhook_url=f"https://your-api.railway.app/api/fal/webhook?job_id={job_id}",
    )
    await update_job(job_id, fal_request_id=handler.request_id, step="lipsync")
```

### Idempotent webhook handler with signature verification

The webhook handler must return 200 within 15 seconds, verify the ED25519 signature, deduplicate using `request_id`, and process the video in a background task:

```python
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException

@app.post("/api/fal/webhook")
async def fal_webhook(request: Request, background_tasks: BackgroundTasks):
    body = await request.body()
    payload = json.loads(body)
    request_id = payload["request_id"]
    
    # 1. Verify ED25519 signature
    if not await verify_fal_signature(
        request.headers.get("x-fal-webhook-request-id"),
        request.headers.get("x-fal-webhook-user-id"),
        request.headers.get("x-fal-webhook-timestamp"),
        request.headers.get("x-fal-webhook-signature"),
        body
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 2. Idempotency: atomic claim via UPDATE ... WHERE status = 'submitted'
    rows = await db.execute(
        "UPDATE jobs SET status = 'processing' WHERE fal_request_id = :rid AND status = 'submitted'",
        {"rid": request_id}
    )
    if rows.rowcount == 0:
        return {"status": "already_processed"}  # 200 to stop retries
    
    # 3. Process in background (return 200 within 15s deadline)
    background_tasks.add_task(process_completion, request_id, payload)
    return {"status": "received"}

async def process_completion(request_id: str, payload: dict):
    if payload["status"] != "OK":
        await handle_error(request_id, payload.get("error", "Unknown error"))
        return
    
    video_url = payload["payload"]["video"]["url"]
    
    # Download from fal CDN → upload to S3
    async with httpx.AsyncClient() as client:
        response = await client.get(video_url)
    
    s3_key = f"videos/{request_id}.mp4"
    s3.upload_fileobj(
        BytesIO(response.content), "your-bucket", s3_key,
        ExtraArgs={"ContentType": "video/mp4"}
    )
    
    await db.execute(
        "UPDATE jobs SET status = 'completed', s3_key = :key WHERE fal_request_id = :rid",
        {"key": s3_key, "rid": request_id}
    )
```

The **two-phase claim pattern** (`UPDATE ... WHERE status = 'submitted'`) is the most reliable idempotency mechanism. If the UPDATE affects 0 rows, another process already claimed the job. This eliminates race conditions without distributed locks.

### S3 uploads from Railway avoid Vercel's limits entirely

Railway has no request body size limit and supports long-running processes. For files over 50 MB, use streaming multipart upload to keep memory constant:

```python
from boto3.s3.transfer import TransferConfig

config = TransferConfig(
    multipart_threshold=5 * 1024 * 1024,    # 5 MB
    multipart_chunksize=5 * 1024 * 1024,
    max_concurrency=4,
)
s3.upload_fileobj(BytesIO(video_data), "bucket", key, Config=config)
```

If you must upload from a Vercel function (e.g., for smaller files), internal `fetch()` calls bypass the 4.5 MB router limit — only the HTTP request/response body is restricted.

### Error handling across the multi-step pipeline

Categorize errors to determine retry behavior. **Transient errors** (503, 504, network timeouts, rate limits) should be retried with exponential backoff. **Permanent errors** (422 validation, content policy violations, 401/403) should never be retried. **Partial pipeline failures** require compensating actions.

```python
async def handle_pipeline_error(job_id: str, step: str, error: Exception):
    await db.execute(
        "UPDATE jobs SET status = 'failed', error = :err, failed_step = :step WHERE id = :id",
        {"err": str(error), "step": step, "id": job_id}
    )
    
    # Credit management: only charge for completed steps
    completed_steps = await get_completed_steps(job_id)
    actual_cost = sum(get_step_cost(s) for s in completed_steps)
    reserved_cost = get_total_pipeline_cost()
    
    if reserved_cost > actual_cost:
        await refund_credits(job_id, reserved_cost - actual_cost)
```

For the lip-sync step specifically, fal.ai's automatic retry (up to 10 times for 503/504) handles most transient failures transparently. **Failed requests returning 5xx are not billed by fal.ai.** Content policy violations and validation errors should surface immediately to the user without retry.

---

## Conclusion

Three architectural decisions define this pipeline's reliability. First, **webhooks over polling** — fal.ai's 10-retry, 2-hour delivery guarantee makes webhooks far more robust than holding serverless functions open. Second, **Railway over Vercel for orchestration** — the always-on FastAPI container eliminates timeout pressure and body-size constraints for video processing, while costing under $5/month on the Hobby plan. Third, **immediate S3 persistence** — fal.ai CDN URLs are temporary by design, so downloading and re-uploading on webhook receipt is not optional but essential.

The non-obvious gotcha is fal.ai's signature verification: it uses **ED25519 with JWKS rotation**, not the HMAC pattern most developers expect from webhook integrations. Cache the JWKS keys with a 12–24 hour TTL and validate timestamps within a 5-minute window. The other critical detail is that fal.ai has **no explicit `FAILED` status** — errors arrive as `COMPLETED` with `error` and `error_type` fields, or via webhook with `"status": "ERROR"`. Build your state machine accordingly.