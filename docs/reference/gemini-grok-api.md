# Gemini & Grok — Full API Reference (Text + Image + Chat + Vision)

> Complete API reference for **Google Gemini** and **xAI Grok** covering text generation, image generation, image understanding (vision), chat/multi-turn, streaming, and all configuration options.
> Compiled March 7, 2026.

---

# TABLE OF CONTENTS

1. [GEMINI API](#gemini-api)
   - Models & Strings
   - Text Generation (generateContent)
   - Image Generation (Nano Banana)
   - Image Understanding (Vision)
   - Chat / Multi-Turn
   - Streaming
   - Configuration (generationConfig)
   - Tools (Search, Function Calling, Code Execution)
2. [GROK API (xAI)](#grok-api-xai)
   - Models & Strings
   - Text Generation (Responses API)
   - Image Generation (grok-imagine-image)
   - Image Understanding (Vision)
   - Chat / Multi-Turn (Stateful Responses)
   - Streaming
   - Configuration & Parameters
   - Tools (Web Search, X Search, Function Calling, Code Execution)

---

# GEMINI API

## Base URL & Auth

```
Base URL: https://generativelanguage.googleapis.com/v1beta/
Auth Header: x-goog-api-key: $GEMINI_API_KEY
```

Get API key at: https://aistudio.google.com/apikey

## Models

### Text / Reasoning Models

| Model | String | Context | Notes |
|---|---|---|---|
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | — | Latest flagship |
| Gemini 3 Flash | `gemini-3-flash-preview` | — | Fast, frontier-class |
| Gemini 2.5 Flash | `gemini-2.5-flash` | 1M tokens | Workhorse |
| Gemini 2.5 Pro | `gemini-2.5-pro` | 1M tokens | Reasoning |

### Image Generation Models (Nano Banana)

| Model | String | Codename |
|---|---|---|
| Gemini 3.1 Flash Image | `gemini-3.1-flash-image-preview` | **Nano Banana 2** |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | **Nano Banana Pro** |
| Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | **Nano Banana** (v1) |

### Vision / Image Understanding

All text models support image input natively. Use `gemini-3-flash-preview`, `gemini-2.5-flash`, etc.

---

## Text Generation

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()   # reads GEMINI_API_KEY from env

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Write a story about a magic backpack.",
)
print(response.text)
```

### JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Write a story about a magic backpack.",
});
console.log(response.text);
```

### cURL

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [{"parts": [{"text": "Write a story about a magic backpack."}]}]
  }'
```

### With System Instruction & Config

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Why is the sky blue?",
    config=types.GenerateContentConfig(
        system_instruction="You are a helpful science tutor.",
        max_output_tokens=500,
        temperature=0.7,
        top_p=0.95,
        top_k=20,
        candidate_count=1,
        seed=42,
        stop_sequences=["STOP!"],
        presence_penalty=0.0,
        frequency_penalty=0.0,
    ),
)
```

---

## Image Generation (Nano Banana)

### Text-to-Image — Python

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=["A futuristic city skyline at sunset"],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

### Text-to-Image — JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "A futuristic city skyline at sunset",
});

for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("generated_image.png", buffer);
  }
}
```

### Text-to-Image — cURL

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "A futuristic city skyline at sunset"}]}]
  }'
```

### Image Editing (Image + Text → Image)

```python
from PIL import Image

image = Image.open("/path/to/input.png")

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=["Make this look like a watercolor painting", image],
)
```

### With Aspect Ratio & Resolution

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A Da Vinci style sketch of a butterfly",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",    # see table below
            image_size="2K"         # "512px", "1K", "2K", "4K"
        ),
    )
)
```

### Supported Aspect Ratios

All models: `1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`

Gemini 3.1 Flash Image adds: `1:4, 4:1, 1:8, 8:1`

### Supported Resolutions

| Resolution | Nano Banana 2 (3.1 Flash) | Nano Banana Pro (3 Pro) | Nano Banana (2.5 Flash) |
|---|---|---|---|
| 512px | Yes | No | No |
| 1K (default) | Yes | Yes | Yes |
| 2K | Yes | Yes | — |
| 4K | Yes | Yes | — |

### With Multiple Reference Images (up to 14)

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[
        "An office group photo of these people making funny faces",
        Image.open('person1.png'),
        Image.open('person2.png'),
        Image.open('person3.png'),
        Image.open('person4.png'),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(aspect_ratio="5:4", image_size="2K"),
    )
)
```

### With Google Search Grounding

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="Visualize the current weather in San Francisco as a chart",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)
```

### With Image Search Grounding (3.1 Flash only)

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

### Thinking Level Control (3.1 Flash only)

```python
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A futuristic city in a glass bottle floating in space",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        thinking_config=types.ThinkingConfig(
            thinking_level="High",       # "minimal" (default) or "High"
            include_thoughts=True
        ),
    )
)
```

---

## Image Understanding (Vision)

### Python — Inline Image

```python
from google import genai
from google.genai import types

client = genai.Client()

with open('photo.jpg', 'rb') as f:
    image_bytes = f.read()

response = client.models.generate_content(
    model='gemini-3-flash-preview',
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
        'What is in this image?'
    ]
)
print(response.text)
```

### Python — From URL

```python
import requests

image_bytes = requests.get("https://example.com/image.jpg").content
image = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=["What is this image?", image],
)
print(response.text)
```

### Python — Using Files API (for large files)

```python
my_file = client.files.upload(file="path/to/sample.jpg")

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[my_file, "Caption this image."],
)
print(response.text)
```

### JavaScript — Inline Base64

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});
const base64Image = fs.readFileSync("photo.jpg", { encoding: "base64" });

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: [
    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
    { text: "Caption this image." },
  ],
});
console.log(response.text);
```

### cURL

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"contents\": [{
      \"parts\": [
        {\"text\": \"What is in this image?\"},
        {\"inline_data\": {\"mime_type\": \"image/jpeg\", \"data\": \"<BASE64_DATA>\"}}
      ]
    }]
  }"
```

---

## Chat / Multi-Turn

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

# Turn 1
response = chat.send_message("Create a vibrant infographic about photosynthesis")
# process response...

# Turn 2
response2 = chat.send_message("Now translate it to Spanish")
# process response...
```

### cURL (Manual History)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "Hello, who are you?"}]},
      {"role": "model", "parts": [{"text": "I am Gemini, a large language model."}]},
      {"role": "user", "parts": [{"text": "What can you do?"}]}
    ]
  }'
```

---

## Streaming

### Python

```python
for chunk in client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Write a long poem about the ocean.",
):
    print(chunk.text, end="")
```

### JavaScript

```javascript
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: "Write a long poem about the ocean.",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text());
}
```

### cURL (SSE)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts": [{"text": "Write a poem about the ocean."}]}]}'
```

---

## GenerateContentConfig — Full Parameter Reference

| Parameter | Type | Description |
|---|---|---|
| `contents` | list[Content] | **Required.** Conversation messages (role + parts) |
| `system_instruction` | string | System prompt |
| `temperature` | float | Randomness (0.0–2.0) |
| `top_p` | float | Nucleus sampling threshold |
| `top_k` | int | Top-k sampling |
| `max_output_tokens` | int | Max tokens in response |
| `candidate_count` | int | Number of response candidates |
| `stop_sequences` | list[str] | Stop generation at these strings |
| `seed` | int | Reproducibility seed |
| `presence_penalty` | float | Penalize repeated topics |
| `frequency_penalty` | float | Penalize repeated tokens |
| `response_modalities` | list[str] | `["TEXT"]`, `["IMAGE"]`, or `["TEXT", "IMAGE"]` |
| `response_mime_type` | string | `"application/json"` for JSON mode |
| `response_schema` | object | JSON schema for structured output |
| `image_config` | ImageConfig | Aspect ratio + resolution for image gen |
| `thinking_config` | ThinkingConfig | Thinking level + include_thoughts |
| `tools` | list[Tool] | Google Search, function calling, code execution |
| `tool_config` | ToolConfig | Function calling mode (AUTO, ANY, NONE) |

### ImageConfig

| Field | Values |
|---|---|
| `aspect_ratio` | `"1:1"`, `"16:9"`, `"9:16"`, `"3:2"`, `"2:3"`, `"4:3"`, `"3:4"`, `"4:5"`, `"5:4"`, `"21:9"`, `"1:4"`, `"4:1"`, `"1:8"`, `"8:1"` |
| `image_size` | `"512px"`, `"1K"`, `"2K"`, `"4K"` |

### ThinkingConfig

| Field | Values |
|---|---|
| `thinking_level` | `"minimal"` (default), `"High"` |
| `include_thoughts` | `true` / `false` |

---

## Tools

### Google Search

```python
config=types.GenerateContentConfig(
    tools=[{"google_search": {}}]
)
```

### Function Calling

```python
function = types.FunctionDeclaration(
    name='get_weather',
    description='Get current weather',
    parameters_json_schema={
        'type': 'object',
        'properties': {
            'location': {'type': 'string', 'description': 'City name'}
        },
        'required': ['location'],
    },
)
tool = types.Tool(function_declarations=[function])

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='What is the weather in Tokyo?',
    config=types.GenerateContentConfig(tools=[tool]),
)
print(response.function_calls[0])
```

### Code Execution

```python
config=types.GenerateContentConfig(
    tools=[{"code_execution": {}}]
)
```

---

## Response Structure

```json
{
  "candidates": [{
    "content": {
      "parts": [
        {"text": "Response text here"},
        {"inlineData": {"mimeType": "image/png", "data": "<base64>"}}
      ],
      "role": "model"
    },
    "finishReason": "STOP",
    "groundingMetadata": { ... }
  }],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 50,
    "totalTokenCount": 60
  }
}
```

---

# GROK API (xAI)

## Base URL & Auth

```
Base URL: https://api.x.ai/v1
Auth Header: Authorization: Bearer $XAI_API_KEY
```

OpenAI SDK compatible. Get API key at: https://console.x.ai

## Models

### Text / Reasoning Models

| Model | String | Notes |
|---|---|---|
| Grok 4 | `grok-4` | Flagship, advanced reasoning, vision |
| Grok 4.1 Fast Reasoning | `grok-4-1-fast-reasoning` | Fast + reasoning |
| Grok 4.1 Fast Non-Reasoning | `grok-4-1-fast-non-reasoning` | Fast, no CoT |
| Grok 3 | `grok-3` | Previous gen |
| Grok 3 Mini | `grok-3-mini` | Budget/fast |

### Image Generation

| Model | String | Notes |
|---|---|---|
| Grok Imagine Image | `grok-imagine-image` | Latest, multi-image, editing |
| Grok 2 Image | `grok-2-image` | Legacy |

### Vision (Image Understanding)

| Model | String | Notes |
|---|---|---|
| Grok 2 Vision | `grok-2-vision-latest` | Dedicated vision model |
| Grok 4 / 4.1 | `grok-4`, `grok-4-1-fast-reasoning` | Also support image input |

---

## Text Generation — Responses API (Recommended)

### Python (xAI SDK)

```python
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(api_key=os.getenv("XAI_API_KEY"), timeout=3600)

chat = client.chat.create(model="grok-4-1-fast-reasoning")
chat.append(system("You are Grok, a helpful AI assistant."))
chat.append(user("What is the meaning of life?"))
response = chat.sample()

print(response.content)
print(response.id)  # Use this to continue the conversation
```

### Python (OpenAI SDK)

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)

response = client.responses.create(
    model="grok-4-1-fast-reasoning",
    input=[
        {"role": "system", "content": "You are Grok, a helpful AI assistant."},
        {"role": "user", "content": "What is the meaning of life?"},
    ],
)
print(response)
```

### cURL

```bash
curl https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -m 3600 \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "input": [
      {"role": "system", "content": "You are Grok, a helpful AI assistant."},
      {"role": "user", "content": "What is the meaning of life?"}
    ]
  }'
```

### Legacy Chat Completions (still supported)

```bash
curl https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

---

## Image Generation — grok-imagine-image

### Text-to-Image — xAI SDK

```python
import xai_sdk

client = xai_sdk.Client()

response = client.image.sample(
    prompt="A collage of London landmarks in a stenciled street-art style",
    model="grok-imagine-image",
)
print(response.url)
```

### Text-to-Image — OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(base_url="https://api.x.ai/v1", api_key="YOUR_API_KEY")

response = client.images.generate(
    model="grok-imagine-image",
    prompt="A collage of London landmarks in a stenciled street-art style",
)
print(response.data[0].url)
```

### Text-to-Image — cURL

```bash
curl -X POST https://api.x.ai/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "A collage of London landmarks in a stenciled street-art style"
  }'
```

### Image Editing (Single Image) — xAI SDK

```python
import base64
import xai_sdk

client = xai_sdk.Client()

with open("photo.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode("utf-8")

response = client.image.sample(
    prompt="Render this as a pencil sketch with detailed shading",
    model="grok-imagine-image",
    image_url=f"data:image/png;base64,{image_data}",
)
print(response.url)
```

### Image Editing (Single Image) — cURL

```bash
curl -X POST https://api.x.ai/v1/images/edits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "Render this as a pencil sketch with detailed shading",
    "image": {
      "url": "https://example.com/photo.png",
      "type": "image_url"
    }
  }'
```

### Multi-Image Editing — xAI SDK

```python
response = client.image.sample(
    prompt="Add the cat from the first image to the second one.",
    model="grok-imagine-image",
    image_urls=[
        "https://example.com/cat.jpeg",
        "https://example.com/scene.jpeg",
    ],
)
print(response.url)
```

### Multi-Image Editing — cURL

```bash
curl -X POST https://api.x.ai/v1/images/edits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "Add the cat from the first image to the second one.",
    "images": [
      {"url": "https://example.com/cat.jpeg", "type": "image_url"},
      {"url": "https://example.com/scene.jpeg", "type": "image_url"}
    ]
  }'
```

### Batch Generation (Multiple Variations)

```python
responses = client.image.sample_batch(
    prompt="A futuristic city skyline at night",
    model="grok-imagine-image",
    n=4,
)
for i, image in enumerate(responses):
    print(f"Variation {i + 1}: {image.url}")
```

### Concurrent Requests (Different Prompts)

```python
import asyncio
import xai_sdk

async def generate_concurrently():
    client = xai_sdk.AsyncClient()
    source_image = "https://example.com/portrait.jpg"

    prompts = [
        "Render as an oil painting",
        "Render as a pencil sketch",
        "Render as pop art",
        "Render as watercolor",
    ]

    tasks = [
        client.image.sample(
            prompt=p, model="grok-imagine-image", image_url=source_image
        )
        for p in prompts
    ]
    results = await asyncio.gather(*tasks)
    for p, r in zip(prompts, results):
        print(f"{p}: {r.url}")

asyncio.run(generate_concurrently())
```

### Aspect Ratios

| Ratio | Use Case |
|---|---|
| `1:1` | Social media, thumbnails |
| `16:9` / `9:16` | Widescreen, mobile stories |
| `4:3` / `3:4` | Presentations, portraits |
| `3:2` / `2:3` | Photography |
| `2:1` / `1:2` | Banners, headers |
| `19.5:9` / `9:19.5` | Modern smartphones |
| `20:9` / `9:20` | Ultra-wide displays |
| `auto` | Model auto-selects |

```python
response = client.image.sample(
    prompt="Mountain landscape at sunrise",
    model="grok-imagine-image",
    aspect_ratio="16:9",
)
```

### Base64 Output

```python
response = client.image.sample(
    prompt="A serene Japanese garden",
    model="grok-imagine-image",
    image_format="base64",
)
with open("garden.jpg", "wb") as f:
    f.write(response.image)
```

### Response Metadata

```python
print(response.url)                  # Image URL (temporary)
print(response.respect_moderation)   # Boolean - passed moderation?
print(response.model)                # Actual model used
```

### Limitations

- Max 10 images per request
- URLs are temporary — download promptly
- Content moderation enforced

---

## Image Understanding (Vision)

### Python (xAI SDK + Responses API)

```python
import os
from xai_sdk import Client
from xai_sdk.chat import user, image

client = Client(api_key=os.getenv("XAI_API_KEY"), timeout=3600)

chat = client.chat.create(model="grok-4-1-fast-reasoning")
chat.append(
    user(
        "What's in this image?",
        image(image_url="https://example.com/photo.jpg", detail="high"),
    )
)
response = chat.sample()
print(response.content)
```

### Python (OpenAI SDK — Chat Completions)

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_XAI_KEY", base_url="https://api.x.ai/v1")

response = client.chat.completions.create(
    model="grok-2-vision-latest",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {
                    "url": "https://example.com/photo.jpg",
                    "detail": "high"
                }
            },
            {"type": "text", "text": "What's in this image?"}
        ]
    }]
)
print(response.choices[0].message.content)
```

### Python (OpenAI SDK — Base64 Image)

```python
import base64

with open("photo.jpg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

response = client.chat.completions.create(
    model="grok-2-vision-latest",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpg;base64,{b64}",
                    "detail": "high"
                }
            },
            {"type": "text", "text": "Describe this image in detail."}
        ]
    }]
)
```

### cURL (Responses API)

```bash
curl https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4",
    "input": [{
      "role": "user",
      "content": [
        {"type": "input_image", "image_url": "https://example.com/photo.jpg"},
        {"type": "input_text", "text": "What is in this image?"}
      ]
    }]
  }'
```

### Vision Constraints

- Max image size: 10 MiB
- Supported formats: JPEG, PNG
- No limit on number of images
- Any order of text/image parts accepted

---

## Chat / Multi-Turn (Stateful Responses API)

The Responses API stores conversation history server-side for 30 days. Continue by passing `previous_response_id`.

### Chaining Conversations

```python
# Turn 1
chat = client.chat.create(model="grok-4-1-fast-reasoning", store_messages=True)
chat.append(system("You are a helpful assistant."))
chat.append(user("What is quantum computing?"))
response = chat.sample()
print(response.id)  # Save this ID

# Turn 2 — continue from previous response
chat2 = client.chat.create(
    model="grok-4-1-fast-reasoning",
    previous_response_id=response.id,
    store_messages=True,
)
chat2.append(user("How does it differ from classical computing?"))
response2 = chat2.sample()
```

### cURL Multi-Turn

```bash
# Turn 2 — reference previous response ID
curl https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "previous_response_id": "rs_abc123...",
    "input": [
      {"role": "user", "content": "How does it differ from classical computing?"}
    ]
  }'
```

### Disable Server Storage

```python
chat = client.chat.create(model="grok-4", store_messages=False)
```

### Retrieve / Delete Stored Responses

```python
# Retrieve
response = client.chat.get_stored_completion("rs_abc123...")

# Delete
client.chat.delete_stored_completion("rs_abc123...")
```

---

## Streaming

### Python (xAI SDK)

```python
chat = client.chat.create(model="grok-4-1-fast-reasoning")
chat.append(user("Write a long story about space travel"))

for chunk in chat.sample_stream():
    print(chunk, end="", flush=True)
```

### cURL (SSE)

```bash
curl https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "stream": true,
    "input": [{"role": "user", "content": "Write a story about space"}]
  }'
```

---

## Reasoning (Encrypted Thinking)

```python
chat = client.chat.create(
    model="grok-4-1-fast-reasoning",
    use_encrypted_content=True
)
chat.append(user("Solve this math problem step by step: ..."))
response = chat.sample()

# Pass reasoning back in next turn
chat.append(response)  # SDK handles encrypted content automatically
chat.append(user("Now explain it differently"))
response2 = chat.sample()
```

### cURL

```bash
curl https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "input": [{"role": "user", "content": "Solve: what is 127 * 389?"}],
    "include": ["reasoning.encrypted_content"]
  }'
```

---

## Tools

### Web Search

```python
# Via Responses API
response = client.responses.create(
    model="grok-4",
    input=[{"role": "user", "content": "What happened in tech news today?"}],
    tools=[{"type": "web_search"}],
)
```

### X (Twitter) Search

```python
tools=[{"type": "x_search"}]
```

### Function Calling

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"}
            },
            "required": ["location"]
        }
    }
}]
```

### Code Execution

```python
tools=[{"type": "code_interpreter"}]
```

### Collections Search (RAG)

```python
tools=[{
    "type": "file_search",
    "vector_store_ids": ["vs_abc123"],
    "max_num_results": 5
}]
```

---

## API Endpoints Summary

| Capability | Gemini Endpoint | Grok Endpoint |
|---|---|---|
| Text Generation | `POST /models/{model}:generateContent` | `POST /v1/responses` |
| Streaming | `POST /models/{model}:streamGenerateContent?alt=sse` | `POST /v1/responses` (stream: true) |
| Image Generation | Same as text gen (with image models) | `POST /v1/images/generations` |
| Image Editing | Same as text gen (pass image + text) | `POST /v1/images/edits` |
| Image Understanding | Same as text gen (pass image + text) | `POST /v1/responses` (with image parts) |
| Legacy Chat | — | `POST /v1/chat/completions` |
| Batch | `POST /models/{model}:batchGenerateContent` | `POST /v1/batch` |

---

## Source Links

### Gemini
- Image Generation (Nano Banana): https://ai.google.dev/gemini-api/docs/image-generation
- Image Understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- Text Generation: https://ai.google.dev/gemini-api/docs/text-generation
- All Models: https://ai.google.dev/gemini-api/docs/models
- API Reference: https://ai.google.dev/api
- Python SDK: https://googleapis.github.io/python-genai/

### Grok (xAI)
- Text Generation (Responses API): https://docs.x.ai/docs/guides/chat
- Image Generation: https://docs.x.ai/docs/guides/image-generations
- Image Understanding: https://docs.x.ai/docs/guides/image-understanding
- Models & Pricing: https://docs.x.ai/developers/models
- API Reference: https://docs.x.ai/docs/api-reference
- Getting Started: https://docs.x.ai/developers/quickstart
