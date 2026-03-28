import { getAdminCreators } from "@/server/actions/admin-actions";

export default async function CreatorsPage() {
  const creators = await getAdminCreators();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Creators</h1>
      <p className="mt-1 text-sm text-zinc-400">{creators.length} total creators</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Niche</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Content</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Base Image</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400">Pre-made</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {creators.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5 font-medium text-zinc-100">{c.name}</td>
                <td className="px-4 py-2.5 text-zinc-400">{c.user.email}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {c.niche.map((n) => (
                      <span key={n} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                        {n}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{c.contentCount}</td>
                <td className="px-4 py-2.5 text-center">
                  {c.baseImageUrl ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {c.isPreMade ? (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Pre-made</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
