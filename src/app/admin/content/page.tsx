import { getAdminContent } from "@/server/actions/admin-actions";

export default async function ContentPage() {
  const content = await getAdminContent();

  return (
    <div className="p-8 [&_table]:min-w-[900px]">
      <h1 className="text-2xl font-bold">Content</h1>
      <p className="mt-1 text-sm text-zinc-400">{content.length} total pieces</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Creator</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">User</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Credits</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Prompt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {content.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2">
                  {c.signedUrl ? (
                    <img
                      src={c.signedUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-600">
                      —
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-400">{c.source}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    c.status === "COMPLETED" ? "bg-green-950 text-green-400" :
                    c.status === "GENERATING" ? "bg-blue-950 text-blue-400" :
                    "bg-red-950 text-red-400"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-300">{c.creator.name}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">{c.creator.user.email}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{c.creditsCost}</td>
                <td className="max-w-48 truncate px-4 py-2.5 text-xs text-zinc-500">
                  {c.prompt ?? "—"}
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
