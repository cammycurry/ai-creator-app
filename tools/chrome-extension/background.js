// Background service worker
// Stores captured media, handles saving to platform or local download

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "mediaCaptured") {
    handleCapture(msg.entry);
    return false;
  }
  if (msg.type === "updateBadge") {
    setBadge(msg.count);
    return false;
  }
  if (msg.type === "saveToPlatform") {
    saveToPlatform(msg.entries)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: `Background error: ${err.message}` }));
    return true;
  }
  if (msg.type === "saveToDownloads") {
    saveToDownloads(msg.entries)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: `Download error: ${err.message}` }));
    return true;
  }
  if (msg.type === "getUploadUrl") {
    handleGetUploadUrl(msg).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === "confirmUpload") {
    handleConfirmUpload(msg).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "scrapePage") {
    handleScrapePage(msg.data).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "updatePageVideo") {
    handleUpdatePageVideo(msg.pageId, msg.videoS3Url).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "getSettings") {
    getSettings().then(sendResponse).catch(() => sendResponse({}));
    return true;
  }
  if (msg.type === "getFolders") {
    fetchFolders().then(sendResponse).catch(() => sendResponse({ ok: false, folders: [] }));
    return true;
  }
  if (msg.type === "fetchBlob") {
    handleFetchBlob(msg.url).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === "fetchIgMedia") {
    handleFetchIgMedia(msg.shortcode).then(sendResponse).catch((err) => sendResponse({ items: [], error: err.message }));
    return true;
  }
  if (msg.type === "fetchVimeoVideo") {
    handleFetchVimeoVideo(msg.vimeoId).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  return false;
});

async function handleCapture(entry) {
  const { collectedMedia = [] } = await chrome.storage.local.get("collectedMedia");

  // Dedup by pageUrl (most reliable) or base URL
  const dedupKey = entry.pageUrl || (entry.url || "").split("?")[0];
  if (dedupKey && collectedMedia.some((m) => (m.pageUrl || (m.url || "").split("?")[0]) === dedupKey)) return;

  collectedMedia.push(entry);
  await chrome.storage.local.set({ collectedMedia });
  setBadge(collectedMedia.length);

  const settings = await getSettings();
  if (settings.autoSave) {
    if (settings.destination === "platform" || settings.destination === "both") {
      saveToPlatform([entry]).catch(console.error);
    }
    if (settings.destination === "downloads" || settings.destination === "both") {
      saveToDownloads([entry]).catch(console.error);
    }
  }
}

// --- Platform Save ---
// Content script already downloaded the video (dataUri) or we fetch directly (non-HLS)
// Then upload to S3 via presigned URL
async function saveToPlatform(entries) {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) {
    return { ok: false, error: "Platform URL or API key not configured. Go to extension settings." };
  }

  const endpoint = `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey}`,
  };

  let saved = 0;
  const results = [];

  for (const entry of entries) {
    try {
      let blob = null;
      let mimeType = entry.mimeType || "video/mp4";

      // Content script already downloaded and sent dataUri
      if (entry.dataUri) {
        blob = dataUriToBlob(entry.dataUri);
        mimeType = entry.mimeType || blob.type || "video/mp2t";
      }

      // Non-HLS: fetch directly from background
      if (!blob && entry.url && !entry.url.includes(".m3u8")) {
        try {
          const resp = await fetch(entry.url);
          if (!resp.ok) throw new Error(`CDN ${resp.status}`);
          blob = await resp.blob();
          mimeType = blob.type || (entry.type === "video" ? "video/mp4" : "image/jpeg");
        } catch (fetchErr) {
          results.push({ url: entry.url, ok: false, error: `Download failed: ${fetchErr.message}` });
          continue;
        }
      }

      if (!blob || blob.size === 0) {
        results.push({ url: entry.url || "blob", ok: false, error: "No video data" });
        continue;
      }

      console.log(`[save] Blob: ${(blob.size / 1024 / 1024).toFixed(1)}MB, ${mimeType}`);

      // Get presigned upload URL (also checks dedup)
      const uploadUrlRes = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "getUploadUrl",
          title: entry.title,
          origin: entry.origin || "unknown",
          type: entry.type || "video",
          mimeType,
          url: entry.url || "",
          pageUrl: entry.pageUrl,
        }),
      });

      if (!uploadUrlRes.ok) {
        results.push({ ok: false, error: `Server error: ${await uploadUrlRes.text()}` });
        continue;
      }

      const uploadData = await uploadUrlRes.json();

      if (uploadData.alreadySaved) {
        saved++;
        results.push({ ok: true, note: "Already saved" });
        continue;
      }

      const { uploadUrl, key, publicUrl, filename } = uploadData;

      // Upload to S3
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!s3Res.ok) {
        results.push({ ok: false, error: `S3 upload failed: ${s3Res.status}` });
        continue;
      }

      // Confirm — server creates DB record
      const confirmRes = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "confirmUpload",
          s3Key: key,
          s3Url: publicUrl,
          filename,
          mimeType,
          size: blob.size,
          title: entry.title,
          pageUrl: entry.pageUrl,
          origin: entry.origin || "unknown",
          type: entry.type || "video",
          username: entry.username || null,
          tags: buildTags(entry),
          category: entry.origin === "instagram" ? "INSTAGRAM" : "UPLOAD",
          instagramFolderId: settings.instagramFolderId || null,
          skoolFolderId: settings.skoolFolderId || null,
        }),
      });

      const confirmData = await confirmRes.json();
      if (confirmData.ok) saved++;
      results.push(confirmData);
    } catch (err) {
      console.error("saveToPlatform error:", err);
      results.push({ ok: false, error: err.message });
    }
  }

  return { ok: saved > 0, saved, total: entries.length, results };
}

// Called by content script to get a presigned S3 upload URL (avoids CORS)
async function handleGetUploadUrl(msg) {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) {
    return { error: "Platform not configured — go to extension settings" };
  }
  const origin = msg.origin || "unknown";
  const type = msg.mimeType?.startsWith("video") ? "video" : msg.mimeType?.startsWith("image") ? "image" : "video";
  const endpoint = `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      action: "getUploadUrl",
      title: msg.title,
      origin,
      type,
      mimeType: msg.mimeType,
      url: msg.url || "",
      pageUrl: msg.pageUrl,
    }),
  });
  if (!res.ok) return { error: `Server error: ${res.status}` };
  return await res.json();
}

// Called by content script after S3 upload to create the DB record
async function handleConfirmUpload(msg) {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) {
    return { ok: false, error: "Platform not configured" };
  }
  const origin = msg.origin || "unknown";
  const type = msg.mimeType?.startsWith("video") ? "video" : msg.mimeType?.startsWith("image") ? "image" : "video";
  const tags = [origin, type];
  if (msg.username) tags.push(`@${msg.username}`);
  const category = origin === "instagram" ? "INSTAGRAM" : "UPLOAD";
  const folderId = origin === "instagram" ? (settings.instagramFolderId || null) : (settings.skoolFolderId || null);

  const endpoint = `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      action: "confirmUpload",
      s3Key: msg.s3Key,
      s3Url: msg.s3Url,
      filename: msg.filename,
      mimeType: msg.mimeType,
      size: msg.size,
      title: msg.title,
      pageUrl: msg.pageUrl,
      origin,
      type,
      tags,
      category,
      username: msg.username || null,
      caption: msg.caption || null,
      audio: msg.audio || null,
      instagramFolderId: origin === "instagram" ? folderId : null,
      skoolFolderId: origin === "skool" ? folderId : null,
    }),
  });
  if (!res.ok) return { ok: false, error: `Server error: ${res.status}` };
  return await res.json();
}

async function handleScrapePage(data) {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) {
    return { ok: false, error: "Platform not configured — go to extension settings" };
  }
  const endpoint = `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({ action: "scrapePage", ...data }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Server error ${res.status}: ${text}` };
  }
  return await res.json();
}

async function handleUpdatePageVideo(pageId, videoS3Url) {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) {
    return { ok: false, error: "Platform not configured" };
  }
  const endpoint = `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({ action: "updatePageVideo", pageId, videoS3Url }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Server error ${res.status}: ${text}` };
  }
  return await res.json();
}

async function fetchFolders() {
  const settings = await getSettings();
  if (!settings.platformUrl || !settings.apiKey) return { ok: false, folders: [] };
  try {
    const res = await fetch(
      `${settings.platformUrl.replace(/\/+$/, "")}/api/extension/ingest`,
      { headers: { Authorization: `Bearer ${settings.apiKey}` } }
    );
    if (!res.ok) return { ok: false, folders: [] };
    return await res.json();
  } catch {
    return { ok: false, folders: [] };
  }
}

async function saveToDownloads(entries) {
  let count = 0;
  const errors = [];

  for (const entry of entries) {
    try {
      const safeName = (entry.title || "media")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 80);

      const ext = entry.type === "video" ? "mp4" : "jpg";
      const filename = `media-collector/${entry.origin || "misc"}/${safeName}_${Date.now()}.${ext}`;

      // If we have a dataUri, create an object URL for download
      if (entry.dataUri) {
        const blob = dataUriToBlob(entry.dataUri);
        const objectUrl = URL.createObjectURL(blob);
        try {
          await downloadWithRetry(objectUrl, filename);
          count++;
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
        continue;
      }

      // Try direct URL download
      if (entry.url && !entry.url.includes(".m3u8")) {
        await downloadWithRetry(entry.url, filename);
        count++;
      } else {
        errors.push(`${safeName}: Use Save to Library for Skool videos`);
      }
    } catch (err) {
      console.error("Download failed:", err);
      errors.push(entry.title || "unknown");
    }
  }

  if (errors.length && count === 0) {
    return { ok: false, downloaded: 0, error: errors.join("; ") };
  }
  return { ok: true, downloaded: count };
}

function downloadWithRetry(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!downloadId) {
        reject(new Error("Download returned no ID"));
        return;
      }
      function onChange(delta) {
        if (delta.id !== downloadId) return;
        if (delta.state?.current === "complete") {
          chrome.downloads.onChanged.removeListener(onChange);
          resolve(downloadId);
        } else if (delta.state?.current === "interrupted") {
          chrome.downloads.onChanged.removeListener(onChange);
          reject(new Error(delta.error?.current || "Download interrupted"));
        }
      }
      chrome.downloads.onChanged.addListener(onChange);
      setTimeout(() => {
        chrome.downloads.onChanged.removeListener(onChange);
        resolve(downloadId);
      }, 120000);
    });
  });
}

// Convert data URI to Blob
function dataUriToBlob(dataUri) {
  const [header, b64] = dataUri.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Fetch Instagram media info by shortcode — tries multiple API methods
async function handleFetchIgMedia(shortcode) {
  if (!shortcode) return { items: [] };

  // Method 1: GraphQL query_hash (works for public posts)
  try {
    const variables = JSON.stringify({ shortcode, child_comment_count: 0, fetch_comment_count: 0, parent_comment_count: 0, has_threaded_comments: false });
    const url = `https://www.instagram.com/graphql/query/?query_hash=477b65a610463740ccdb83135b2014db&variables=${encodeURIComponent(variables)}`;
    const resp = await fetch(url, { credentials: "include" });
    if (resp.ok) {
      const text = await resp.text();
      // Make sure we got JSON, not an HTML error page
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        const media = json?.data?.shortcode_media;
        const caption = media?.edge_media_to_caption?.edges?.[0]?.node?.text || null;
        const musicAttr = media?.clips_music_attribution_info;
        const audio = musicAttr ? { title: musicAttr.song_name || null, artist: musicAttr.artist_name || null, audioId: musicAttr.audio_id || null } : null;
        if (media?.video_url) {
          console.log(`[bg] ✓ GraphQL got video for ${shortcode}`);
          return { items: [{ url: media.video_url, type: "video", code: shortcode, caption, audio, username: media.owner?.username || null, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 }] };
        }
        if (media?.display_url) {
          return { items: [{ url: media.display_url, type: "image", code: shortcode, caption, audio, username: media.owner?.username || null, width: media.dimensions?.width || 0, height: media.dimensions?.height || 0 }] };
        }
      }
    }
  } catch (e) {
    console.warn("[bg] GraphQL method failed:", e.message);
  }

  // Method 2: Private API with media PK
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
          const caption = item?.caption?.text || null;
          const musicAsset = item?.music_metadata?.music_info?.music_asset_info || item?.clips_metadata?.music_info?.music_asset_info;
          const originalSound = item?.clips_metadata?.original_sound_info || item?.original_sound_info;
          const audio = musicAsset
            ? { title: musicAsset.title || musicAsset.song_name || null, artist: musicAsset.display_artist || null, audioId: musicAsset.audio_cluster_id || null }
            : originalSound
              ? { title: originalSound.original_audio_title || null, artist: originalSound.ig_artist?.username || null, audioId: originalSound.audio_asset_id || null }
              : null;
          if (item?.video_versions?.length > 0) {
            let best = item.video_versions.find((v) => v.type === 104);
            if (!best) best = item.video_versions.find((v) => v.type === 101);
            if (!best) best = item.video_versions[0];
            console.log(`[bg] ✓ Private API got video for ${shortcode}`);
            return { items: [{ url: best.url, type: "video", code: shortcode, caption, audio, username: item.user?.username || null, width: best.width || 0, height: best.height || 0 }] };
          }
          if (item?.image_versions2?.candidates?.length > 0) {
            const candidates = [...item.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
            return { items: [{ url: candidates[0].url, type: "image", code: shortcode, caption, audio, username: item.user?.username || null, width: candidates[0].width || 0, height: candidates[0].height || 0 }] };
          }
        }
      }
    }
  } catch (e) {
    console.warn("[bg] Private API method failed:", e.message);
  }

  console.warn(`[bg] All methods failed for shortcode ${shortcode}`);
  return { items: [] };
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

// Fetch a URL in the background (service worker has broader CORS access)
async function handleFetchBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  if (blob.size > 100 * 1024 * 1024) throw new Error("File too large for background transfer (>100MB)");
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve({ dataUri: reader.result, size: blob.size, type: blob.type });
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function getSettings() {
  const { mcSettings = {} } = await chrome.storage.local.get("mcSettings");
  return {
    platformUrl: mcSettings.platformUrl || "",
    apiKey: mcSettings.apiKey || "",
    destination: mcSettings.destination || "collect",
    autoSave: mcSettings.autoSave || false,
    instagramFolderId: mcSettings.instagramFolderId || null,
    skoolFolderId: mcSettings.skoolFolderId || null,
  };
}

function buildTags(entry) {
  const tags = [];
  if (entry.origin) tags.push(entry.origin);
  if (entry.type) tags.push(entry.type);
  if (entry.username) tags.push(`@${entry.username}`);
  return tags;
}

function setBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#4361ee" });
}

async function handleFetchVimeoVideo(vimeoId) {
  if (!vimeoId) return { error: "No Vimeo ID" };

  // Fetch the Vimeo player page — config is embedded as window.playerConfig = {...}
  try {
    const pageUrl = `https://player.vimeo.com/video/${vimeoId}`;
    const resp = await fetch(pageUrl, {
      headers: { "Referer": "https://www.skool.com/" },
    });
    if (!resp.ok) {
      console.warn(`[bg] Vimeo player page returned ${resp.status}`);
      return { error: `Vimeo returned ${resp.status}` };
    }

    const html = await resp.text();
    const configMatch = html.match(/window\.playerConfig\s*=\s*(\{.+?\})(?:\s*;|\s*<\/script>)/s);
    if (!configMatch) {
      console.warn("[bg] Could not find playerConfig in Vimeo HTML");
      return { error: "No playerConfig found in Vimeo page" };
    }

    const config = JSON.parse(configMatch[1]);
    const files = config?.request?.files;
    if (!files) return { error: "No files in Vimeo config" };

    // Prefer progressive MP4 if available
    if (Array.isArray(files.progressive) && files.progressive.length > 0) {
      const sorted = [...files.progressive].sort((a, b) => (b.width || 0) - (a.width || 0));
      const best = sorted[0];
      console.log(`[bg] ✓ Vimeo progressive: ${sorted.length} files, best: ${best.quality}`);
      return { url: best.url, quality: best.quality || "unknown", width: best.width, height: best.height };
    }

    // Fall back to HLS master playlist
    const hls = files.hls;
    if (hls?.cdns) {
      const cdnKey = hls.default_cdn || Object.keys(hls.cdns)[0];
      const cdnData = hls.cdns[cdnKey];
      if (cdnData?.url) {
        console.log(`[bg] ✓ Vimeo HLS via ${cdnKey}`);
        return { url: cdnData.url, quality: "hls", isHls: true };
      }
    }

    return { error: "No progressive or HLS URLs in Vimeo config" };
  } catch (e) {
    console.warn("[bg] Vimeo fetch failed:", e.message);
    return { error: e.message };
  }
}

chrome.storage.local.get("collectedMedia", ({ collectedMedia = [] }) => {
  setBadge(collectedMedia.length);
});
