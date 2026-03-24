// Background service worker for Reference Collector
// Handles API calls to /api/reference and media downloads

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "refSaveAccount") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refSavePost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refConfirmPost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refCheckPost") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refUploadToS3") {
    handleS3Upload(msg.uploadUrl, msg.blob, msg.mimeType)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "fetchBlob") {
    handleFetchBlob(msg.url).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === "fetchIgMedia") {
    handleFetchIgMedia(msg.shortcode).then(sendResponse).catch((e) => sendResponse({ items: [], error: e.message }));
    return true;
  }
  if (msg.type === "getSettings") {
    getSettings().then(sendResponse).catch(() => sendResponse({}));
    return true;
  }
  if (msg.type === "updateBadge") {
    setBadge(msg.count);
    return false;
  }
  return false;
});

// ── Reference API calls ──────────────────────────────────────────────
async function handleRefApiCall(data) {
  const settings = await getSettings();
  if (!settings.apiUrl || !settings.apiKey) {
    return { ok: false, error: "API not configured — go to extension settings" };
  }
  const endpoint = `${settings.apiUrl.replace(/\/+$/, "")}/api/reference`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Server error ${res.status}: ${text}` };
  }
  return await res.json();
}

// ── S3 Upload ────────────────────────────────────────────────────────
async function handleS3Upload(uploadUrl, dataUri, mimeType) {
  const [header, b64] = dataUri.split(",");
  const mime = mimeType || header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: blob,
  });
  if (!res.ok) return { ok: false, error: `S3 upload failed: ${res.status}` };
  return { ok: true };
}

// ── Fetch blob via background (CORS bypass) ──────────────────────────
async function handleFetchBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  if (blob.size > 100 * 1024 * 1024) throw new Error("File too large (>100MB)");
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve({ dataUri: reader.result, size: blob.size, type: blob.type });
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

// ── Instagram media fetch by shortcode ───────────────────────────────
async function handleFetchIgMedia(shortcode) {
  if (!shortcode) return { items: [] };

  // Method 1: GraphQL
  try {
    const variables = JSON.stringify({ shortcode, child_comment_count: 0, fetch_comment_count: 0, parent_comment_count: 0, has_threaded_comments: false });
    const url = `https://www.instagram.com/graphql/query/?query_hash=477b65a610463740ccdb83135b2014db&variables=${encodeURIComponent(variables)}`;
    const resp = await fetch(url, { credentials: "include" });
    if (resp.ok) {
      const text = await resp.text();
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        const media = json?.data?.shortcode_media;
        if (media) return { items: extractFromGraphQLMedia(media, shortcode) };
      }
    }
  } catch (e) {
    console.warn("[bg] GraphQL method failed:", e.message);
  }

  // Method 2: Private API
  try {
    const pk = shortcodeToPk(shortcode);
    if (pk) {
      const url = `https://i.instagram.com/api/v1/media/${pk}/info/`;
      const resp = await fetch(url, {
        credentials: "include",
        headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
      });
      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          const item = json?.items?.[0];
          if (item) return { items: extractFromPrivateApiMedia(item, shortcode) };
        }
      }
    }
  } catch (e) {
    console.warn("[bg] Private API method failed:", e.message);
  }

  return { items: [] };
}

function extractFromGraphQLMedia(media, shortcode) {
  const items = [];
  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || null;
  const username = media.owner?.username || null;

  // Check for carousel
  const sidecar = media.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecar) && sidecar.length > 0) {
    sidecar.forEach((edge, ci) => {
      const node = edge?.node;
      if (!node) return;
      if (node.video_url) {
        items.push({ url: node.video_url, type: "video", code: shortcode, username, caption, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 });
      } else if (node.display_url) {
        items.push({ url: node.display_url, type: "image", code: shortcode, username, caption, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 });
      }
    });
    return items;
  }

  // Single post
  if (media.video_url) {
    items.push({ url: media.video_url, type: "video", code: shortcode, username, caption, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  } else if (media.display_url) {
    items.push({ url: media.display_url, type: "image", code: shortcode, username, caption, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  }
  return items;
}

function extractFromPrivateApiMedia(item, shortcode) {
  const items = [];
  const caption = item.caption?.text || null;
  const username = item.user?.username || null;

  // Check for carousel
  const carousel = item.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 0) {
    carousel.forEach((child, ci) => {
      if (child.video_versions?.length > 0) {
        const sorted = [...child.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ url: sorted[0].url, type: "video", code: shortcode, username, caption, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0 });
      } else if (child.image_versions2?.candidates?.length > 0) {
        const sorted = [...child.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ url: sorted[0].url, type: "image", code: shortcode, username, caption, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0 });
      }
    });
    return items;
  }

  // Single post
  if (item.video_versions?.length > 0) {
    const sorted = [...item.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ url: sorted[0].url, type: "video", code: shortcode, username, caption, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
  } else if (item.image_versions2?.candidates?.length > 0) {
    const sorted = [...item.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ url: sorted[0].url, type: "image", code: shortcode, username, caption, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
  }
  return items;
}

function shortcodeToPk(shortcode) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let pk = BigInt(0);
  for (const ch of shortcode) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) return null;
    pk = pk * BigInt(64) + BigInt(idx);
  }
  return pk.toString();
}

// ── Settings ─────────────────────────────────────────────────────────
async function getSettings() {
  const { refSettings = {} } = await chrome.storage.local.get("refSettings");
  return {
    apiUrl: refSettings.apiUrl || "http://localhost:3000",
    apiKey: refSettings.apiKey || "",
  };
}

function setBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#4361ee" });
}
