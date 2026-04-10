---
paths:
  - "src/components/workspace/**"
  - "src/components/studio/**"
  - "src/app/workspace/**"
  - "**/*.css"
---

# Styling Rules

## Prototype-First CSS
- Workspace styles: `src/app/workspace/workspace.css`
- Studio styles: `src/components/studio/studio.css`
- These CSS files contain class names from HTML prototypes
- DO NOT rename classes, DO NOT convert to Tailwind utility classes
- New UI outside workspace/studio CAN use Tailwind

## Brand Theme (matches globals.css + brand.ts)
- Background: #FAFAFA
- Surface: #FFFFFF
- Card: #F5F5F5
- Border: #EBEBEB
- Text primary: #111111
- Text secondary: #888888
- Text muted: #BBBBBB
- Accent / Terracotta: #C4603A
- Logo: "Vi" mark with terracotta #C4603A
- Font: Inter (all), JetBrains Mono (code/labels)

## Component Usage
- shadcn/ui for modals, forms, dropdowns, tooltips — NOT core layout
- Core layout uses prototype CSS classes
- Don't add shadcn components unless needed for new features
