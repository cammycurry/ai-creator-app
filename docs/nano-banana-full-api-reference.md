# Nano Banana — Complete API Reference

> All Google image generation models available via **fal.ai** and **Google Gemini API**.
> Compiled March 7, 2026.

---

## Quick Model Map

| Codename | Underlying Model | fal.ai Endpoint | Gemini Model String | Pricing (fal) |
|---|---|---|---|---|
| **Nano Banana** (v1) | Gemini 2.5 Flash Image | `fal-ai/nano-banana` | `gemini-2.5-flash-image` | — |
| **Nano Banana Pro** | Gemini 3 Pro Image Preview | `fal-ai/nano-banana-pro` | `gemini-3-pro-image-preview` | $0.15/image |
| **Nano Banana 2** | Gemini 3.1 Flash Image Preview | `fal-ai/nano-banana-2` | `gemini-3.1-flash-image-preview` | $0.08/image |

Each model has a **text-to-image** endpoint and an **edit** (image-to-image) endpoint on fal.ai.

---

# PART 1 — fal.ai API Reference

## Shared Setup (All Models)

### Install

```bash
npm install --save @fal-ai/client
```

### Auth

```bash
export FAL_KEY="YOUR_API_KEY"
```

Or in code:

```javascript
import { fal } from "@fal-ai/client";
fal.config({ credentials: "YOUR_FAL_KEY" });
```

### File Upload

```javascript
import { fal } from "@fal-ai/client";
const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

---

## 1. Nano Banana (v1) — `fal-ai/nano-banana`

**Model:** Gemini 2.5 Flash Image
**Type:** Text-to-Image

### Subscribe (blocking)

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana", {
  input: {
    prompt: "A black lab swimming in a pool...",
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Queue Submit

```javascript
const { request_id } = await fal.queue.submit("fal-ai/nano-banana", {
  input: { prompt: "..." },
  webhookUrl: "https://optional.webhook.url/for/results",
});

const status = await fal.queue.status("fal-ai/nano-banana", {
  requestId: request_id, logs: true,
});

const result = await fal.queue.result("fal-ai/nano-banana", {
  requestId: request_id,
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | **Yes** | — | Text prompt to generate an image from |
| `num_images` | integer | No | `1` | Number of images to generate |
| `seed` | integer | No | — | Random seed |
| `aspect_ratio` | enum | No | `"1:1"` | `21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16` |
| `output_format` | enum | No | `"png"` | `jpeg, png, webp` |
| `safety_tolerance` | enum | No | `"4"` | `1` (strictest) to `6` (least strict) — API only |
| `sync_mode` | boolean | No | — | Return as data URI (base64) |
| `limit_generations` | boolean | No | — | Limit to 1 image per prompt round |

### Output Schema

```json
{
  "images": [
    {
      "url": "https://...",
      "content_type": "image/png",
      "file_name": "nano-banana-t2i-output.png",
      "file_size": 123456,
      "width": 1024,
      "height": 1024
    }
  ],
  "description": ""
}
```

---

## 2. Nano Banana (v1) Edit — `fal-ai/nano-banana/edit`

**Type:** Image-to-Image (Editing)

### Subscribe

```javascript
const result = await fal.subscribe("fal-ai/nano-banana/edit", {
  input: {
    prompt: "make a photo of the man driving the car down the california coastline",
    image_urls: [
      "https://example.com/input1.png",
      "https://example.com/input2.png"
    ]
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | **Yes** | — | Editing instruction |
| `image_urls` | list\<string\> | **Yes** | — | Source image URLs |
| `num_images` | integer | No | `1` | Number of outputs |
| `aspect_ratio` | enum | No | `"auto"` | `auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16` |
| `output_format` | enum | No | `"png"` | `jpeg, png, webp` |
| `sync_mode` | boolean | No | — | Return as data URI |
| `limit_generations` | boolean | No | — | Limit to 1 output |

### Output Schema

Same as text-to-image (`images` array + `description`).

---

## 3. Nano Banana Pro — `fal-ai/nano-banana-pro`

**Model:** Gemini 3 Pro Image Preview
**Type:** Text-to-Image
**Pricing:** $0.15/image (1.5x for 2K, 2x for 4K)

### Subscribe

```javascript
const result = await fal.subscribe("fal-ai/nano-banana-pro", {
  input: {
    prompt: "...",
    resolution: "2K",
    enable_web_search: true
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | **Yes** | — | Text prompt |
| `num_images` | integer | No | `1` | Number of images |
| `seed` | integer | No | — | Random seed |
| `aspect_ratio` | enum | No | `"1:1"` | `auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16` |
| `output_format` | enum | No | `"png"` | `jpeg, png, webp` |
| `safety_tolerance` | enum | No | `"4"` | `1`–`6` — API only |
| `sync_mode` | boolean | No | — | Return as data URI |
| `resolution` | enum | No | `"1K"` | **`1K, 2K, 4K`** |
| `limit_generations` | boolean | No | — | Limit to 1 output |
| `enable_web_search` | boolean | No | — | Allow model to use web for factual imagery |

### Output Schema

Same structure as v1 (`images` + `description`).

---

## 4. Nano Banana Pro Edit — `fal-ai/nano-banana-pro/edit`

**Type:** Image-to-Image (Editing)

### Subscribe

```javascript
const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
  input: {
    prompt: "make a photo of the man driving the car down the california coastline",
    image_urls: ["https://example.com/input1.png", "https://example.com/input2.png"],
    resolution: "2K"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | **Yes** | — | Editing instruction |
| `image_urls` | list\<string\> | **Yes** | — | Source image URLs |
| `num_images` | integer | No | `1` | Number of outputs |
| `seed` | integer | No | — | Random seed |
| `aspect_ratio` | enum | No | `"auto"` | `auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16` |
| `output_format` | enum | No | `"png"` | `jpeg, png, webp` |
| `safety_tolerance` | enum | No | `"4"` | `1`–`6` — API only |
| `sync_mode` | boolean | No | — | Return as data URI |
| `resolution` | enum | No | `"1K"` | `1K, 2K, 4K` |
| `limit_generations` | boolean | No | — | Limit to 1 output |
| `enable_web_search` | boolean | No | — | Web search for image gen |
| `enable_google_search` | boolean | No | — | Google Search grounding |

### Output Schema

Same structure (`images` + `description`).

---

## 5. Nano Banana 2 — `fal-ai/nano-banana-2`

**Model:** Gemini 3.1 Flash Image Preview
**Type:** Text-to-Image
**Pricing:** $0.08/image (1.5x for 2K, 2x for 4K, 0.75x for 0.5K). Web search adds $0.015.

### Subscribe

```javascript
const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: {
    prompt: "...",
    resolution: "2K",
    enable_web_search: true
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | **Yes** | — | Text prompt |
| `num_images` | integer | No | `1` | Number of images |
| `seed` | integer | No | — | Random seed |
| `aspect_ratio` | enum | No | `"auto"` | `auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16` |
| `output_format` | enum | No | `"png"` | `jpeg, png, webp` |
| `safety_tolerance` | enum | No | `"4"` | `1`–`6` — API only |
| `sync_mode` | boolean | No | — | Return as data URI |
| `resolution` | enum | No | `"1K"` | **`0.5K, 1K, 2K, 4K`** (adds 512px option) |
| `limit_generations` | boolean | No | `true` | Limit to 1 output. May affect quality. |
| `enable_web_search` | boolean | No | — | Web search grounding (+$0.015) |

### Output Schema

```json
{
  "images": [
    {
      "url": "https://...",
      "content_type": "image/png",
      "file_name": "nano-banana-2-t2i-output.png",
      "file_size": 123456,
      "width": 1024,
      "height": 1024
    }
  ],
  "description": ""
}
```

---

## 6. Nano Banana 2 Edit — `fal-ai/nano-banana-2/edit`

**Type:** Image-to-Image (Editing) — supports up to 14 reference images.

### Subscribe

```javascript
const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
  input: {
    prompt: "make a photo of the man driving the car down the california coastline",
    image_urls: ["https://example.com/input1.png", "https://example.com/input2.png"],
    resolution: "2K"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Input Schema

Same as Nano Banana Pro Edit, with the addition of `0.5K` resolution option and `limit_generations` defaulting to `true`.

---

## Additional fal.ai Endpoints (Aliases)

These are alternative endpoint names that map to the same underlying models:

| Alias Endpoint | Maps To |
|---|---|
| `fal-ai/gemini-25-flash-image` | Nano Banana (v1) |
| `fal-ai/gemini-25-flash-image/edit` | Nano Banana (v1) Edit |
| `fal-ai/gemini-3-pro-image-preview` | Nano Banana Pro |
| `fal-ai/gemini-3-pro-image-preview/edit` | Nano Banana Pro Edit |
| `fal-ai/gemini-3.1-flash-image-preview` | Nano Banana 2 |
| `fal-ai/gemini-3.1-flash-image-preview/edit` | Nano Banana 2 Edit |

---

## ImageFile Type (All fal.ai Models)

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | **Yes** | Download URL |
| `content_type` | string | No | MIME type |
| `file_name` | string | No | Auto-generated if not provided |
| `file_size` | integer | No | Size in bytes |
| `file_data` | string | No | File data (edit endpoints only) |
| `width` | integer | No | Image width |
| `height` | integer | No | Image height |

---

# PART 2 — Google Gemini API (Direct)

## Model Strings

| Model | String | Use Case |
|---|---|---|
| Nano Banana (v1) | `gemini-2.5-flash-image` | Speed/efficiency, high-volume |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Professional asset production, complex reasoning |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Best balance of speed + quality + features |

## Authentication

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
```

## Text-to-Image

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=["Create a picture of a nano banana dish in a fancy restaurant"],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

### JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "Create a picture of a nano banana dish in a fancy restaurant",
});

for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("gemini-native-image.png", buffer);
  }
}
```

### REST / cURL

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "Create a picture of a nano banana dish in a fancy restaurant"}
      ]
    }]
  }'
```

## Image Editing (Image + Text → Image)

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()
image = Image.open("/path/to/input.png")

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=["Edit this image to look like a watercolor painting", image],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        part.as_image().save("edited_image.png")
```

### JavaScript

```javascript
const prompt = [
  { text: "Edit this image to look like a watercolor painting" },
  {
    inlineData: {
      mimeType: "image/png",
      data: base64ImageData,
    },
  },
];

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: prompt,
});
```

### REST / cURL

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"contents\": [{
      \"parts\":[
        {\"text\": \"Edit this image to look like a watercolor painting\"},
        {\"inline_data\": {\"mime_type\":\"image/jpeg\", \"data\": \"<BASE64_DATA>\"}}
      ]
    }]
  }"
```

## Multi-Turn Chat Editing

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

chat = client.chats.create(
    model="gemini-3.1-flash-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)

response = chat.send_message("Create a vibrant infographic about photosynthesis")
# ... process response ...

response2 = chat.send_message("Now translate it to Spanish")
# ... process response ...
```

## Aspect Ratio & Resolution

### GenerationConfig

```json
{
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "2K"
    }
  }
}
```

### Supported Aspect Ratios

All models: `1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`

Gemini 3.1 Flash Image adds: `1:4, 4:1, 1:8, 8:1`

### Supported Resolutions

| Resolution | All Gemini 3 Models | Gemini 3.1 Flash Only |
|---|---|---|
| 512px (`"512px"`) | — | Yes |
| 1K (`"1K"`) | Yes (default) | Yes (default) |
| 2K (`"2K"`) | Yes | Yes |
| 4K (`"4K"`) | Yes | Yes |

**Must use uppercase** `K` (e.g. `"2K"` not `"2k"`).

## Grounding with Google Search

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="Visualize the current weather forecast for San Francisco",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)
```

## Grounding with Image Search (3.1 Flash only)

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A detailed painting of a Timareta butterfly on a flower",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        tools=[
            types.Tool(google_search=types.GoogleSearch(
                search_types=types.SearchTypes(
                    web_search=types.WebSearch(),
                    image_search=types.ImageSearch()
                )
            ))
        ]
    )
)
```

## Up to 14 Reference Images

Gemini 3 image models accept multiple input images:

| Capability | 3.1 Flash Image | 3 Pro Image |
|---|---|---|
| Object images (high fidelity) | Up to 10 | Up to 6 |
| Character consistency images | Up to 4 | Up to 5 |
| **Total** | **Up to 14** | **Up to 14** |

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[
        "An office group photo of these people making funny faces",
        Image.open('person1.png'),
        Image.open('person2.png'),
        Image.open('person3.png'),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(aspect_ratio="5:4", image_size="2K"),
    )
)
```

## Thinking / Reasoning

Enabled by default. Cannot be disabled. The model generates up to 2 interim "thought images" before the final output.

### Controlling Thinking Level (3.1 Flash only)

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A futuristic city in a glass bottle floating in space",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        thinking_config=types.ThinkingConfig(
            thinking_level="High",       # "minimal" (default) or "High"
            include_thoughts=True        # show/hide thought process
        ),
    )
)
```

Thinking tokens are billed regardless of `include_thoughts` setting.

## Thought Signatures

All responses include `thought_signature` fields for multi-turn context preservation. If using official SDKs with the chat feature, signatures are handled automatically. For raw REST, pass them back exactly as received in subsequent turns.

## Batch API

For high-volume generation with higher rate limits (up to 24h turnaround):

```python
# See: https://ai.google.dev/gemini-api/docs/batch-api#image-generation
```

## Key Differences: fal.ai vs Google Direct API

| Feature | fal.ai | Google Gemini API |
|---|---|---|
| Auth | `FAL_KEY` | `GEMINI_API_KEY` or OAuth |
| Interface | REST + queue/webhook | `generateContent` REST or SDK |
| Safety control | `safety_tolerance` (1–6) | Standard Gemini safety settings |
| Resolution param | `resolution` field in input | `imageConfig.imageSize` in generationConfig |
| Aspect ratio | `aspect_ratio` in input | `imageConfig.aspectRatio` in generationConfig |
| Multi-turn | Not natively (stateless) | Chat/multi-turn with history |
| Thinking control | Not exposed | `thinkingConfig.thinkingLevel` |
| Image Search grounding | Not exposed | Available (3.1 Flash) |
| Web Search grounding | `enable_web_search` | `tools: [{"google_search": {}}]` |
| Pricing | Per-image flat rate | Per-token (text + image tokens) |

---

## Source Links

- fal.ai Nano Banana v1: https://fal.ai/models/fal-ai/nano-banana/api
- fal.ai Nano Banana v1 Edit: https://fal.ai/models/fal-ai/nano-banana/edit/api
- fal.ai Nano Banana Pro: https://fal.ai/models/fal-ai/nano-banana-pro/api
- fal.ai Nano Banana Pro Edit: https://fal.ai/models/fal-ai/nano-banana-pro/edit/api
- fal.ai Nano Banana 2: https://fal.ai/models/fal-ai/nano-banana-2/api
- fal.ai Nano Banana 2 Edit: https://fal.ai/models/fal-ai/nano-banana-2/edit/api
- Google Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
- Google Gemini Models: https://ai.google.dev/gemini-api/docs/models
