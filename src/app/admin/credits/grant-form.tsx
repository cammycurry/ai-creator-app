"use client";

import { useState, useTransition } from "react";
import { adminGrantCredits } from "@/server/actions/admin-actions";
import { useRouter } from "next/navigation";

export function CreditGrantForm({ users }: { users: { id: string; email: string }[] }) {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState(10);
  const [type, setType] = useState<"BONUS" | "REFUND">("BONUS");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!userId || amount <= 0) return;

    startTransition(async () => {
      await adminGrantCredits({
        userId,
        amount,
        type,
        description: description || `Admin ${type.toLowerCase()} grant`,
      });
      setAmount(10);
      setDescription("");
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Grant Credits
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <label className="mb-1.5 block text-xs text-zinc-500">User</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1.5 block text-xs text-zinc-500">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            min={1}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div className="w-28">
          <label className="mb-1.5 block text-xs text-zinc-500">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "BONUS" | "REFUND")}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="BONUS">Bonus</option>
            <option value="REFUND">Refund</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs text-zinc-500">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reason for grant..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending || !userId || amount <= 0}
          className="rounded-md bg-[#C4603A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d4704a] disabled:opacity-50"
        >
          {isPending ? "Granting..." : "Grant"}
        </button>
      </div>
    </div>
  );
}
