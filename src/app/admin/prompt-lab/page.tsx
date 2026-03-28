import { getTestRuns, getAdminCreators } from "@/server/actions/admin-actions";
import { PromptLabTabs } from "./tabs";

export default async function PromptLabPage() {
  const [runs, creators] = await Promise.all([
    getTestRuns(),
    getAdminCreators(),
  ]);

  const creatorOptions = creators.map((c) => ({
    id: c.id,
    name: c.name,
    baseImageUrl: c.baseImageUrl,
  }));

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-bold">Prompt Lab</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Test prompts and generation pipelines.
      </p>

      <div className="mt-6">
        <PromptLabTabs initialRuns={runs} creators={creatorOptions} />
      </div>
    </div>
  );
}
