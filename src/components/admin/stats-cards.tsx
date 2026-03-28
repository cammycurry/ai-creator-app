import { Users, Sparkles, Image, Activity, CreditCard, DollarSign } from "lucide-react";

type Stats = {
  userCount: number;
  creatorCount: number;
  customCreatorCount: number;
  preMadeCount: number;
  contentCount: number;
  imageCount: number;
  jobCount: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalCreditsSpent: number;
  totalApiCost: number;
};

const CARDS = [
  { key: "userCount", label: "Users", icon: Users },
  { key: "creatorCount", label: "Creators", icon: Sparkles, sub: (s: Stats) => `${s.customCreatorCount} custom, ${s.preMadeCount} pre-made` },
  { key: "contentCount", label: "Content", icon: Image, sub: (s: Stats) => `${s.imageCount} images` },
  { key: "completedJobs", label: "Generations", icon: Activity, sub: (s: Stats) => `${s.successRate}% success, ${s.failedJobs} failed` },
  { key: "totalCreditsSpent", label: "Credits Spent", icon: CreditCard },
  { key: "totalApiCost", label: "API Cost", icon: DollarSign, format: (v: number) => `$${v.toFixed(2)}` },
] as const;

export function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof Stats];
        const formatted = "format" in card && card.format ? card.format(value as number) : String(value);
        const sub = "sub" in card && card.sub ? card.sub(stats) : null;

        return (
          <div
            key={card.key}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4"
          >
            <div className="flex items-center gap-2 text-zinc-400">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{card.label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-100">
              {formatted}
            </div>
            {sub && (
              <div className="mt-1 text-xs text-zinc-500">{sub}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
