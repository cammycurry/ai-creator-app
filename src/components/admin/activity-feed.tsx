import { Users, Sparkles, Image, CreditCard } from "lucide-react";

type ActivityItem = {
  id: string;
  kind: string;
  description: string;
  email: string;
  createdAt: Date;
};

const KIND_ICONS: Record<string, typeof Users> = {
  user: Users,
  creator: Sparkles,
  content: Image,
  credit: CreditCard,
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-100">Recent Activity</h2>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind] || Users;
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-6 py-3.5"
            >
              <Icon className="h-4 w-4 shrink-0 text-zinc-600" />
              <span className="flex-1 text-sm text-zinc-300">
                {item.description}
              </span>
              <span className="text-xs text-zinc-600">{item.email}</span>
              <span className="text-xs text-zinc-600">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-zinc-600">
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
