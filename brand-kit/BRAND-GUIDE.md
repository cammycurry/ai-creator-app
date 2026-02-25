# AI Influencer Academy — Brand Guide

> Design system extracted for development. See `AI-Influencer-Academy-Brand-Kit.html` for full visual reference.

---

## 🎨 Color Palette

### Primary Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Charcoal** | `#2C2C2C` | `--charcoal` | Primary text, logo, dark backgrounds |
| **Cream** | `#FAF8F5` | `--cream` | Primary background, light mode base |
| **Sand** | `#F0EBE3` | `--sand` | Secondary background, cards |
| **Graphite** | `#4A4A4A` | `--graphite` | Secondary text, body copy |

### Accent Pastels

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Blush** | `#E8D5CF` | `--blush` | Warm accent, highlights |
| **Sage** | `#C5CFC6` | `--sage` | Success states, positive |
| **Sky** | `#CADCE8` | `--sky` | Info, links, interactive |
| **Lavender** | `#D5D0E5` | `--lavender` | Secondary accent |
| **Peach** | `#F2D8C9` | `--peach` | Warm highlights |

### Neutral Grays

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Stone** | `#8A8A8A` | `--stone` | Muted text, labels |
| **Mist** | `#B8B8B8` | `--mist` | Disabled, placeholder |
| **Light Line** | `#E5E0DA` | `--light-line` | Borders, dividers |
| **Warm White** | `#FFFFFF` | `--warm-white` | Cards, surfaces |

### CSS Variables Block

```css
:root {
  /* Primary */
  --cream: #FAF8F5;
  --warm-white: #FFFFFF;
  --sand: #F0EBE3;
  --charcoal: #2C2C2C;
  --graphite: #4A4A4A;
  
  /* Accents */
  --blush: #E8D5CF;
  --sage: #C5CFC6;
  --sky: #CADCE8;
  --lavender: #D5D0E5;
  --peach: #F2D8C9;
  
  /* Neutrals */
  --stone: #8A8A8A;
  --mist: #B8B8B8;
  --light-line: #E5E0DA;
}
```

---

## 🔤 Typography

### Font Stack

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Display** | Playfair Display | 400, 500, 600 + Italic | Headlines, titles, hero text |
| **Body** | DM Sans | 300, 400, 500, 600 | Body copy, UI elements, buttons |
| **Utility** | JetBrains Mono | 300, 400 | Labels, captions, code, metadata |

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&family=Playfair+Display:wght@400;500;600&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
```

### Type Scale

| Level | Size | Font | Weight | Usage |
|-------|------|------|--------|-------|
| H1 | 40px | Playfair Display | 400 | Page titles |
| H2 | 28px | Playfair Display | 400 | Section headers |
| H3 | 20px | DM Sans | 500 | Card titles, subsections |
| Body | 15px | DM Sans | 300 | Paragraphs, descriptions |
| Caption | 12px | DM Sans | 300 | Small labels, helper text |
| Mono | 11px | JetBrains Mono | 300 | Metadata, technical labels |

### Tailwind Config (suggested)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cream: '#FAF8F5',
        sand: '#F0EBE3',
        charcoal: '#2C2C2C',
        graphite: '#4A4A4A',
        blush: '#E8D5CF',
        sage: '#C5CFC6',
        sky: '#CADCE8',
        lavender: '#D5D0E5',
        peach: '#F2D8C9',
        stone: '#8A8A8A',
        mist: '#B8B8B8',
        'light-line': '#E5E0DA',
      },
    },
  },
}
```

---

## 🏷️ Logo

### Logo Mark
- Rounded square (14px radius at 56px size)
- Background: Charcoal (`#2C2C2C`)
- Text: "Ai" in Cream (`#FAF8F5`)
- Font: Playfair Display, 500 weight

### Full Logo
- Logo mark + "AI Influencer Academy" text
- Tagline (optional): "Learn. Create. Influence."

### Logo Variations
| Variant | Background | Logo | Text |
|---------|------------|------|------|
| Primary Light | Cream/White | Charcoal mark | Charcoal text |
| Primary Dark | Charcoal | Cream mark | Cream text |
| Warm | Sand | Charcoal mark | Charcoal text |
| Accent | Sage/Sky | Charcoal mark | Charcoal text |

### Clear Space
- Minimum clear space around logo: 1× icon width

---

## 🎭 Brand Voice

### We Do
- Speak with quiet confidence
- Use clear, concise language
- Educate and empower equally
- Sound like a trusted advisor
- Keep things actionable and grounded
- Respect our audience's intelligence

### We Don't
- Hype, oversell, or use clickbait
- Use jargon for the sake of it
- Sound robotic or overly corporate
- Promise overnight success
- Talk down to our community
- Chase trends over substance

---

## 📐 UI Guidelines

### Border Radius
- Cards: `16px` / `rounded-2xl`
- Buttons: `12px` / `rounded-xl`
- Inputs: `8px` / `rounded-lg`
- Logo mark: `14px`

### Shadows
- Keep minimal, prefer borders
- If shadow: `shadow-sm` with low opacity

### Borders
- Default: `1px solid var(--light-line)`
- Hover: Can darken slightly

### Spacing
- Use consistent 8px grid
- Section padding: `100px 40px` desktop, `60px 24px` mobile
- Card padding: `36px 28px`

---

## 🖼️ Application Examples

### Social Media
- Pastel gradients (Sky → Lavender, Sand → Blush)
- Centered layouts
- Minimal copy, let visuals breathe

### Email
- Clean headers
- Warm tones (Sand, Cream)
- Structured hierarchy

### Course/Web
- Clear navigation
- Generous whitespace
- Focused, scannable content

---

## 📦 Assets Checklist

### Needed for App
- [ ] Logo SVG (mark only)
- [ ] Logo SVG (full horizontal)
- [ ] Favicon (from logo mark)
- [ ] OG image (social sharing)
- [ ] Email header
- [ ] Loading animation (optional)

---

*Extracted from Brand Kit v1.0 — 2026-02-25*
