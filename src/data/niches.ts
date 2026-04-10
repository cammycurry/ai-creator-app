export const NICHES = [
  "Fitness", "Lifestyle", "Beauty", "Fashion",
  "Tech", "Travel", "Food", "Music", "Gaming", "Other",
] as const;

export type Niche = (typeof NICHES)[number];
