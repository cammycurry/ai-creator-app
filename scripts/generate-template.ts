#!/usr/bin/env npx tsx
/**
 * Generate a composition template image for Gemini reference.
 * Creates a silhouette with annotations showing correct framing/placement.
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const WIDTH = 1024;
const HEIGHT = 1536; // 2:3 portrait ratio

// SVG template — white background, centered silhouette, annotation labels
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Pure white studio background -->
  <rect width="100%" height="100%" fill="#ffffff"/>

  <!-- Subtle center guide lines (very faint) -->
  <line x1="${WIDTH/2}" y1="0" x2="${WIDTH/2}" y2="${HEIGHT}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="8,8"/>
  <line x1="0" y1="${HEIGHT * 0.07}" x2="${WIDTH}" y2="${HEIGHT * 0.07}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="8,8"/>

  <!-- HUMAN SILHOUETTE — waist-up, centered, front-facing -->

  <!-- Head (oval) -->
  <ellipse cx="${WIDTH/2}" cy="${HEIGHT * 0.15}" rx="75" ry="95"
    fill="#d0d0d0" stroke="#999" stroke-width="2"/>

  <!-- Neck -->
  <rect x="${WIDTH/2 - 25}" y="${HEIGHT * 0.21}" width="50" height="45"
    fill="#d0d0d0" stroke="#999" stroke-width="2" rx="5"/>

  <!-- Shoulders + Torso trapezoid -->
  <path d="M ${WIDTH/2 - 180} ${HEIGHT * 0.30}
           Q ${WIDTH/2 - 190} ${HEIGHT * 0.28} ${WIDTH/2 - 100} ${HEIGHT * 0.245}
           L ${WIDTH/2 - 25} ${HEIGHT * 0.245}
           L ${WIDTH/2 + 25} ${HEIGHT * 0.245}
           L ${WIDTH/2 + 100} ${HEIGHT * 0.245}
           Q ${WIDTH/2 + 190} ${HEIGHT * 0.28} ${WIDTH/2 + 180} ${HEIGHT * 0.30}
           L ${WIDTH/2 + 160} ${HEIGHT * 0.62}
           Q ${WIDTH/2 + 140} ${HEIGHT * 0.65} ${WIDTH/2 + 100} ${HEIGHT * 0.65}
           L ${WIDTH/2 - 100} ${HEIGHT * 0.65}
           Q ${WIDTH/2 - 140} ${HEIGHT * 0.65} ${WIDTH/2 - 160} ${HEIGHT * 0.62}
           Z"
    fill="#d0d0d0" stroke="#999" stroke-width="2"/>

  <!-- Sports bra area -->
  <path d="M ${WIDTH/2 - 120} ${HEIGHT * 0.30}
           L ${WIDTH/2 + 120} ${HEIGHT * 0.30}
           L ${WIDTH/2 + 110} ${HEIGHT * 0.39}
           L ${WIDTH/2 - 110} ${HEIGHT * 0.39}
           Z"
    fill="#e8e8e8" stroke="#bbb" stroke-width="1.5"/>

  <!-- Upper arms (left) -->
  <path d="M ${WIDTH/2 - 180} ${HEIGHT * 0.30}
           Q ${WIDTH/2 - 210} ${HEIGHT * 0.35} ${WIDTH/2 - 195} ${HEIGHT * 0.52}
           L ${WIDTH/2 - 155} ${HEIGHT * 0.52}
           Q ${WIDTH/2 - 160} ${HEIGHT * 0.35} ${WIDTH/2 - 140} ${HEIGHT * 0.30}
           Z"
    fill="#d0d0d0" stroke="#999" stroke-width="2"/>

  <!-- Upper arms (right) -->
  <path d="M ${WIDTH/2 + 180} ${HEIGHT * 0.30}
           Q ${WIDTH/2 + 210} ${HEIGHT * 0.35} ${WIDTH/2 + 195} ${HEIGHT * 0.52}
           L ${WIDTH/2 + 155} ${HEIGHT * 0.52}
           Q ${WIDTH/2 + 160} ${HEIGHT * 0.35} ${WIDTH/2 + 140} ${HEIGHT * 0.30}
           Z"
    fill="#d0d0d0" stroke="#999" stroke-width="2"/>

  <!-- Face feature guidelines (very subtle) -->
  <!-- Eyes -->
  <ellipse cx="${WIDTH/2 - 30}" cy="${HEIGHT * 0.135}" rx="18" ry="10"
    fill="none" stroke="#bbb" stroke-width="1.5"/>
  <ellipse cx="${WIDTH/2 + 30}" cy="${HEIGHT * 0.135}" rx="18" ry="10"
    fill="none" stroke="#bbb" stroke-width="1.5"/>
  <!-- Nose -->
  <line x1="${WIDTH/2}" y1="${HEIGHT * 0.145}" x2="${WIDTH/2}" y2="${HEIGHT * 0.17}"
    stroke="#bbb" stroke-width="1.5"/>
  <!-- Mouth -->
  <path d="M ${WIDTH/2 - 20} ${HEIGHT * 0.185} Q ${WIDTH/2} ${HEIGHT * 0.195} ${WIDTH/2 + 20} ${HEIGHT * 0.185}"
    fill="none" stroke="#bbb" stroke-width="1.5"/>

  <!-- ANNOTATION LABELS -->
  <style>
    .label { font-family: Arial, Helvetica, sans-serif; fill: #666; }
    .label-bold { font-family: Arial, Helvetica, sans-serif; fill: #444; font-weight: bold; }
  </style>

  <!-- Top label -->
  <text x="${WIDTH/2}" y="${HEIGHT * 0.03}" text-anchor="middle" class="label-bold" font-size="22">
    COMPOSITION: Front-facing, waist-up portrait
  </text>

  <!-- Head space label -->
  <text x="${WIDTH - 60}" y="${HEIGHT * 0.07}" text-anchor="end" class="label" font-size="16">
    Head space above
  </text>

  <!-- Face label -->
  <text x="${WIDTH/2 + 130}" y="${HEIGHT * 0.14}" text-anchor="start" class="label" font-size="16">
    Eyes at camera
  </text>
  <line x1="${WIDTH/2 + 55}" y1="${HEIGHT * 0.135}" x2="${WIDTH/2 + 125}" y2="${HEIGHT * 0.138}"
    stroke="#999" stroke-width="1"/>

  <!-- Shoulders label -->
  <text x="60" y="${HEIGHT * 0.28}" text-anchor="start" class="label" font-size="16">
    Shoulders relaxed
  </text>
  <line x1="185" y1="${HEIGHT * 0.275}" x2="${WIDTH/2 - 140}" y2="${HEIGHT * 0.265}"
    stroke="#999" stroke-width="1"/>

  <!-- Arms label -->
  <text x="40" y="${HEIGHT * 0.45}" text-anchor="start" class="label" font-size="16">
    Arms at sides
  </text>
  <line x1="155" y1="${HEIGHT * 0.445}" x2="${WIDTH/2 - 170}" y2="${HEIGHT * 0.42}"
    stroke="#999" stroke-width="1"/>

  <!-- Clothing label -->
  <text x="${WIDTH - 40}" y="${HEIGHT * 0.35}" text-anchor="end" class="label" font-size="16">
    White sports bra
  </text>
  <line x1="${WIDTH - 175}" y1="${HEIGHT * 0.345}" x2="${WIDTH/2 + 115}" y2="${HEIGHT * 0.34}"
    stroke="#999" stroke-width="1"/>

  <!-- Waist cutoff label -->
  <text x="${WIDTH/2}" y="${HEIGHT * 0.70}" text-anchor="middle" class="label-bold" font-size="18">
    Frame cuts at waist
  </text>
  <line x1="${WIDTH/2 - 200}" y1="${HEIGHT * 0.66}" x2="${WIDTH/2 + 200}" y2="${HEIGHT * 0.66}"
    stroke="#aaa" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Background label -->
  <text x="${WIDTH/2}" y="${HEIGHT * 0.80}" text-anchor="middle" class="label" font-size="18">
    Pure white seamless studio background
  </text>

  <!-- Photography style label at bottom -->
  <text x="${WIDTH/2}" y="${HEIGHT * 0.88}" text-anchor="middle" class="label-bold" font-size="20">
    Raw iPhone photography style
  </text>
  <text x="${WIDTH/2}" y="${HEIGHT * 0.91}" text-anchor="middle" class="label" font-size="16">
    Natural lighting, no filters, no retouching
  </text>
</svg>
`;

async function main() {
  const outputDir = path.join(__dirname, "output", "templates");
  fs.mkdirSync(outputDir, { recursive: true });

  // Convert SVG to PNG
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const outputPath = path.join(outputDir, "composition-template.png");
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Template saved: ${outputPath}`);
  console.log(`Size: ${WIDTH}x${HEIGHT} (2:3 portrait)`);

  // Also save the SVG for reference
  fs.writeFileSync(path.join(outputDir, "composition-template.svg"), svg);

  // Open it (macOS)
  if (process.platform === "darwin") {
    const { execSync } = await import("child_process");
    execSync(`open "${outputPath}"`);
  }
}

main().catch(console.error);
