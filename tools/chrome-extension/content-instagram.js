// Content script for Instagram
// Reads intercepted media URLs from page-context interceptor (via DOM attribute bridge),
// downloads video/images directly, and uploads to S3 via the presigned URL flow.

let lastUrl = window.location.href;
const __mc_ig_media = [];
const __mc_saved_codes = new Set();
let __mc_saving = false; // lock to prevent scanPage from clobbering button during save

// ── Bridge from page-context interceptor ──────────────────────────────
function processMediaQueue() {
  const el = document.documentElement;
  const raw = el.getAttribute("data-mc-ig-queue");
  if (!raw) return;
  el.removeAttribute("data-mc-ig-queue");
  try {
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return;
    for (const item of queue) {
      if (!item?.url) continue;
      if (item.code && __mc_ig_media.some((m) => m.code === item.code && m.type === item.type)) continue;
      const base = item.url.split("?")[0];
      if (__mc_ig_media.some((m) => m.url.split("?")[0] === base)) continue;
      __mc_ig_media.push(item);
      console.log(`[ig] Captured ${item.type} [${item.code || "?"}]: ${item.url.substring(0, 80)}...`);
    }
  } catch {}
}

processMediaQueue();
const igObserver = new MutationObserver(() => processMediaQueue());
igObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mc-ig-queue"] });

// ── Init ──────────────────────────────────────────────────────────────
function init() {
  updateFloatingButton();

  // Check for URL changes (Instagram SPA navigation / reel scrolling)
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateFloatingButton();
    }
  }, 300);
}

// ── Floating Button ───────────────────────────────────────────────────
function updateFloatingButton() {
  const path = window.location.pathname;
  const isMediaPage = /\/(p|reel|reels)(\/|$)/.test(path);

  let btn = document.getElementById("mc-ig-float-btn");

  if (!isMediaPage) {
    if (btn) btn.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "mc-ig-float-btn";
    btn.className = "mc-save-btn";
    btn.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:2147483647;padding:10px 18px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
    btn.addEventListener("click", () => handleSave(btn));
    document.body.appendChild(btn);
  }

  // Don't touch the button while a save is in progress
  if (__mc_saving) return;

  const code = getCurrentShortcode();
  if (code && __mc_saved_codes.has(code)) {
    btn.textContent = "✓ Saved";
    btn.classList.add("mc-saved");
    btn.disabled = true;
    btn.style.background = "#06d6a0";
    btn.style.opacity = "0.85";
  } else {
    btn.textContent = "Save to Library";
    btn.classList.remove("mc-saved");
    btn.disabled = false;
    btn.style.background = "";
    btn.style.opacity = "";
  }
}

// ── Save Handler ──────────────────────────────────────────────────────
async function handleSave(btn) {
  const code = getCurrentShortcode();
  if (code && __mc_saved_codes.has(code)) {
    showToast("Already saved this one!");
    return;
  }

  __mc_saving = true;
  btn.disabled = true;
  btn.textContent = "Finding media...";
  btn.style.background = "#e6a817";

  const mediaItems = await extractMediaForPage();
  console.log("[ig] Media items found:", mediaItems.length, mediaItems.map((m) => `${m.type}[${m.code || "?"}]`));

  if (mediaItems.length === 0) {
    btn.textContent = "No media found";
    btn.style.background = "#e63946";
    showToast("No media found. Try playing the video first, then click Save.");
    setTimeout(() => { __mc_saving = false; updateFloatingButton(); }, 3000);
    return;
  }

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    btn.textContent = `Downloading ${i + 1}/${mediaItems.length}...`;

    try {
      const blob = await downloadMedia(item);
      if (!blob || blob.size === 0) {
        console.warn("[ig] Download empty, skipping:", item.url.substring(0, 60));
        failed++;
        continue;
      }
      console.log(`[ig] Downloaded ${item.type} [${item.code || "?"}]: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
      btn.textContent = `Uploading ${sizeMB}MB...`;

      await uploadToLibrary(blob, item);
      saved++;

      if (item.code) __mc_saved_codes.add(item.code);

      chrome.runtime.sendMessage({
        type: "mediaCaptured",
        entry: {
          title: item.title,
          pageUrl: item.pageUrl,
          url: item.url,
          timestamp: Date.now(),
          type: item.type,
          origin: "instagram",
          username: item.username,
          savedToLibrary: true,
        },
      });
    } catch (err) {
      console.error("[ig] Save failed for item:", err);
      failed++;
    }
  }

  __mc_saving = false;

  if (saved > 0) {
    showToast(`Saved ${saved} item(s) to library${failed > 0 ? ` (${failed} failed)` : ""}`);
  } else {
    showToast(`Failed to save. ${failed} item(s) failed.`);
  }

  updateFloatingButton();
}

// ── Media Extraction ──────────────────────────────────────────────────
async function extractMediaForPage() {
  const username = extractUsernameFromPage();
  const pageUrl = window.location.href;
  const shortcode = getCurrentShortcode();
  const items = [];
  const seen = new Set();

  // 1. Check interceptor cache first
  const intercepted = findInterceptedMediaForPage();

  // 2. If cache missed and we have a shortcode, fetch directly from Instagram API
  let mediaList = intercepted;
  if (mediaList.length === 0 && shortcode) {
    console.log(`[ig] Cache miss for ${shortcode}, fetching from API...`);
    const fetched = await fetchMediaByShortcode(shortcode);
    if (fetched.length > 0) {
      for (const f of fetched) {
        if (!__mc_ig_media.some((m) => m.code === f.code && m.type === f.type)) {
          __mc_ig_media.push(f);
        }
      }
      // For reels, only accept video results (not thumbnail images)
      const isReel = /\/(reel|reels)\//.test(window.location.pathname);
      if (isReel) {
        const videos = fetched.filter((f) => f.type === "video");
        mediaList = videos.length > 0 ? videos : fetched;
      } else {
        mediaList = fetched;
      }
    }
  }

  for (const m of mediaList) {
    const base = m.url.split("?")[0];
    if (seen.has(base)) continue;
    seen.add(base);

    const mimeType = m.type === "video" ? "video/mp4" : "image/jpeg";
    const resolvedUsername = m.username || username;
    items.push({
      url: m.url,
      type: m.type,
      mimeType,
      code: m.code,
      caption: m.caption || null,
      audio: m.audio || null,
      title: `${resolvedUsername || "instagram"}_${m.type}_${m.code || Date.now()}_${items.length}`,
      pageUrl: pageUrl || window.location.href,
      username: resolvedUsername,
    });
  }

  // 3. If still nothing, check og:video meta tag
  if (!items.some((i) => i.type === "video")) {
    const ogVideo = document.querySelector('meta[property="og:video"]');
    if (ogVideo?.content && !seen.has(ogVideo.content.split("?")[0])) {
      seen.add(ogVideo.content.split("?")[0]);
      items.push({
        url: ogVideo.content,
        type: "video",
        mimeType: "video/mp4",
        title: `${username || "instagram"}_video_${Date.now()}`,
        pageUrl: pageUrl || window.location.href,
        username,
      });
    }
  }

  // 4. If no video at all, grab images from DOM
  if (!items.some((i) => i.type === "video")) {
    const scope = document.querySelector("main") || document.body;
    const imgSelector = 'article img[srcset], article img[sizes], [role="presentation"] img[srcset], [role="dialog"] img[srcset]';
    scope.querySelectorAll(imgSelector).forEach((img) => {
      const src = getBestImageSrc(img);
      if (src && !isProfilePic(src) && !isIcon(src) && !seen.has(src.split("?")[0])) {
        seen.add(src.split("?")[0]);
        items.push({
          url: src,
          type: "image",
          mimeType: "image/jpeg",
          title: `${username || "instagram"}_image_${Date.now()}_${items.length}`,
          pageUrl: pageUrl || window.location.href,
          username,
        });
      }
    });
  }

  return items;
}

function findInterceptedMediaForPage() {
  const shortcode = getCurrentShortcode();
  console.log(`[ig] Looking for shortcode: ${shortcode || "unknown"}, captured: ${__mc_ig_media.length} items`);

  if (shortcode) {
    const videos = __mc_ig_media.filter((m) => m.code === shortcode && m.type === "video");
    if (videos.length > 0) {
      console.log(`[ig] ✓ Matched video for ${shortcode}`);
      return videos;
    }
    const images = __mc_ig_media.filter((m) => m.code === shortcode && m.type === "image");
    if (images.length > 0) {
      console.log(`[ig] ✓ Matched image for ${shortcode}`);
      return images;
    }
    console.log(`[ig] ✗ Not in cache for ${shortcode}, will try API fetch`);
  }

  return [];
}

// Fetch media info directly from Instagram's API when the interceptor missed it.
// Runs through the background service worker which has proper cookie/CORS access.
async function fetchMediaByShortcode(shortcode) {
  console.log(`[ig] Fetching media info for ${shortcode} via background...`);

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "fetchIgMedia", shortcode }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[ig] fetchIgMedia error:", chrome.runtime.lastError.message);
        resolve([]);
        return;
      }
      if (!response?.items || response.items.length === 0) {
        console.warn("[ig] fetchIgMedia returned no items for", shortcode);
        resolve([]);
        return;
      }
      console.log(`[ig] ✓ Got ${response.items.length} item(s) from API for ${shortcode}`);
      resolve(response.items);
    });
  });
}

function getCurrentShortcode() {
  const urlMatch = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  if (urlMatch) return urlMatch[2];
  return null;
}

// ── Download ──────────────────────────────────────────────────────────
async function downloadMedia(item) {
  let url = item.url;
  url = url.replace(/[&?]bytestart=\d+/, "").replace(/[&?]byteend=\d+/, "");
  url = url.replace(/\?&/, "?").replace(/\?$/, "");

  console.log(`[ig] Downloading ${item.type} [${item.code || "?"}]: ${url.substring(0, 120)}...`);

  let blob;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    blob = await resp.blob();
  } catch (directErr) {
    console.warn(`[ig] Direct fetch failed (${directErr.message}), trying via background...`);
    blob = await fetchViaBackground(url);
  }

  console.log(`[ig] Downloaded: ${(blob.size / 1024 / 1024).toFixed(1)}MB, type=${blob.type}`);
  return new Blob([blob], { type: item.mimeType || blob.type });
}

async function fetchViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetchBlob", url }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      if (!response?.dataUri) {
        reject(new Error("No data returned from background fetch"));
        return;
      }
      const [header, b64] = response.dataUri.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      resolve(new Blob([bytes], { type: mime }));
    });
  });
}

// ── Upload to Library ─────────────────────────────────────────────────
async function uploadToLibrary(blob, item) {
  const mimeType = item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg");

  const urlData = await chrome.runtime.sendMessage({
    type: "getUploadUrl",
    title: item.title,
    pageUrl: item.pageUrl,
    mimeType,
    url: item.url || "",
    origin: "instagram",
  });

  if (urlData?.error) throw new Error(urlData.error);
  if (urlData?.alreadySaved) {
    console.log("[ig] Server says already saved, skipping upload");
    return;
  }
  if (!urlData?.uploadUrl) throw new Error("No upload URL returned");

  const s3Res = await fetch(urlData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });

  if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

  const confirmResult = await chrome.runtime.sendMessage({
    type: "confirmUpload",
    s3Key: urlData.key,
    s3Url: urlData.publicUrl,
    filename: urlData.filename,
    mimeType,
    size: blob.size,
    title: item.title,
    pageUrl: item.pageUrl,
    origin: "instagram",
    username: item.username || null,
    caption: item.caption || null,
    audio: item.audio || null,
  });

  if (!confirmResult?.ok) throw new Error(confirmResult?.error || "Confirm failed");
  console.log("[ig] Upload confirmed:", urlData.publicUrl);
}

// ── Helpers ───────────────────────────────────────────────────────────
function getBestImageSrc(img) {
  const srcset = img.getAttribute("srcset");
  if (srcset) {
    const sources = srcset.split(",").map((s) => {
      const parts = s.trim().split(/\s+/);
      const w = parseInt(parts[1]) || 0;
      return { url: parts[0], w };
    });
    sources.sort((a, b) => b.w - a.w);
    if (sources[0]?.url) return sources[0].url;
  }
  return img.src;
}

function isProfilePic(src) {
  return src.includes("/s150x150/") || src.includes("/s44x44/") || src.includes("/s32x32/") || src.includes("/s64x64/") || src.includes("profile_pic");
}

function isIcon(src) {
  return src.includes("static/images/") || src.includes("/ico/");
}

function extractUsernameFromPage() {
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.content) {
    const match = ogTitle.content.match(/@?(\w+)/);
    if (match) return match[1];
  }
  const pathMatch = window.location.pathname.match(/^\/([^/?]+)\/?(?:p|reel)?/);
  if (pathMatch && !["explore", "direct", "accounts", "stories", "reels"].includes(pathMatch[1])) {
    return pathMatch[1];
  }
  return null;
}

function showToast(msg) {
  let t = document.getElementById("mc-toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.id = "mc-toast";
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#1a1a2e",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    zIndex: "2147483647",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    transition: "opacity 0.3s",
    opacity: "0",
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = "1"));
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
