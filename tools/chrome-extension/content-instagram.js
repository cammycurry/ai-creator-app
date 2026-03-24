// Content script for Reference Collector
// Profile page: "Add to Collection" button saves account metadata
// Post page: "Save" button downloads full-res images to S3

let lastUrl = window.location.href;
const __mc_ig_media = [];
const __mc_saved_codes = new Map(); // shortcode -> Set of saved carouselIndexes
let __mc_saving = false;

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
      const base = item.url.split("?")[0];
      if (__mc_ig_media.some((m) => m.url.split("?")[0] === base)) continue;
      __mc_ig_media.push(item);
      console.log(`[ref] Captured ${item.type} [${item.code || "?"}] ci=${item.carouselIndex ?? 0}: ${item.url.substring(0, 80)}...`);
    }
  } catch {}
}

processMediaQueue();
const igObserver = new MutationObserver(() => processMediaQueue());
igObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mc-ig-queue"] });

// ── Init ──────────────────────────────────────────────────────────────
function init() {
  updateUI();
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateUI();
    }
  }, 300);
}

// ── Page Type Detection ───────────────────────────────────────────────
function getPageType() {
  const path = window.location.pathname;
  if (/^\/(p|reel|reels)\//.test(path)) return "post";
  // Profile page: /{username}/ but not system pages
  const systemPages = ["explore", "direct", "accounts", "stories", "reels", "about", "session", "emails", "privacy"];
  const match = path.match(/^\/([^/?]+)\/?$/);
  if (match && !systemPages.includes(match[1])) return "profile";
  return "other";
}

function updateUI() {
  const pageType = getPageType();
  // Remove existing buttons
  document.getElementById("mc-ig-float-btn")?.remove();
  document.getElementById("mc-ig-profile-btn")?.remove();

  if (pageType === "post") {
    showPostButton();
  } else if (pageType === "profile") {
    showProfileButton();
  }
}

// ── Profile Page: Add to Collection ───────────────────────────────────
function showProfileButton() {
  const btn = document.createElement("button");
  btn.id = "mc-ig-profile-btn";
  btn.className = "mc-save-btn";
  btn.textContent = "Add to Collection";
  btn.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:2147483647;padding:10px 18px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#4361ee;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;";
  btn.addEventListener("click", () => handleSaveAccount(btn));
  document.body.appendChild(btn);
}

async function handleSaveAccount(btn) {
  btn.disabled = true;
  btn.textContent = "Saving...";
  btn.style.background = "#e6a817";

  const metadata = scrapeProfileMetadata();
  if (!metadata.handle) {
    btn.textContent = "Could not detect account";
    btn.style.background = "#e63946";
    setTimeout(() => { btn.textContent = "Add to Collection"; btn.style.background = "#4361ee"; btn.disabled = false; }, 3000);
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({
      type: "refSaveAccount",
      data: { action: "saveAccount", ...metadata },
    });
    if (result?.ok) {
      btn.textContent = result.isNew ? "Added!" : "Updated!";
      btn.style.background = "#06d6a0";
      showToast(`${metadata.handle} added to collection`);
    } else {
      throw new Error(result?.error || "Save failed");
    }
  } catch (err) {
    btn.textContent = "Error";
    btn.style.background = "#e63946";
    showToast(`Error: ${err.message}`);
  }
  setTimeout(() => { btn.textContent = "Add to Collection"; btn.style.background = "#4361ee"; btn.disabled = false; }, 3000);
}

function scrapeProfileMetadata() {
  const handle = window.location.pathname.replace(/^\/|\/$/g, "");
  const metadata = { handle, name: null, bio: null, followers: null, following: null, postCount: null, profilePicUrl: null };

  // Display name from header
  try {
    const nameEl = document.querySelector("header h2") || document.querySelector('header span[dir="auto"]');
    if (nameEl) metadata.name = nameEl.textContent.trim();
  } catch {}

  // Bio
  try {
    const bioEl = document.querySelector("header section > div:last-child > span") || document.querySelector('div[role="presentation"] span');
    // Instagram puts bio in a -webkit-line-clamp container
    const candidates = document.querySelectorAll("header span");
    for (const el of candidates) {
      const text = el.textContent?.trim();
      if (text && text.length > 20 && text !== metadata.name && !text.includes("followers")) {
        metadata.bio = text;
        break;
      }
    }
  } catch {}

  // Stats (followers, following, posts)
  try {
    const statLinks = document.querySelectorAll("header ul li, header section ul li");
    for (const li of statLinks) {
      const text = li.textContent?.toLowerCase() || "";
      const numMatch = text.match(/([\d,.]+[kmb]?)\s*(posts?|followers?|following)/);
      if (numMatch) {
        const val = parseStatNumber(numMatch[1]);
        if (numMatch[2].startsWith("post")) metadata.postCount = val;
        else if (numMatch[2] === "following") metadata.following = val;
        else if (numMatch[2].startsWith("follower")) metadata.followers = val;
      }
    }
  } catch {}

  // Profile pic
  try {
    const img = document.querySelector('header img[alt*="profile"]') || document.querySelector("header img");
    if (img?.src && !img.src.includes("s44x44") && !img.src.includes("s32x32")) {
      metadata.profilePicUrl = img.src;
    }
  } catch {}

  return metadata;
}

function parseStatNumber(str) {
  str = str.replace(/,/g, "");
  const multipliers = { k: 1000, m: 1000000, b: 1000000000 };
  const match = str.match(/([\d.]+)([kmb])?/i);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (match[2]) num *= multipliers[match[2].toLowerCase()] || 1;
  return Math.round(num);
}

// ── Post Page: Save Button ────────────────────────────────────────────
async function showPostButton() {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return;

  const btn = document.createElement("button");
  btn.id = "mc-ig-float-btn";
  btn.className = "mc-save-btn";
  btn.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:2147483647;padding:10px 18px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);background:#4361ee;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;";
  btn.textContent = "Save";
  btn.disabled = true;
  document.body.appendChild(btn);

  // Check if already saved
  try {
    const check = await chrome.runtime.sendMessage({
      type: "refCheckPost",
      data: { action: "checkPost", shortcode },
    });
    if (check?.saved) {
      __mc_saved_codes.set(shortcode, new Set(check.savedIndexes));
      btn.textContent = `Saved (${check.savedIndexes.length})`;
      btn.style.background = "#06d6a0";
      btn.style.opacity = "0.85";
      // Still allow re-save (might have new carousel slides)
    }
  } catch {}

  btn.disabled = false;
  if (btn.textContent === "Save") btn.textContent = "Save to Collection";
  btn.addEventListener("click", () => handleSavePost(btn));
}

async function handleSavePost(btn) {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return;

  __mc_saving = true;
  btn.disabled = true;
  btn.textContent = "Finding media...";
  btn.style.background = "#e6a817";

  const handle = extractUsernameFromPage();
  const mediaItems = await extractMediaForPage();

  if (mediaItems.length === 0) {
    btn.textContent = "No media found";
    btn.style.background = "#e63946";
    showToast("No media found. Try scrolling the carousel, then click Save.");
    setTimeout(() => { __mc_saving = false; updateUI(); }, 3000);
    return;
  }

  // Filter out already-saved carousel slides
  const savedSet = __mc_saved_codes.get(shortcode) || new Set();
  const toSave = mediaItems.filter((m) => !savedSet.has(m.carouselIndex ?? 0));

  if (toSave.length === 0) {
    btn.textContent = "Already saved";
    btn.style.background = "#06d6a0";
    showToast("All slides already saved!");
    __mc_saving = false;
    return;
  }

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < toSave.length; i++) {
    const item = toSave[i];
    const ci = item.carouselIndex ?? 0;
    btn.textContent = `Saving ${i + 1}/${toSave.length}...`;

    try {
      // Step 1: Get presigned URL
      const saveRes = await chrome.runtime.sendMessage({
        type: "refSavePost",
        data: {
          action: "savePost",
          handle: handle || "unknown",
          shortcode,
          carouselIndex: ci,
          mediaType: item.type,
          width: item.width || null,
          height: item.height || null,
          caption: item.caption || null,
          mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
        },
      });

      if (saveRes?.alreadySaved) {
        saved++;
        continue;
      }
      if (!saveRes?.ok || !saveRes?.uploadUrl) {
        throw new Error(saveRes?.error || "No upload URL");
      }

      // Step 2: Download the media
      btn.textContent = `Downloading ${i + 1}/${toSave.length}...`;
      const blob = await downloadMediaAsDataUri(item);
      if (!blob) throw new Error("Download failed");

      // Step 3: Upload to S3
      btn.textContent = `Uploading ${i + 1}/${toSave.length}...`;
      const uploadRes = await chrome.runtime.sendMessage({
        type: "refUploadToS3",
        uploadUrl: saveRes.uploadUrl,
        blob: blob.dataUri,
        mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
      });
      if (!uploadRes?.ok) throw new Error(uploadRes?.error || "Upload failed");

      // Step 4: Confirm
      const confirmRes = await chrome.runtime.sendMessage({
        type: "refConfirmPost",
        data: {
          action: "confirmPost",
          handle: handle || "unknown",
          shortcode,
          carouselIndex: ci,
          s3Key: saveRes.s3Key,
          mediaType: item.type,
          width: item.width || null,
          height: item.height || null,
          caption: item.caption || null,
          postUrl: window.location.href,
        },
      });
      if (!confirmRes?.ok) throw new Error(confirmRes?.error || "Confirm failed");

      saved++;
      if (!__mc_saved_codes.has(shortcode)) __mc_saved_codes.set(shortcode, new Set());
      __mc_saved_codes.get(shortcode).add(ci);
    } catch (err) {
      console.error(`[ref] Failed to save slide ${ci}:`, err);
      failed++;
    }
  }

  __mc_saving = false;

  if (saved > 0) {
    const totalSaved = (__mc_saved_codes.get(shortcode)?.size) || saved;
    btn.textContent = `Saved (${totalSaved})`;
    btn.style.background = "#06d6a0";
    showToast(`Saved ${saved} image(s)${failed > 0 ? ` (${failed} failed)` : ""}`);
  } else {
    btn.textContent = "Save failed";
    btn.style.background = "#e63946";
    showToast(`Failed to save. ${failed} item(s) failed.`);
    setTimeout(() => updateUI(), 3000);
  }
}

async function downloadMediaAsDataUri(item) {
  let url = item.url;
  url = url.replace(/[&?]bytestart=\d+/, "").replace(/[&?]byteend=\d+/, "");
  url = url.replace(/\?&/, "?").replace(/\?$/, "");

  try {
    // Try direct fetch first
    const resp = await fetch(url);
    if (resp.ok) {
      const blob = await resp.blob();
      return await blobToDataUri(blob);
    }
  } catch {}

  // Fallback: fetch via background
  return chrome.runtime.sendMessage({ type: "fetchBlob", url });
}

function blobToDataUri(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUri: reader.result, size: blob.size, type: blob.type });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

// ── Media Extraction ──────────────────────────────────────────────────
async function extractMediaForPage() {
  const shortcode = getCurrentShortcode();
  const items = [];
  const seen = new Set();

  // 1. Check interceptor cache
  let mediaList = findInterceptedMediaForPage();

  // 2. If cache missed, fetch via background
  if (mediaList.length === 0 && shortcode) {
    console.log(`[ref] Cache miss for ${shortcode}, fetching via background...`);
    const fetched = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "fetchIgMedia", shortcode }, (r) => resolve(r?.items || []));
    });
    if (fetched.length > 0) {
      for (const f of fetched) __mc_ig_media.push(f);
      mediaList = fetched;
    }
  }

  for (const m of mediaList) {
    const base = m.url.split("?")[0];
    const dedupKey = `${base}_${m.carouselIndex ?? 0}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    items.push({
      url: m.url,
      type: m.type,
      code: m.code,
      caption: m.caption || null,
      width: m.width || 0,
      height: m.height || 0,
      carouselIndex: m.carouselIndex ?? 0,
    });
  }

  // 3. Fallback: grab images from DOM
  if (items.length === 0) {
    const scope = document.querySelector("main") || document.body;
    const imgSelector = 'article img[srcset], article img[sizes], [role="presentation"] img[srcset], [role="dialog"] img[srcset]';
    let ci = 0;
    scope.querySelectorAll(imgSelector).forEach((img) => {
      const src = getBestImageSrc(img);
      if (src && !isProfilePic(src) && !isIcon(src) && !seen.has(src.split("?")[0])) {
        seen.add(src.split("?")[0]);
        items.push({ url: src, type: "image", code: shortcode, caption: null, width: 0, height: 0, carouselIndex: ci++ });
      }
    });
  }

  return items;
}

function findInterceptedMediaForPage() {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return [];
  return __mc_ig_media.filter((m) => m.code === shortcode);
}

function getCurrentShortcode() {
  const match = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// ── Helpers ───────────────────────────────────────────────────────────
function getBestImageSrc(img) {
  const srcset = img.getAttribute("srcset");
  if (srcset) {
    const sources = srcset.split(",").map((s) => {
      const parts = s.trim().split(/\s+/);
      return { url: parts[0], w: parseInt(parts[1]) || 0 };
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
    position: "fixed", bottom: "24px", right: "24px", background: "#1a1a2e", color: "#fff",
    padding: "12px 20px", borderRadius: "10px", fontSize: "14px", zIndex: "2147483647",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)", transition: "opacity 0.3s", opacity: "0",
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = "1"));
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
