#!/usr/bin/env npx tsx
/**
 * Prompt Testing Dashboard
 *
 * Visual dashboard for comparing prompt test results side by side.
 * Run: pnpm dashboard
 * Opens: http://localhost:4444
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Reference Collection: DB + S3 ──────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const S3_BUCKET = process.env.S3_BUCKET_NAME!;

async function getRefAccounts() {
  const result = await pool.query(`
    SELECT a.*,
      (SELECT COUNT(*)::int FROM "ReferencePost" WHERE "accountId" = a.id) as "savedPosts"
    FROM "ReferenceAccount" a
    ORDER BY a."createdAt" DESC
  `);
  return result.rows;
}

async function getRefPosts(accountId: string) {
  const result = await pool.query(
    `SELECT * FROM "ReferencePost" WHERE "accountId" = $1 ORDER BY "createdAt" DESC`,
    [accountId]
  );
  const posts = await Promise.all(
    result.rows.map(async (post) => {
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: post.s3Key });
      const imageUrl = await awsGetSignedUrl(s3, cmd, { expiresIn: 3600 });
      return { ...post, imageUrl };
    })
  );
  return posts;
}

const PORT = 4444;
const OUTPUT_DIR = path.join(__dirname, "output");

// ─── API helpers ──────────────────────────────────────

function getTestRuns() {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  const dirs = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const runDir = path.join(OUTPUT_DIR, d.name);
      const promptFile = path.join(runDir, "prompt.txt");
      const refFile = path.join(runDir, "ref-path.txt");
      const images = fs.readdirSync(runDir)
        .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
        .sort();
      const prompt = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, "utf-8") : "";
      const refPath = fs.existsSync(refFile) ? fs.readFileSync(refFile, "utf-8").trim() : null;

      // Parse timestamp and label from folder name
      const parts = d.name.split("_");
      const timestamp = parts[0] || d.name;
      const label = parts.slice(1).join("_") || "unlabeled";

      return {
        id: d.name,
        timestamp,
        label,
        prompt,
        refPath,
        images,
        imageCount: images.length,
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id)); // newest first
  return dirs;
}

// ─── Dashboard HTML ───────────────────────────────────

function dashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prompt Lab</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; }

  .header { padding: 20px 32px; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #0a0a0a; z-index: 100; }
  .header h1 { font-size: 20px; font-weight: 600; color: #fff; }
  .header h1 span { color: #C4603A; }

  .tabs { display: flex; gap: 8px; padding: 16px 32px; border-bottom: 1px solid #1a1a1a; }
  .tab { padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; background: #1a1a1a; border: 1px solid #2a2a2a; color: #999; transition: all 0.15s; }
  .tab:hover { background: #222; color: #ddd; }
  .tab.active { background: #C4603A; border-color: #C4603A; color: #fff; }

  .content { padding: 24px 32px; }

  /* ─── Test Runner ─── */
  .runner { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
  .runner h2 { font-size: 14px; color: #999; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .runner-form { display: flex; flex-direction: column; gap: 12px; }
  .runner-row { display: flex; gap: 12px; align-items: flex-end; }
  .runner-field { flex: 1; }
  .runner-field label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
  .runner-field textarea, .runner-field input, .runner-field select {
    width: 100%; padding: 10px 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px;
    color: #e0e0e0; font-size: 13px; font-family: inherit; resize: vertical;
  }
  .runner-field textarea { min-height: 80px; }
  .runner-field textarea:focus, .runner-field input:focus, .runner-field select:focus {
    outline: none; border-color: #C4603A;
  }
  .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
  .btn-primary { background: #C4603A; color: #fff; }
  .btn-primary:hover { background: #d4704a; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background: #222; color: #ccc; border: 1px solid #333; }
  .btn-secondary:hover { background: #2a2a2a; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  .status-bar { padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-top: 8px; display: none; }
  .status-bar.running { display: block; background: #1a1a0a; border: 1px solid #444400; color: #cccc44; }
  .status-bar.done { display: block; background: #0a1a0a; border: 1px solid #004400; color: #44cc44; }
  .status-bar.error { display: block; background: #1a0a0a; border: 1px solid #440000; color: #cc4444; }

  /* ─── Test Runs List ─── */
  .runs { display: flex; flex-direction: column; gap: 16px; }
  .run { background: #111; border: 1px solid #222; border-radius: 12px; overflow: hidden; }
  .run.comparing { border-color: #C4603A; }
  .run-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a; }
  .run-meta { display: flex; gap: 12px; align-items: center; }
  .run-label { font-weight: 600; font-size: 14px; color: #fff; }
  .run-time { font-size: 12px; color: #666; }
  .run-count { font-size: 11px; color: #999; background: #1a1a1a; padding: 2px 8px; border-radius: 4px; }
  .run-actions { display: flex; gap: 6px; }

  .run-prompt { padding: 12px 20px; background: #0d0d0d; font-size: 12px; color: #888; line-height: 1.5; max-height: 60px; overflow: hidden; cursor: pointer; transition: max-height 0.3s; }
  .run-prompt.expanded { max-height: 400px; }

  .run-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; padding: 12px; }
  .run-img { border-radius: 8px; overflow: hidden; cursor: pointer; position: relative; aspect-ratio: 3/2; background: #1a1a1a; }
  .run-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
  .run-img:hover img { transform: scale(1.02); }
  .run-img .img-label { position: absolute; bottom: 6px; left: 6px; font-size: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; }

  /* ─── Compare View ─── */
  .compare-container { display: none; }
  .compare-container.active { display: block; }
  .compare-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .compare-side { background: #111; border: 1px solid #222; border-radius: 12px; overflow: hidden; }
  .compare-side-header { padding: 12px 16px; border-bottom: 1px solid #1a1a1a; }
  .compare-side-header h3 { font-size: 14px; color: #fff; }
  .compare-side-header p { font-size: 11px; color: #666; margin-top: 4px; }
  .compare-images { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 8px; }
  .compare-images img { width: 100%; border-radius: 6px; cursor: pointer; }

  /* ─── Lightbox ─── */
  .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; cursor: pointer; }
  .lightbox.active { display: flex; }
  .lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }

  /* ─── Model Toggle ─── */
  .model-select { display: flex; gap: 4px; background: #1a1a1a; border-radius: 8px; padding: 3px; }
  .model-opt { padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #888; transition: all 0.15s; }
  .model-opt.active { background: #C4603A; color: #fff; }
  .model-opt:hover:not(.active) { color: #ddd; }

  /* ─── References ─── */
  .refs-accounts { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .ref-account { background: #111; border: 1px solid #222; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.15s; }
  .ref-account:hover { border-color: #444; transform: translateY(-1px); }
  .ref-account.active { border-color: #C4603A; }
  .ref-handle { font-size: 15px; font-weight: 600; color: #fff; }
  .ref-name { font-size: 12px; color: #888; margin-top: 2px; }
  .ref-stats { font-size: 11px; color: #666; margin-top: 8px; display: flex; gap: 12px; }
  .ref-stat { display: flex; align-items: center; gap: 4px; }
  .ref-stat-num { color: #ccc; font-weight: 600; }
  .ref-bio { font-size: 11px; color: #555; margin-top: 6px; line-height: 1.4; max-height: 32px; overflow: hidden; }
  .refs-posts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .refs-posts-header h3 { font-size: 16px; color: #fff; }
  .refs-posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
  .ref-post { border-radius: 8px; overflow: hidden; cursor: pointer; position: relative; aspect-ratio: 1; background: #1a1a1a; }
  .ref-post img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
  .ref-post:hover img { transform: scale(1.03); }
  .ref-post .ref-post-label { position: absolute; bottom: 6px; left: 6px; font-size: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 4px; }
  .ref-post .ref-post-type { position: absolute; top: 6px; right: 6px; font-size: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 4px; }
  .refs-empty { text-align: center; color: #666; padding: 60px 20px; }
  .refs-back { background: none; border: 1px solid #333; color: #aaa; padding: 6px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; }
  .refs-back:hover { border-color: #666; color: #fff; }
</style>
</head>
<body>
<div class="header">
  <h1><span>Prompt</span> Lab</h1>
  <div style="display:flex;gap:8px;align-items:center;">
    <span style="font-size:12px;color:#666;">Model:</span>
    <div class="model-select">
      <div class="model-opt active" data-model="gemini-3-pro-image-preview">NBPro</div>
      <div class="model-opt" data-model="gemini-3.1-flash-image-preview">NB2</div>
    </div>
  </div>
</div>

<div class="tabs">
  <div class="tab active" data-tab="runs">Test Runs</div>
  <div class="tab" data-tab="compare">Compare</div>
  <div class="tab" data-tab="references">References</div>
</div>

<div class="content">
  <!-- Test Runner -->
  <div class="runner">
    <h2>Quick Test</h2>
    <div class="runner-form">
      <div class="runner-field">
        <label>Prompt</label>
        <textarea id="promptInput" placeholder="Enter your prompt or pick a preset..."></textarea>
      </div>
      <div class="runner-row">
        <div class="runner-field" style="flex:0 0 150px;">
          <label>Preset</label>
          <select id="presetSelect">
            <option value="">Custom</option>
            <option value="base-female">Base Female</option>
            <option value="base-male">Base Male</option>
          </select>
        </div>
        <div class="runner-field" style="flex:0 0 100px;">
          <label>Count</label>
          <input type="number" id="countInput" value="4" min="1" max="8">
        </div>
        <div class="runner-field" style="flex:0 0 200px;">
          <label>Label</label>
          <input type="text" id="labelInput" placeholder="test-name">
        </div>
        <div class="runner-field" style="flex:0 0 250px;">
          <label>Reference Image (optional)</label>
          <input type="text" id="refInput" placeholder="path/to/image.jpg">
        </div>
        <button class="btn btn-primary" id="runBtn" onclick="runTest()">Generate</button>
      </div>
    </div>
    <div class="status-bar" id="statusBar"></div>
  </div>

  <!-- Runs View -->
  <div id="runsView">
    <div class="runs" id="runsList"></div>
  </div>

  <!-- Compare View -->
  <div class="compare-container" id="compareView">
    <div class="compare-header">
      <h2 style="font-size:16px;">Side-by-Side Compare</h2>
      <button class="btn btn-secondary btn-sm" onclick="clearCompare()">Clear Selection</button>
    </div>
    <div class="compare-grid" id="compareGrid"></div>
  </div>

  <!-- References View -->
  <div id="refsView" style="display:none;">
    <div id="refsAccountsPanel">
      <div class="refs-accounts" id="refAccountsList"></div>
    </div>
    <div id="refsPostsPanel" style="display:none;">
      <div class="refs-posts-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="refs-back" onclick="backToAccounts()">&larr; Back</button>
          <h3 id="refsPostsTitle"></h3>
        </div>
        <span id="refsPostsCount" style="font-size:12px;color:#666;"></span>
      </div>
      <div class="refs-posts-grid" id="refPostsList"></div>
    </div>
  </div>
</div>

<!-- Lightbox -->
<div class="lightbox" id="lightbox" onclick="closeLightbox()">
  <img id="lightboxImg" src="">
</div>

<script>
let runs = [];
let compareIds = [];
let selectedModel = 'gemini-3-pro-image-preview';

const PRESETS = {
  'base-female': \`A photorealistic upper-body portrait photograph of a 24-year-old woman with warm olive skin, light freckles across her nose, brown eyes, and long wavy brown hair, confident expression with subtle catchlights in her eyes. She is wearing a fitted white scoop-neck sports bra, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.\`,
  'base-male': \`A photorealistic upper-body portrait photograph of a 26-year-old man with light tan skin, brown eyes, and short dark brown hair, confident expression with subtle catchlights in his eyes. He is shirtless, revealing a naturally athletic upper body with relaxed shoulders. Set against a pure white seamless studio backdrop. Illuminated by soft diffused studio lighting from camera-left with a subtle hair light from behind. Shot on Canon EOS R5 with 85mm f/1.4 lens, shallow depth of field, smooth background bokeh. Natural skin texture with visible pores, warm neutral color palette, photorealistic.\`,
};

// ─── Tab switching ───
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.tab;
    document.getElementById('runsView').style.display = view === 'runs' ? 'block' : 'none';
    document.querySelector('.runner').style.display = view === 'runs' ? 'block' : 'none';
    document.getElementById('compareView').classList.toggle('active', view === 'compare');
    document.getElementById('refsView').style.display = view === 'references' ? 'block' : 'none';
    if (view === 'compare') renderCompare();
    if (view === 'references') loadRefAccounts();
  });
});

// ─── Model switching ───
document.querySelectorAll('.model-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.model-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    selectedModel = opt.dataset.model;
  });
});

// ─── Presets ───
document.getElementById('presetSelect').addEventListener('change', (e) => {
  const val = e.target.value;
  if (val && PRESETS[val]) {
    document.getElementById('promptInput').value = PRESETS[val];
    document.getElementById('labelInput').value = val;
  }
});

// ─── Load runs ───
async function loadRuns() {
  const res = await fetch('/api/runs');
  runs = await res.json();
  renderRuns();
}

function renderRuns() {
  const list = document.getElementById('runsList');
  list.innerHTML = runs.map(run => \`
    <div class="run \${compareIds.includes(run.id) ? 'comparing' : ''}" id="run-\${run.id}">
      <div class="run-header">
        <div class="run-meta">
          <span class="run-label">\${run.label}</span>
          <span class="run-time">\${run.timestamp}</span>
          <span class="run-count">\${run.imageCount} images</span>
        </div>
        <div class="run-actions">
          <button class="btn btn-secondary btn-sm" onclick="toggleCompare('\${run.id}')">
            \${compareIds.includes(run.id) ? '✓ Comparing' : 'Compare'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openFolder('\${run.id}')">Open</button>
        </div>
      </div>
      <div class="run-prompt" onclick="this.classList.toggle('expanded')">\${escHtml(run.prompt)}</div>
      <div class="run-images">
        \${run.images.map((img, i) => \`
          <div class="run-img" onclick="openLightbox('/img/\${run.id}/\${img}')">
            <img src="/img/\${run.id}/\${img}" loading="lazy" alt="">
            <span class="img-label">#\${i+1}</span>
          </div>
        \`).join('')}
      </div>
    </div>
  \`).join('');
}

// ─── Compare ───
function toggleCompare(id) {
  if (compareIds.includes(id)) {
    compareIds = compareIds.filter(x => x !== id);
  } else if (compareIds.length < 2) {
    compareIds.push(id);
  } else {
    compareIds = [compareIds[1], id];
  }
  renderRuns();
  if (compareIds.length === 2) {
    document.querySelector('[data-tab="compare"]').click();
  }
}

function clearCompare() {
  compareIds = [];
  renderRuns();
  document.querySelector('[data-tab="runs"]').click();
}

function renderCompare() {
  const grid = document.getElementById('compareGrid');
  if (compareIds.length < 2) {
    grid.innerHTML = '<p style="color:#666;grid-column:span 2;text-align:center;padding:40px;">Select 2 test runs to compare. Click "Compare" on any run.</p>';
    return;
  }
  grid.innerHTML = compareIds.map(id => {
    const run = runs.find(r => r.id === id);
    if (!run) return '';
    return \`
      <div class="compare-side">
        <div class="compare-side-header">
          <h3>\${run.label}</h3>
          <p>\${run.prompt.substring(0, 120)}...</p>
        </div>
        <div class="compare-images">
          \${run.images.map(img => \`
            <img src="/img/\${run.id}/\${img}" onclick="openLightbox('/img/\${run.id}/\${img}')" loading="lazy">
          \`).join('')}
        </div>
      </div>
    \`;
  }).join('');
}

// ─── Run test ───
async function runTest() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) return alert('Enter a prompt');

  const count = parseInt(document.getElementById('countInput').value) || 4;
  const label = document.getElementById('labelInput').value.trim() || 'quick-test';
  const ref = document.getElementById('refInput').value.trim() || null;

  const btn = document.getElementById('runBtn');
  const status = document.getElementById('statusBar');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.className = 'status-bar running';
  status.style.display = 'block';
  status.textContent = \`Generating \${count} image(s) with \${selectedModel}... usually takes 15-30s\`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, count, label, ref, model: selectedModel }),
    });
    const data = await res.json();

    if (data.success) {
      status.className = 'status-bar done';
      status.textContent = \`Done! \${data.imageCount} images generated in \${data.elapsed}s → \${data.folder}\`;
      await loadRuns();
    } else {
      status.className = 'status-bar error';
      status.textContent = \`Error: \${data.error}\`;
    }
  } catch (err) {
    status.className = 'status-bar error';
    status.textContent = \`Error: \${err.message}\`;
  }
  btn.disabled = false;
  btn.textContent = 'Generate';
}

// ─── Lightbox ───
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ─── Helpers ───
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function openFolder(id) { fetch(\`/api/open/\${id}\`); }
function fmtNum(n) { if (!n) return ''; if (n >= 1000000) return (n/1000000).toFixed(1) + 'M'; if (n >= 1000) return (n/1000).toFixed(1) + 'K'; return String(n); }

// ─── References ───
let refAccounts = [];

async function loadRefAccounts() {
  const grid = document.getElementById('refAccountsList');
  grid.innerHTML = '<p style="color:#666;padding:20px;">Loading accounts...</p>';
  try {
    const res = await fetch('/api/references/accounts');
    refAccounts = await res.json();
    renderRefAccounts();
  } catch (err) {
    grid.innerHTML = '<p class="refs-empty">Failed to load accounts. Is the database running?</p>';
  }
}

function renderRefAccounts() {
  const grid = document.getElementById('refAccountsList');
  if (refAccounts.length === 0) {
    grid.innerHTML = '<p class="refs-empty">No accounts collected yet. Use the Chrome extension to add Instagram accounts.</p>';
    return;
  }
  grid.innerHTML = refAccounts.map(a => \`
    <div class="ref-account" onclick="loadRefPosts('\${a.id}', '\${escHtml(a.handle)}')">
      <div class="ref-handle">@\${escHtml(a.handle)}</div>
      \${a.name ? '<div class="ref-name">' + escHtml(a.name) + '</div>' : ''}
      <div class="ref-stats">
        \${a.followers ? '<span class="ref-stat"><span class="ref-stat-num">' + fmtNum(a.followers) + '</span> followers</span>' : ''}
        \${a.postCount ? '<span class="ref-stat"><span class="ref-stat-num">' + fmtNum(a.postCount) + '</span> posts</span>' : ''}
        <span class="ref-stat"><span class="ref-stat-num">\${a.savedPosts}</span> saved</span>
      </div>
      \${a.bio ? '<div class="ref-bio">' + escHtml(a.bio) + '</div>' : ''}
    </div>
  \`).join('');
}

async function loadRefPosts(accountId, handle) {
  document.getElementById('refsAccountsPanel').style.display = 'none';
  document.getElementById('refsPostsPanel').style.display = 'block';
  document.getElementById('refsPostsTitle').textContent = '@' + handle;
  document.getElementById('refPostsList').innerHTML = '<p style="color:#666;padding:20px;">Loading images...</p>';
  document.getElementById('refsPostsCount').textContent = '';

  try {
    const res = await fetch('/api/references/posts?accountId=' + accountId);
    const posts = await res.json();
    document.getElementById('refsPostsCount').textContent = posts.length + ' image(s)';

    if (posts.length === 0) {
      document.getElementById('refPostsList').innerHTML = '<p class="refs-empty">No posts saved for this account yet.</p>';
      return;
    }

    document.getElementById('refPostsList').innerHTML = posts.map(p => \`
      <div class="ref-post" onclick="openLightbox('\${p.imageUrl}')">
        \${p.mediaType === 'video'
          ? '<video src="' + p.imageUrl + '" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>'
          : '<img src="' + p.imageUrl + '" loading="lazy" alt="">'
        }
        <span class="ref-post-label">\${p.shortcode}\${p.carouselIndex > 0 ? ' #' + p.carouselIndex : ''}</span>
        \${p.mediaType === 'video' ? '<span class="ref-post-type">VIDEO</span>' : ''}
      </div>
    \`).join('');
  } catch (err) {
    document.getElementById('refPostsList').innerHTML = '<p class="refs-empty">Failed to load posts.</p>';
  }
}

function backToAccounts() {
  document.getElementById('refsPostsPanel').style.display = 'none';
  document.getElementById('refsAccountsPanel').style.display = 'block';
}

// ─── Init ───
loadRuns();
</script>
</body>
</html>`;
}

// ─── Server ───────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);

  // Dashboard
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(dashboardHTML());
    return;
  }

  // API: list runs
  if (url.pathname === "/api/runs") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getTestRuns()));
    return;
  }

  // API: serve images
  if (url.pathname.startsWith("/img/")) {
    const imgPath = path.join(OUTPUT_DIR, url.pathname.replace("/img/", ""));
    if (fs.existsSync(imgPath)) {
      const ext = path.extname(imgPath).toLowerCase();
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      res.writeHead(200, { "Content-Type": mime });
      res.end(fs.readFileSync(imgPath));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
    return;
  }

  // API: reference accounts
  if (url.pathname === "/api/references/accounts") {
    try {
      const accounts = await getRefAccounts();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(accounts));
    } catch (err: unknown) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  // API: reference posts for account
  if (url.pathname === "/api/references/posts") {
    const accountId = url.searchParams.get("accountId");
    if (!accountId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "accountId required" }));
      return;
    }
    try {
      const posts = await getRefPosts(accountId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(posts));
    } catch (err: unknown) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  // API: open folder
  if (url.pathname.startsWith("/api/open/")) {
    const id = url.pathname.replace("/api/open/", "");
    const dir = path.join(OUTPUT_DIR, id);
    if (fs.existsSync(dir) && process.platform === "darwin") {
      execSync(`open "${dir}"`);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API: generate
  if (url.pathname === "/api/generate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const { prompt, count = 4, label = "quick-test", ref = null, model = "gemini-3-pro-image-preview" } = JSON.parse(body);

        const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        const SAFETY_OFF = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
        const folderName = `${timestamp}_${label}`;
        const outputDir = path.join(OUTPUT_DIR, folderName);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, "prompt.txt"), prompt);
        fs.writeFileSync(path.join(outputDir, "model.txt"), model);

        const startTime = Date.now();

        // Build contents with optional reference image
        const buildContents = () => {
          const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
          if (ref && fs.existsSync(ref)) {
            const imgBuffer = fs.readFileSync(ref);
            const base64 = imgBuffer.toString("base64");
            const ext = path.extname(ref).toLowerCase();
            const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
            parts.push({ inlineData: { mimeType, data: base64 } });
            fs.writeFileSync(path.join(outputDir, "ref-path.txt"), ref);
          }
          return parts;
        };

        // Generate in parallel
        const promises = Array.from({ length: count }, async (_, i) => {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: ref ? buildContents() : prompt,
              config: {
                responseModalities: ["TEXT", "IMAGE"],
                safetySettings: SAFETY_OFF,
              },
            });
            const part = response.candidates?.[0]?.content?.parts?.find(
              (p: { inlineData?: { data?: string } }) => p.inlineData?.data
            );
            if (part?.inlineData?.data) {
              const outPath = path.join(outputDir, `image-${i + 1}.jpg`);
              fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"));
              return true;
            }
            return false;
          } catch {
            return false;
          }
        });

        const results = await Promise.all(promises);
        const succeeded = results.filter(Boolean).length;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          imageCount: succeeded,
          elapsed,
          folder: folderName,
        }));
      } catch (err: unknown) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  Prompt Lab → http://localhost:${PORT}\n`);
  if (process.platform === "darwin") {
    execSync(`open http://localhost:${PORT}`);
  }
});
