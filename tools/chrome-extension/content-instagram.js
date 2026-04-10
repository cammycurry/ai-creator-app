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
async function showProfileButton() {
  const handle = window.location.pathname.replace(/^\/|\/$/g, "");

  const container = document.createElement("div");
  container.id = "mc-ig-profile-btn";
  container.className = "mc-float-container";

  const btn = document.createElement("button");
  btn.className = "mc-save-btn";
  btn.textContent = "Add to Collection";
  btn.addEventListener("click", () => handleSaveAccount(btn));

  const bulkBtn = document.createElement("button");
  bulkBtn.className = "mc-save-btn mc-bulk-btn";
  bulkBtn.textContent = "Save All Posts";
  bulkBtn.addEventListener("click", () => handleBulkSaveAllPosts(bulkBtn));

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "mc-save-btn mc-refresh-btn";
  refreshBtn.textContent = "↻ Stats";
  refreshBtn.title = "Refresh engagement stats for saved posts";
  refreshBtn.addEventListener("click", () => handleRefreshStats(refreshBtn, handle));

  container.appendChild(btn);
  container.appendChild(bulkBtn);
  container.appendChild(refreshBtn);
  document.body.appendChild(container);

  // Check if account + posts are already saved
  if (handle) {
    try {
      const check = await chrome.runtime.sendMessage({
        type: "refCheckAccount",
        data: { action: "checkAccount", handle },
      });
      if (check?.exists) {
        btn.textContent = `Update Account`;
        if (check.savedPosts > 0) {
          bulkBtn.textContent = `Save More Posts (${check.savedPosts} saved)`;
        }
      }
    } catch {}
  }
}

function setBtnState(btn, state, text) {
  btn.classList.remove("mc-saving", "mc-success", "mc-error", "mc-faded");
  if (state) btn.classList.add(...state.split(" "));
  btn.textContent = text;
}

async function handleSaveAccount(btn) {
  const handle = window.location.pathname.replace(/^\/|\/$/g, "");
  btn.disabled = true;
  setBtnState(btn, "mc-saving", "Fetching profile...");

  // Get rich data from API
  let apiProfile = null;
  try {
    const result = await chrome.runtime.sendMessage({
      type: "fetchUserPosts",
      handle,
      maxPosts: 0, // don't need posts, just profile data
    });
    apiProfile = result?.profileData || null;
  } catch {}

  const domMetadata = scrapeProfileMetadata();
  const accountData = {
    action: "saveAccount",
    handle: handle || domMetadata.handle,
    name: apiProfile?.name || domMetadata.name,
    bio: apiProfile?.bio || domMetadata.bio,
    followers: apiProfile?.followers ?? domMetadata.followers,
    following: apiProfile?.following ?? domMetadata.following,
    postCount: apiProfile?.postCount ?? domMetadata.postCount,
    profilePicUrl: apiProfile?.profilePicUrl || domMetadata.profilePicUrl,
    isVerified: apiProfile?.isVerified || false,
    isPrivate: apiProfile?.isPrivate || false,
    isBusiness: apiProfile?.isBusiness || false,
    categoryName: apiProfile?.categoryName || null,
    externalUrl: apiProfile?.externalUrl || null,
  };

  if (!accountData.handle) {
    setBtnState(btn, "mc-error", "Could not detect account");
    setTimeout(() => { setBtnState(btn, null, "Add to Collection"); btn.disabled = false; }, 3000);
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({
      type: "refSaveAccount",
      data: accountData,
    });
    if (result?.ok) {
      setBtnState(btn, "mc-success", result.isNew ? "Added!" : "Updated!");
      showToast(`${accountData.handle} ${result.isNew ? "added to" : "updated in"} collection`);
    } else {
      throw new Error(result?.error || "Save failed");
    }
  } catch (err) {
    setBtnState(btn, "mc-error", "Error");
    showToast(`Error: ${err.message}`);
  }
  setTimeout(() => { setBtnState(btn, null, "Update Account"); btn.disabled = false; }, 3000);
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

// ── Profile Page: Save All Posts ──────────────────────────────────────
async function handleBulkSaveAllPosts(btn) {
  const handle = window.location.pathname.replace(/^\/|\/$/g, "");
  if (!handle) return;

  btn.disabled = true;
  setBtnState(btn, "mc-saving", "Fetching posts...");

  // Try API first, fall back to DOM scraping
  let shortcodes = [];
  let profileData = null;

  // Method 1: Background API fetch
  try {
    const result = await chrome.runtime.sendMessage({
      type: "fetchUserPosts",
      handle,
      maxPosts: 200,
    });
    shortcodes = result?.shortcodes || [];
    profileData = result?.profileData || null;
    console.log(`[ref] API returned ${shortcodes.length} shortcodes`);
  } catch {}

  // Method 2: Also scrape DOM and merge (catches posts API might have missed)
  const domCodes = scrapeGridShortcodes();
  if (domCodes.length > 0) {
    const existing = new Set(shortcodes);
    for (const code of domCodes) {
      if (!existing.has(code)) shortcodes.push(code);
    }
    console.log(`[ref] After DOM merge: ${shortcodes.length} total shortcodes`);
  }

  // Save account with API data or DOM fallback
  const apiProfile = profileData || {};
  const domMetadata = scrapeProfileMetadata();
  const accountData = {
    action: "saveAccount",
    handle,
    name: apiProfile.name || domMetadata.name,
    bio: apiProfile.bio || domMetadata.bio,
    followers: apiProfile.followers ?? domMetadata.followers,
    following: apiProfile.following ?? domMetadata.following,
    postCount: apiProfile.postCount ?? domMetadata.postCount,
    profilePicUrl: apiProfile.profilePicUrl || domMetadata.profilePicUrl,
    isVerified: apiProfile.isVerified || false,
    isPrivate: apiProfile.isPrivate || false,
    isBusiness: apiProfile.isBusiness || false,
    categoryName: apiProfile.categoryName || null,
    externalUrl: apiProfile.externalUrl || null,
  };
  await chrome.runtime.sendMessage({ type: "refSaveAccount", data: accountData }).catch(() => {});

  if (shortcodes.length === 0) {
    setBtnState(btn, "mc-error", "No posts found");
    showToast("Could not find posts. Try scrolling down to load more, then try again.");
    setTimeout(() => { setBtnState(btn, null, "Save All Posts"); btn.disabled = false; }, 3000);
    return;
  }

  // Check which posts we already have saved
  setBtnState(btn, "mc-saving", `Checking ${shortcodes.length} posts...`);
  let toSave = shortcodes;
  try {
    const checkRes = await chrome.runtime.sendMessage({
      type: "refCheckPosts",
      data: { action: "checkPosts", shortcodes },
    });
    if (checkRes?.savedShortcodes?.length > 0) {
      const savedSet = new Set(checkRes.savedShortcodes);
      toSave = shortcodes.filter((c) => !savedSet.has(c));
    }
  } catch {}

  let skipped = shortcodes.length - toSave.length;

  if (toSave.length === 0) {
    const scrollMore = confirm(
      `All ${shortcodes.length} found posts are already saved.\n\nScroll down to load more posts from the grid?`
    );
    if (scrollMore) {
      setBtnState(btn, "mc-saving", "Scrolling to load more...");
      const moreShortcodes = await autoScrollAndScrape(500, (msg) => setBtnState(btn, "mc-saving", msg));
      const existing = new Set(shortcodes);
      for (const code of moreShortcodes) {
        if (!existing.has(code)) { shortcodes.push(code); existing.add(code); }
      }
      // Re-check
      try {
        const checkRes2 = await chrome.runtime.sendMessage({
          type: "refCheckPosts",
          data: { action: "checkPosts", shortcodes },
        });
        if (checkRes2?.savedShortcodes?.length > 0) {
          const savedSet2 = new Set(checkRes2.savedShortcodes);
          toSave = shortcodes.filter((c) => !savedSet2.has(c));
          skipped = shortcodes.length - toSave.length;
        }
      } catch {}
      window.scrollTo(0, 0);

      if (toSave.length === 0) {
        setBtnState(btn, "mc-success", `All ${shortcodes.length} saved`);
        showToast("No new posts found after scrolling.");
        btn.disabled = false;
        return;
      }
      showToast(`Found ${toSave.length} new posts after scrolling!`);
    } else {
      setBtnState(btn, null, `Save More Posts (${shortcodes.length} saved)`);
      btn.disabled = false;
      return;
    }
  }

  // Ask user how many to save
  const maxToSave = prompt(
    `Found ${shortcodes.length} posts (${skipped} already saved, ${toSave.length} new).\n\nHow many new posts to save?\n• Enter a number (e.g. 40)\n• Type "scroll" to auto-scroll and find more posts first\n• Leave blank for all ${toSave.length}`,
    String(toSave.length)
  );

  if (maxToSave === null) {
    setBtnState(btn, null, "Save All Posts");
    btn.disabled = false;
    return;
  }

  // If user typed "scroll", auto-scroll to load more posts then re-check
  if (maxToSave.toLowerCase().trim() === "scroll") {
    setBtnState(btn, "mc-saving", "Scrolling to load more posts...");
    const moreShortcodes = await autoScrollAndScrape(500, (msg) => setBtnState(btn, "mc-saving", msg));

    // Merge with what we already have
    const existing = new Set(shortcodes);
    for (const code of moreShortcodes) {
      if (!existing.has(code)) { shortcodes.push(code); existing.add(code); }
    }

    // Re-check which are new
    try {
      const checkRes = await chrome.runtime.sendMessage({
        type: "refCheckPosts",
        data: { action: "checkPosts", shortcodes },
      });
      if (checkRes?.savedShortcodes?.length > 0) {
        const savedSet = new Set(checkRes.savedShortcodes);
        toSave = shortcodes.filter((c) => !savedSet.has(c));
        skipped = shortcodes.length - toSave.length;
      } else {
        toSave = shortcodes;
        skipped = 0;
      }
    } catch {}

    if (toSave.length === 0) {
      setBtnState(btn, "mc-success", `All ${shortcodes.length} saved`);
      showToast("All posts already saved!");
      btn.disabled = false;
      // Scroll back to top
      window.scrollTo(0, 0);
      return;
    }

    showToast(`Found ${shortcodes.length} total (${toSave.length} new). Saving...`);
    window.scrollTo(0, 0);
  }

  const limit = parseInt(maxToSave) || toSave.length;
  const batch = toSave.slice(0, limit);

  showToast(`Saving ${batch.length} new posts...`);
  let saved = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const code = batch[i];
    setBtnState(btn, "mc-saving", `Saving ${i + 1}/${batch.length}...`);

    try {
      const res = await chrome.runtime.sendMessage({
        type: "bulkSavePost",
        handle,
        shortcode: code,
      });
      if (res?.ok && res.saved > 0) {
        saved += res.saved;
      } else {
        failed++;
        console.warn(`[ref] Failed to save ${code}:`, res?.error || "unknown");
        // Show first error to user
        if (failed === 1 && res?.error) {
          showToast(`Error on ${code}: ${res.error}`);
        }
      }
    } catch (e) {
      failed++;
      console.warn(`[ref] Exception saving ${code}:`, e);
    }

    // Small delay to avoid rate limiting
    if (i < batch.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const total = saved + skipped;
  setBtnState(btn, "mc-success", `Done! ${total} total`);
  showToast(`Saved ${saved} new image(s)${skipped > 0 ? `, ${skipped} already had` : ""}${failed > 0 ? `, ${failed} failed` : ""}`);
  btn.disabled = false;
}

// ── Refresh Stats for saved posts ─────────────────────────────────────
async function handleRefreshStats(btn, handle) {
  btn.disabled = true;
  setBtnState(btn, "mc-saving", "Finding posts...");

  // Get all saved shortcodes for this account
  const result = await chrome.runtime.sendMessage({
    type: "fetchUserPosts",
    handle,
    maxPosts: 0,
  });

  // We need the saved shortcodes, not the IG ones
  let shortcodes = [];
  try {
    // Get shortcodes from the API check (all posts for this account)
    const check = await chrome.runtime.sendMessage({
      type: "refCheckAccount",
      data: { action: "checkAccount", handle },
    });
    // We don't have a way to get shortcodes from checkAccount, so use fetchUserPosts
    const fetchResult = await chrome.runtime.sendMessage({
      type: "fetchUserPosts",
      handle,
      maxPosts: 200,
    });
    shortcodes = fetchResult?.shortcodes || [];

    // Also merge DOM
    const domCodes = scrapeGridShortcodes();
    const existing = new Set(shortcodes);
    for (const code of domCodes) {
      if (!existing.has(code)) shortcodes.push(code);
    }
  } catch {}

  if (shortcodes.length === 0) {
    setBtnState(btn, "mc-error", "No posts found");
    setTimeout(() => { setBtnState(btn, null, "↻ Stats"); btn.disabled = false; }, 3000);
    return;
  }

  setBtnState(btn, "mc-saving", `Refreshing ${shortcodes.length} posts...`);

  const res = await chrome.runtime.sendMessage({
    type: "refreshPostStats",
    handle,
    shortcodes,
  });

  if (res?.ok) {
    setBtnState(btn, "mc-success", `Updated ${res.updated}`);
    showToast(`Refreshed stats for ${res.updated} posts${res.failed > 0 ? ` (${res.failed} failed)` : ""}`);
  } else {
    setBtnState(btn, "mc-error", "Failed");
    showToast(`Error: ${res?.error || "Unknown error"}`);
  }

  setTimeout(() => { setBtnState(btn, null, "↻ Stats"); btn.disabled = false; }, 3000);
}

// Scrape shortcodes from the visible post grid on a profile page
function scrapeGridShortcodes() {
  const codes = [];
  const seen = new Set();
  const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    if (match && !seen.has(match[2])) {
      seen.add(match[2]);
      codes.push(match[2]);
    }
  }
  console.log(`[ref] Scraped ${codes.length} shortcodes from grid DOM`);
  return codes;
}

// Auto-scroll to load more posts, then scrape
async function autoScrollAndScrape(targetCount, statusFn) {
  let lastCount = 0;
  let staleRounds = 0;
  const maxStale = 5; // stop after 5 scrolls with no new posts

  while (staleRounds < maxStale) {
    const current = scrapeGridShortcodes();
    if (statusFn) statusFn(`Scrolling... found ${current.length} posts`);

    if (current.length >= targetCount) {
      return current.slice(0, targetCount);
    }

    if (current.length === lastCount) {
      staleRounds++;
    } else {
      staleRounds = 0;
    }
    lastCount = current.length;

    // Scroll down
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 1000));
  }

  return scrapeGridShortcodes();
}

// ── Post Page: Save Button ────────────────────────────────────────────
async function showPostButton() {
  const shortcode = getCurrentShortcode();
  if (!shortcode) return;

  const btn = document.createElement("button");
  btn.id = "mc-ig-float-btn";
  btn.className = "mc-save-btn mc-float-btn";
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
      setBtnState(btn, "mc-success mc-faded", `Saved (${check.savedIndexes.length})`);
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
  setBtnState(btn, "mc-saving", "Finding media...");

  const handle = extractUsernameFromPage();
  const mediaItems = await extractMediaForPage();

  if (mediaItems.length === 0) {
    setBtnState(btn, "mc-error", "No media found");
    showToast("No media found. Try scrolling the carousel, then click Save.");
    setTimeout(() => { __mc_saving = false; updateUI(); }, 3000);
    return;
  }

  // Filter out already-saved carousel slides
  const savedSet = __mc_saved_codes.get(shortcode) || new Set();
  const toSave = mediaItems.filter((m) => !savedSet.has(m.carouselIndex ?? 0));

  if (toSave.length === 0) {
    setBtnState(btn, "mc-success", "Already saved");
    showToast("All slides already saved!");
    __mc_saving = false;
    return;
  }

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < toSave.length; i++) {
    const item = toSave[i];
    const ci = item.carouselIndex ?? 0;
    setBtnState(btn, "mc-saving", `Saving ${i + 1}/${toSave.length}...`);

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
      setBtnState(btn, "mc-saving", `Downloading ${i + 1}/${toSave.length}...`);
      const blob = await downloadMediaAsDataUri(item);
      if (!blob) throw new Error("Download failed");

      // Step 3: Upload to S3
      setBtnState(btn, "mc-saving", `Uploading ${i + 1}/${toSave.length}...`);
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
    setBtnState(btn, "mc-success", `Saved (${totalSaved})`);
    showToast(`Saved ${saved} image(s)${failed > 0 ? ` (${failed} failed)` : ""}`);
  } else {
    setBtnState(btn, "mc-error", "Save failed");
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
  // Method 1: Look for @handle in og:title (e.g. "Mia (@miaaababiii) on Instagram")
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.content) {
    const atMatch = ogTitle.content.match(/@([A-Za-z0-9_.]+)/);
    if (atMatch) return atMatch[1];
  }

  // Method 2: Look for the username link in the post header
  const usernameLink = document.querySelector('article a[href^="/"][role="link"] span') ||
    document.querySelector('header a[href^="/"][role="link"]');
  if (usernameLink?.textContent) {
    const text = usernameLink.textContent.trim().replace(/^@/, "");
    if (/^[A-Za-z0-9_.]+$/.test(text) && text.length > 1) return text;
  }

  // Method 3: URL path (works on profile pages)
  const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_.]+)\/?(?:p|reel)?/);
  if (pathMatch && !["explore", "direct", "accounts", "stories", "reels", "p", "reel"].includes(pathMatch[1])) {
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
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("mc-toast-visible"));
  setTimeout(() => { t.classList.remove("mc-toast-visible"); setTimeout(() => t.remove(), 400); }, 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
