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
    <div className="px-10 py-10">
      <h1 className="text-2xl font-bold">Prompt Lab</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Test prompts and generation pipelines.
      </p>

      <div className="mt-8">
        <PromptLabTabs initialRuns={runs} creators={creatorOptions} />
      </div>
    </div>
  );
}
