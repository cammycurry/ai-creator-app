import { getTestRuns } from "@/server/actions/admin-actions";
import { QuickTest } from "@/components/admin/prompt-lab/quick-test";

export default async function PromptLabPage() {
  const runs = await getTestRuns();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Prompt Lab</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Test prompts directly against Gemini. No credits, no DB records.
      </p>

      <div className="mt-6">
        <QuickTest initialRuns={runs} />
      </div>
    </div>
  );
}
