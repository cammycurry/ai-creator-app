import { getAdminJobs } from "@/server/actions/admin-actions";

export default async function JobsPage() {
  const jobs = await getAdminJobs();

  return (
    <div className="p-8 [&_table]:min-w-[900px]">
      <h1 className="text-2xl font-bold">Generation Jobs</h1>
      <p className="mt-1 text-sm text-zinc-400">{jobs.length} total jobs</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Model</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Est. Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Actual Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Error</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {jobs.map((job) => {
              const duration =
                job.startedAt && job.completedAt
                  ? ((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1) + "s"
                  : "—";

              return (
                <tr key={job.id} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      job.status === "COMPLETED" ? "bg-green-950 text-green-400" :
                      job.status === "PROCESSING" ? "bg-blue-950 text-blue-400" :
                      job.status === "QUEUED" ? "bg-yellow-950 text-yellow-400" :
                      "bg-red-950 text-red-400"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">{job.type}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{job.provider}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{job.modelId}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">
                    {job.estimatedCost != null ? `$${job.estimatedCost.toFixed(3)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300">
                    {job.actualCost != null ? `$${job.actualCost.toFixed(3)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">{duration}</td>
                  <td className="max-w-48 truncate px-4 py-2.5 text-xs text-red-400">
                    {job.error ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
