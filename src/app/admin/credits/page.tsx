import { getAdminCredits, getAdminUsers } from "@/server/actions/admin-actions";
import { CreditGrantForm } from "./grant-form";

export default async function CreditsPage() {
  const [credits, users] = await Promise.all([
    getAdminCredits(),
    getAdminUsers(),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Credits</h1>
      <p className="mt-1 text-sm text-zinc-400">{credits.length} transactions</p>

      <div className="mt-6">
        <CreditGrantForm users={users.map((u) => ({ id: u.id, email: u.email }))} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {credits.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-400">{t.user.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    t.type === "SPEND" ? "bg-red-950 text-red-400" :
                    t.type === "PURCHASE" ? "bg-green-950 text-green-400" :
                    t.type === "PLAN_GRANT" ? "bg-blue-950 text-blue-400" :
                    t.type === "REFUND" ? "bg-yellow-950 text-yellow-400" :
                    "bg-purple-950 text-purple-400"
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${
                  t.amount > 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{t.balance}</td>
                <td className="max-w-64 truncate px-4 py-2.5 text-xs text-zinc-500">{t.description}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
