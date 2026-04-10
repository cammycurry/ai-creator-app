---
paths:
  - "prisma/**"
  - "src/server/actions/**"
  - "src/lib/db.ts"
---

# Database Rules

## Prisma
- Schema: `prisma/schema.prisma`
- Client: `src/lib/db.ts` (singleton with PrismaPg adapter)
- Migrate: `pnpx prisma migrate dev --name <description>`
- Generate: `pnpx prisma generate`

## Models
- User (Clerk sync, plan, credits)
- Creator (name, niche, baseImageUrl, settings JSON, referenceImages JSON)
- Content (type, status, url, prompt, creditsCost)
- CreditTransaction (type, amount, balance, description)
- GenerationJob (type, status, provider, modelId, input/output JSON)

## Credit Deduction Priority
1. Pack credits first (don't expire)
2. Plan credits second (reset monthly)
- Never go below 0 — return error if insufficient

## Auth Pattern
Every server action starts with:
```typescript
const { userId: clerkId } = await auth();
if (!clerkId) return { success: false, error: "Not authenticated" };
const user = await db.user.findUnique({ where: { clerkId } });
```
