import { getAdminUsers } from "@/server/actions/admin-actions";

export default async function UsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="px-10 py-10">
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="mt-2 text-sm text-zinc-400">{users.length} total users</p>

      <div className="mt-8 overflow-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Plan</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Plan Credits</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Pack Credits</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Creators</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Content</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 text-zinc-100">{user.email}</td>
                <td className="px-4 py-2.5 text-zinc-400">{user.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    user.plan === "FREE" ? "bg-zinc-800 text-zinc-400" :
                    user.plan === "STARTER" ? "bg-blue-950 text-blue-400" :
                    user.plan === "PRO" ? "bg-purple-950 text-purple-400" :
                    "bg-amber-950 text-amber-400"
                  }`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.planCredits}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.packCredits}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user._count.creators}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{user.contentCount}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
