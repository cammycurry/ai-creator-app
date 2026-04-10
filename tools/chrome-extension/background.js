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
  if (msg.type === "refCheckPosts") {
    handleRefApiCall(msg.data).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refCheckAccount") {
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
  if (msg.type === "fetchUserPosts") {
    handleFetchUserPosts(msg.handle, msg.maxPosts || 50)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message, shortcodes: [] }));
    return true;
  }
  if (msg.type === "bulkSavePost") {
    handleBulkSavePost(msg.handle, msg.shortcode)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "refreshPostStats") {
    handleRefreshPostStats(msg.handle, msg.shortcodes)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
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

  // Method 1: Private API (most reliable from service worker)
  try {
    const pk = shortcodeToPk(shortcode);
    if (pk) {
      const url = `https://i.instagram.com/api/v1/media/${pk}/info/`;
      console.log(`[bg] Trying Private API for ${shortcode} (pk=${pk})...`);
      const resp = await fetch(url, {
        credentials: "include",
        headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
      });
      console.log(`[bg] Private API response: ${resp.status}`);
      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          const item = json?.items?.[0];
          if (item) {
            const items = extractFromPrivateApiMedia(item, shortcode);
            console.log(`[bg] Private API got ${items.length} items for ${shortcode}`);
            return { items };
          }
        } else {
          console.warn(`[bg] Private API returned non-JSON for ${shortcode}: ${text.substring(0, 100)}`);
        }
      }
    }
  } catch (e) {
    console.warn("[bg] Private API method failed:", e.message);
  }

  // Method 2: GraphQL
  try {
    const variables = JSON.stringify({ shortcode, child_comment_count: 0, fetch_comment_count: 0, parent_comment_count: 0, has_threaded_comments: false });
    const url = `https://www.instagram.com/graphql/query/?query_hash=477b65a610463740ccdb83135b2014db&variables=${encodeURIComponent(variables)}`;
    console.log(`[bg] Trying GraphQL for ${shortcode}...`);
    const resp = await fetch(url, { credentials: "include" });
    console.log(`[bg] GraphQL response: ${resp.status}`);
    if (resp.ok) {
      const text = await resp.text();
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        const media = json?.data?.shortcode_media;
        if (media) {
          const items = extractFromGraphQLMedia(media, shortcode);
          console.log(`[bg] GraphQL got ${items.length} items for ${shortcode}`);
          return { items };
        } else {
          console.warn(`[bg] GraphQL returned no shortcode_media for ${shortcode}`);
        }
      } else {
        console.warn(`[bg] GraphQL returned non-JSON for ${shortcode}: ${text.substring(0, 100)}`);
      }
    }
  } catch (e) {
    console.warn("[bg] GraphQL method failed:", e.message);
  }

  // Method 3: Scrape the post page HTML (/p/SHORTCODE/?__a=1&__d=dis)
  try {
    const url = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
    console.log(`[bg] Trying __a=1 for ${shortcode}...`);
    const resp = await fetch(url, { credentials: "include" });
    console.log(`[bg] __a=1 response: ${resp.status}`);
    if (resp.ok) {
      const text = await resp.text();
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        const media = json?.items?.[0] || json?.graphql?.shortcode_media;
        if (media) {
          // Try private API format first, then GraphQL format
          const items = media.image_versions2
            ? extractFromPrivateApiMedia(media, shortcode)
            : extractFromGraphQLMedia(media, shortcode);
          console.log(`[bg] __a=1 got ${items.length} items for ${shortcode}`);
          return { items };
        }
      }
    }
  } catch (e) {
    console.warn("[bg] __a=1 method failed:", e.message);
  }

  console.warn(`[bg] All methods failed for ${shortcode}`);
  return { items: [] };
}

function extractFromGraphQLMedia(media, shortcode) {
  const items = [];
  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || null;
  const username = media.owner?.username || null;
  const likeCount = media.edge_media_preview_like?.count ?? media.edge_liked_by?.count ?? null;
  const commentCount = media.edge_media_to_comment?.count ?? media.edge_media_preview_comment?.count ?? null;
  const viewCount = media.video_view_count ?? null;
  const postedAt = media.taken_at_timestamp ? new Date(media.taken_at_timestamp * 1000).toISOString() : null;
  const location = media.location?.name || null;
  const altText = media.accessibility_caption || null;

  const shared = { code: shortcode, username, caption, likeCount, commentCount, viewCount, postedAt, location, altText };

  // Check for carousel (sidecar)
  const sidecar = media.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecar) && sidecar.length > 0) {
    const carouselCount = sidecar.length;
    sidecar.forEach((edge, ci) => {
      const node = edge?.node;
      if (!node) return;
      if (node.video_url) {
        items.push({ ...shared, url: node.video_url, type: "video", postType: "carousel", carouselCount, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0, altText: node.accessibility_caption || altText });
      } else if (node.display_url) {
        items.push({ ...shared, url: node.display_url, type: "image", postType: "carousel", carouselCount, carouselIndex: ci, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0, altText: node.accessibility_caption || altText });
      }
    });
    return items;
  }

  // Detect reel vs single image
  const isReel = media.is_video || media.__typename === "GraphVideo" || media.product_type === "clips";
  const postType = isReel ? "reel" : "single";

  if (media.video_url) {
    items.push({ ...shared, url: media.video_url, type: "video", postType, carouselCount: null, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  } else if (media.display_url) {
    items.push({ ...shared, url: media.display_url, type: "image", postType, carouselCount: null, carouselIndex: 0, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 });
  }
  return items;
}

function extractFromPrivateApiMedia(item, shortcode) {
  const items = [];
  const caption = item.caption?.text || null;
  const username = item.user?.username || null;
  const likeCount = item.like_count ?? null;
  const commentCount = item.comment_count ?? null;
  const viewCount = item.view_count ?? item.play_count ?? null;
  const postedAt = item.taken_at ? new Date(item.taken_at * 1000).toISOString() : null;
  const location = item.location?.name || null;
  const altText = item.accessibility_caption || null;

  const shared = { code: shortcode, username, caption, likeCount, commentCount, viewCount, postedAt, location, altText };

  // Check for carousel
  const carousel = item.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 0) {
    const carouselCount = carousel.length;
    carousel.forEach((child, ci) => {
      if (child.video_versions?.length > 0) {
        const sorted = [...child.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ ...shared, url: sorted[0].url, type: "video", postType: "carousel", carouselCount, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0, altText: child.accessibility_caption || altText });
      } else if (child.image_versions2?.candidates?.length > 0) {
        const sorted = [...child.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
        items.push({ ...shared, url: sorted[0].url, type: "image", postType: "carousel", carouselCount, carouselIndex: ci, width: sorted[0].width || 0, height: sorted[0].height || 0, altText: child.accessibility_caption || altText });
      }
    });
    return items;
  }

  // Detect reel vs single
  const isReel = item.media_type === 2 || item.product_type === "clips" || item.video_versions?.length > 0;
  const postType = isReel ? "reel" : "single";

  if (item.video_versions?.length > 0) {
    const sorted = [...item.video_versions].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ ...shared, url: sorted[0].url, type: "video", postType, carouselCount: null, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
  } else if (item.image_versions2?.candidates?.length > 0) {
    const sorted = [...item.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
    items.push({ ...shared, url: sorted[0].url, type: "image", postType, carouselCount: null, carouselIndex: 0, width: sorted[0].width || 0, height: sorted[0].height || 0 });
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

// ── Fetch rich profile data + recent posts via Instagram API ────────
async function handleFetchUserPosts(handle, maxPosts) {
  const shortcodes = [];
  let profileData = null;

  try {
    // Get profile info + initial posts from web_profile_info
    const infoResp = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, {
      credentials: "include",
      headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
    });

    if (!infoResp.ok) {
      console.warn("[bg] web_profile_info failed:", infoResp.status);
    } else {
      const infoJson = await infoResp.json();
      const user = infoJson?.data?.user;
      if (user) {
        profileData = {
          name: user.full_name || null,
          bio: user.biography || null,
          followers: user.edge_followed_by?.count ?? null,
          following: user.edge_follow?.count ?? null,
          postCount: user.edge_owner_to_timeline_media?.count ?? null,
          profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || null,
          isVerified: user.is_verified || false,
          isPrivate: user.is_private || false,
          isBusiness: user.is_business_account || user.is_professional_account || false,
          categoryName: user.category_name || user.category_enum || null,
          externalUrl: user.external_url || null,
        };

        // Grab initial shortcodes from the profile response itself
        const initialEdges = user.edge_owner_to_timeline_media?.edges || [];
        for (const edge of initialEdges) {
          const code = edge?.node?.shortcode;
          if (code && !shortcodes.includes(code)) shortcodes.push(code);
        }
        console.log(`[bg] Got ${shortcodes.length} shortcodes from initial profile response`);

        // Paginate for more if needed
        const userId = user.id;
        let hasNext = user.edge_owner_to_timeline_media?.page_info?.has_next_page || false;
        let endCursor = user.edge_owner_to_timeline_media?.page_info?.end_cursor || null;

        if (userId && hasNext && endCursor && shortcodes.length < maxPosts) {
          // Method 1: GraphQL pagination
          let graphqlWorked = false;
          while (hasNext && shortcodes.length < maxPosts) {
            try {
              const variables = JSON.stringify({
                id: userId,
                first: Math.min(50, maxPosts - shortcodes.length),
                after: endCursor,
              });
              const url = `https://www.instagram.com/graphql/query/?query_hash=472f257a40c653c64c666ce877d59d2b&variables=${encodeURIComponent(variables)}`;
              const resp = await fetch(url, { credentials: "include" });
              if (!resp.ok) {
                console.warn(`[bg] GraphQL pagination failed: ${resp.status}`);
                break;
              }
              const text = await resp.text();
              if (!text.startsWith("{")) break;
              const json = JSON.parse(text);
              const timeline = json?.data?.user?.edge_owner_to_timeline_media;
              if (!timeline) break;
              let added = 0;
              for (const edge of (timeline.edges || [])) {
                const code = edge?.node?.shortcode;
                if (code && !shortcodes.includes(code)) { shortcodes.push(code); added++; }
              }
              if (added === 0) break;
              graphqlWorked = true;
              hasNext = timeline.page_info?.has_next_page || false;
              endCursor = timeline.page_info?.end_cursor || null;
              if (!endCursor) break;
            } catch (e) {
              console.warn("[bg] GraphQL pagination error:", e.message);
              break;
            }
          }

          // Method 2: Private API feed if GraphQL didn't work
          if (!graphqlWorked && shortcodes.length < maxPosts) {
            console.log("[bg] Trying private API feed...");
            try {
              let nextMaxId = null;
              let moreAvailable = true;
              while (moreAvailable && shortcodes.length < maxPosts) {
                let feedUrl = `https://i.instagram.com/api/v1/feed/user/${userId}/?count=33`;
                if (nextMaxId) feedUrl += `&max_id=${nextMaxId}`;
                const feedResp = await fetch(feedUrl, {
                  credentials: "include",
                  headers: { "X-IG-App-ID": "936619743392459", "X-Requested-With": "XMLHttpRequest" },
                });
                if (!feedResp.ok) {
                  console.warn(`[bg] Private feed failed: ${feedResp.status}`);
                  break;
                }
                const feedJson = await feedResp.json();
                const items = feedJson?.items || [];
                for (const item of items) {
                  const code = item.code;
                  if (code && !shortcodes.includes(code)) shortcodes.push(code);
                }
                moreAvailable = feedJson.more_available || false;
                nextMaxId = feedJson.next_max_id || null;
                if (!nextMaxId) break;
              }
            } catch (e) {
              console.warn("[bg] Private feed error:", e.message);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("[bg] Failed to fetch user posts:", e.message);
  }

  console.log(`[bg] Total shortcodes for ${handle}: ${shortcodes.length}`);
  return { ok: true, shortcodes, profileData };
}

// ── Bulk save a single post by shortcode (called from content script) ──
async function handleBulkSavePost(handle, shortcode) {
  // Fetch media items for this shortcode
  const mediaResult = await handleFetchIgMedia(shortcode);
  const items = mediaResult?.items || [];
  if (items.length === 0) {
    console.warn(`[bg] ${shortcode}: No media items returned from IG API`);
    return { ok: false, error: "No media found", saved: 0 };
  }

  console.log(`[bg] ${shortcode}: Found ${items.length} media items (${items[0]?.postType || "?"}) — saving...`);
  let saved = 0;
  let lastError = null;
  for (const item of items) {
    const ci = item.carouselIndex ?? 0;
    try {
      // Step 1: Get presigned URL
      const saveRes = await handleRefApiCall({
        action: "savePost",
        handle,
        shortcode,
        carouselIndex: ci,
        mediaType: item.type,
        width: item.width || null,
        height: item.height || null,
        caption: item.caption || null,
        mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
      });
      if (saveRes?.alreadySaved) { saved++; continue; }
      if (!saveRes?.ok || !saveRes?.uploadUrl) {
        console.warn(`[bg] ${shortcode} ci=${ci}: savePost failed:`, saveRes?.error || "no upload URL");
        lastError = saveRes?.error || "savePost failed";
        continue;
      }

      // Step 2: Download media
      console.log(`[bg] ${shortcode} ci=${ci}: Downloading ${item.url.substring(0, 80)}...`);
      const blob = await handleFetchBlob(item.url);
      if (!blob?.dataUri) {
        console.warn(`[bg] ${shortcode} ci=${ci}: Download failed — no data returned`);
        lastError = "Download failed";
        continue;
      }
      console.log(`[bg] ${shortcode} ci=${ci}: Downloaded ${blob.size} bytes`);

      // Step 3: Upload to S3
      const uploadRes = await handleS3Upload(saveRes.uploadUrl, blob.dataUri, item.type === "video" ? "video/mp4" : "image/jpeg");
      if (!uploadRes?.ok) {
        console.warn(`[bg] ${shortcode} ci=${ci}: S3 upload failed:`, uploadRes?.error);
        lastError = "S3 upload failed";
        continue;
      }

      // Step 4: Confirm
      const confirmRes = await handleRefApiCall({
        action: "confirmPost",
        handle,
        shortcode,
        carouselIndex: ci,
        s3Key: saveRes.s3Key,
        mediaType: item.type,
        postType: item.postType || "single",
        carouselCount: item.carouselCount ?? null,
        width: item.width || null,
        height: item.height || null,
        caption: item.caption || null,
        postUrl: `https://instagram.com/p/${shortcode}/`,
        likeCount: item.likeCount ?? null,
        commentCount: item.commentCount ?? null,
        viewCount: item.viewCount ?? null,
        postedAt: item.postedAt || null,
        location: item.location || null,
        altText: item.altText || null,
      });
      if (!confirmRes?.ok) {
        console.warn(`[bg] ${shortcode} ci=${ci}: confirmPost failed:`, confirmRes?.error);
        lastError = confirmRes?.error || "confirmPost failed";
        continue;
      }
      console.log(`[bg] ${shortcode} ci=${ci}: Saved!`);
      saved++;
    } catch (e) {
      console.warn(`[bg] ${shortcode} ci=${ci}: Exception:`, e.message);
      lastError = e.message;
    }
  }
  return { ok: saved > 0, saved, error: saved === 0 ? lastError : null };
}

// ── Refresh engagement stats for existing posts ─────────────────────
async function handleRefreshPostStats(handle, shortcodes) {
  let updated = 0;
  let failed = 0;

  for (const shortcode of shortcodes) {
    try {
      const mediaResult = await handleFetchIgMedia(shortcode);
      const items = mediaResult?.items || [];
      for (const item of items) {
        await handleRefApiCall({
            action: "updatePostStats",
            shortcode,
            carouselIndex: item.carouselIndex ?? 0,
            likeCount: item.likeCount ?? null,
            commentCount: item.commentCount ?? null,
            viewCount: item.viewCount ?? null,
            postedAt: item.postedAt || null,
            location: item.location || null,
            altText: item.altText || null,
            caption: item.caption || null,
            postType: item.postType || null,
            carouselCount: item.carouselCount ?? null,
          });
          updated++;
      }
    } catch (e) {
      console.warn(`[bg] Failed to refresh stats for ${shortcode}:`, e.message);
      failed++;
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return { ok: true, updated, failed };
}
