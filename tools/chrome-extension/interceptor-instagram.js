// Runs in PAGE context — intercepts fetch/XHR to capture Instagram video & image URLs
// Each captured item includes the post shortcode and carouselIndex so the content script
// can match the correct media to the post the user is viewing.
(function () {
  "use strict";
  const KEY = "__mc_ig_media";
  window[KEY] = window[KEY] || [];

  function isGraphQL(url) {
    return url.includes("/api/graphql") || url.includes("/graphql/query");
  }

  function decodeIfBase64(text) {
    if (!text || text.length < 10) return text;
    if (/^eyJ[A-Za-z0-9+/=]/.test(text.trim())) {
      try { return atob(text.trim()); } catch {}
    }
    return text;
  }

  function extractMediaItems(text) {
    const decoded = decodeIfBase64(text);
    const items = [];
    const seenCodes = new Set();
    try {
      const json = JSON.parse(decoded);
      walkForMedia(json, items, seenCodes);
    } catch {
      regexFallback(decoded, items, seenCodes);
    }
    return items;
  }

  function walkForMedia(obj, items, seenCodes) {
    if (!obj || typeof obj !== "object") return;

    if (typeof obj.code === "string" && obj.code.length > 3) {
      const code = obj.code;
      const pk = obj.pk || obj.id || null;
      const username = obj.user?.username || null;
      const caption = obj.caption?.text || null;

      // Extract audio/music metadata
      let audio = null;
      const musicAsset = obj.music_metadata?.music_info?.music_asset_info
        || obj.clips_metadata?.music_info?.music_asset_info
        || obj.music_metadata?.music_asset_info;
      const originalSound = obj.clips_metadata?.original_sound_info
        || obj.original_sound_info;
      const clipsAttr = obj.clips_music_attribution_info;
      if (musicAsset) {
        audio = {
          title: musicAsset.title || musicAsset.song_name || musicAsset.display_name || null,
          artist: musicAsset.display_artist || musicAsset.artist_name || musicAsset.subtitle || null,
          audioId: musicAsset.audio_cluster_id || musicAsset.audio_id || null,
        };
      } else if (originalSound) {
        audio = {
          title: originalSound.original_audio_title || null,
          artist: originalSound.ig_artist?.username || null,
          audioId: originalSound.audio_asset_id || null,
        };
      } else if (clipsAttr) {
        audio = {
          title: clipsAttr.song_name || null,
          artist: clipsAttr.artist_name || null,
          audioId: clipsAttr.audio_id || null,
        };
      }
      if (audio && !audio.title && !audio.artist) audio = null;

      // Handle carousel posts (edge_sidecar_to_children)
      const sidecar = obj.edge_sidecar_to_children?.edges;
      if (Array.isArray(sidecar) && sidecar.length > 0) {
        for (let ci = 0; ci < sidecar.length; ci++) {
          const child = sidecar[ci]?.node;
          if (!child) continue;

          if (child.video_url && !seenCodes.has(code + "_carousel_video_" + ci)) {
            seenCodes.add(code + "_carousel_video_" + ci);
            const url = cleanUrl(child.video_url);
            if (isCdnUrl(url)) {
              items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: ci, width: child.dimensions?.width || 0, height: child.dimensions?.height || 0 });
            }
          } else if (child.display_url && !seenCodes.has(code + "_carousel_image_" + ci)) {
            seenCodes.add(code + "_carousel_image_" + ci);
            const url = cleanUrl(child.display_url);
            if (isCdnUrl(url)) {
              items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: ci, width: child.dimensions?.width || 0, height: child.dimensions?.height || 0 });
            }
          }

          // Also check private API format within carousel children
          if (Array.isArray(child.video_versions) && child.video_versions.length > 0 && !seenCodes.has(code + "_carousel_pv_" + ci)) {
            seenCodes.add(code + "_carousel_pv_" + ci);
            const versions = child.video_versions;
            let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
            if (best?.url) {
              const url = cleanUrl(best.url);
              if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: ci, width: best.width || 0, height: best.height || 0 });
            }
          } else if (child.image_versions2?.candidates && !seenCodes.has(code + "_carousel_pi_" + ci)) {
            seenCodes.add(code + "_carousel_pi_" + ci);
            const candidates = [...child.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
            if (candidates[0]?.url) {
              const url = cleanUrl(candidates[0].url);
              if (isCdnUrl(url)) items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: ci, width: candidates[0].width || 0, height: candidates[0].height || 0 });
            }
          }
        }
        // If we found carousel items, skip the single-post extraction below
        // (the parent object's video_url/display_url is often the first slide duplicated)
      } else {
        // Single post — not a carousel
        if (Array.isArray(obj.video_versions) && obj.video_versions.length > 0 && !seenCodes.has(code + "_video")) {
          seenCodes.add(code + "_video");
          const versions = obj.video_versions;
          let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
          if (best?.url) {
            const url = cleanUrl(best.url);
            if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: 0, width: best.width || 0, height: best.height || 0 });
          }
        }

        if (obj.image_versions2?.candidates && !seenCodes.has(code + "_image")) {
          seenCodes.add(code + "_image");
          const candidates = [...obj.image_versions2.candidates].sort((a, b) => (b.width || 0) - (a.width || 0));
          if (candidates[0]?.url) {
            const url = cleanUrl(candidates[0].url);
            if (isCdnUrl(url)) items.push({ url, type: "image", code, pk, username, caption, audio, carouselIndex: 0, width: candidates[0].width || 0, height: candidates[0].height || 0 });
          }
        }

        if (typeof obj.video_url === "string" && obj.video_url && !seenCodes.has(code + "_legacy")) {
          seenCodes.add(code + "_legacy");
          const url = cleanUrl(obj.video_url);
          if (isCdnUrl(url)) items.push({ url, type: "video", code, pk, username, caption, audio, carouselIndex: 0, width: 0, height: 0 });
        }
      }
    }

    // Recurse
    if (Array.isArray(obj)) {
      for (const item of obj) walkForMedia(item, items, seenCodes);
    } else {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === "object" && obj[key] !== null) walkForMedia(obj[key], items, seenCodes);
      }
    }
  }

  function regexFallback(text, items, seenCodes) {
    const re = /"video_versions"\s*:\s*(\[[\s\S]*?\])/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      try {
        const versions = JSON.parse(match[1]);
        if (!Array.isArray(versions) || versions.length === 0) continue;
        let best = versions.find((v) => v.type === 104) || versions.find((v) => v.type === 101) || versions[0];
        if (best?.url) {
          const url = cleanUrl(best.url);
          if (isCdnUrl(url)) {
            const nearby = text.substring(Math.max(0, match.index - 500), match.index);
            const codeMatch = nearby.match(/"code"\s*:\s*"([A-Za-z0-9_-]+)"/);
            const code = codeMatch ? codeMatch[1] : null;
            items.push({ url, type: "video", code, pk: null, username: null, carouselIndex: 0, width: best.width || 0, height: best.height || 0 });
          }
        }
      } catch {}
    }
  }

  function cleanUrl(url) {
    return url.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }

  function isCdnUrl(url) {
    return url.includes("cdninstagram.com") || url.includes("fbcdn.net");
  }

  function bridgeToContentScript(items) {
    if (items.length === 0) return;
    const el = document.documentElement;
    const existing = el.getAttribute("data-mc-ig-queue");
    let queue = [];
    try { queue = existing ? JSON.parse(existing) : []; } catch {}

    for (const item of items) {
      // Dedup by code + type + carouselIndex (allows multiple carousel slides)
      const ci = item.carouselIndex ?? 0;
      if (item.code && queue.some((q) => q.code === item.code && q.type === item.type && (q.carouselIndex ?? 0) === ci)) continue;
      // Fallback dedup by URL
      const base = item.url.split("?")[0];
      if (queue.some((q) => q.url.split("?")[0] === base)) continue;

      queue.push({
        url: item.url,
        type: item.type,
        code: item.code,
        pk: item.pk,
        username: item.username,
        caption: item.caption || null,
        audio: item.audio || null,
        width: item.width,
        height: item.height,
        carouselIndex: ci,
        timestamp: Date.now(),
      });
    }

    el.setAttribute("data-mc-ig-queue", JSON.stringify(queue));
    console.log(`[ref-ig] Bridged ${items.length} media (${queue.length} total in queue)`);
  }

  function processResponse(url, text) {
    if (!isGraphQL(url)) return;
    const items = extractMediaItems(text);
    if (items.length > 0) bridgeToContentScript(items);
  }

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const resp = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (isGraphQL(url)) {
        const clone = resp.clone();
        clone.text().then((text) => processResponse(url, text)).catch(() => {});
      }
    } catch {}
    return resp;
  };

  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__mc_url = url;
    return _open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        if (this.__mc_url && isGraphQL(this.__mc_url)) {
          processResponse(this.__mc_url, this.responseText);
        }
      } catch {}
    });
    return _send.apply(this, args);
  };

  setTimeout(() => {
    const scripts = document.querySelectorAll("script:not([src])");
    for (const s of scripts) {
      const text = s.textContent || "";
      if (text.includes("video_versions") || text.includes("video_url") || text.includes("edge_sidecar_to_children")) {
        const items = extractMediaItems(text);
        if (items.length > 0) bridgeToContentScript(items);
      }
    }
    const ogVideo = document.querySelector('meta[property="og:video"]');
    if (ogVideo?.content) {
      const code = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[2] || null;
      bridgeToContentScript([{ url: ogVideo.content, type: "video", code, pk: null, username: null, carouselIndex: 0, width: 0, height: 0 }]);
    }
  }, 1500);
})();
