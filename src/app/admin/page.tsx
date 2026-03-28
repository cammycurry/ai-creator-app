import Link from "next/link";
import { getAdminStats, getRecentActivity } from "@/server/actions/admin-actions";
import { StatsCards } from "@/components/admin/stats-cards";
import { ActivityFeed } from "@/components/admin/activity-feed";

export default async function AdminDashboard() {
  const [stats, activity] = await Promise.all([
    getAdminStats(),
    getRecentActivity(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-10 py-10">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-400">
        System overview for realinfluencer.ai
      </p>

      <div className="mt-10">
        <StatsCards stats={stats} />
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/admin/prompt-lab"
          className="rounded-md bg-[#C4603A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#d4704a]"
        >
          Run a prompt test
        </Link>
        <Link
          href="/admin/credits"
          className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Grant credits
        </Link>
        <Link
          href="/admin/jobs?status=FAILED"
          className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          View failed jobs
        </Link>
      </div>

      <div className="mt-10">
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
