"use client";

import { useState, useEffect } from "react";
import { getRefAccounts, getRefPosts } from "@/server/actions/admin-actions";

type Account = {
  id: string;
  handle: string;
  name: string | null;
  savedPosts: number;
};

type Post = {
  id: string;
  shortcode: string;
  imageUrl: string;
  mediaType: string;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
};

type SourcePost = {
  id: string;
  shortcode: string;
  imageUrl: string;
  handle: string;
  setting: string | null;
  outfit: string | null;
  lighting: string | null;
};

export function SourceSelector({
  selected,
  onSelect,
}: {
  selected: SourcePost | null;
  onSelect: (post: SourcePost | null) => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedHandle, setSelectedHandle] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRefAccounts().then((data) => {
      setAccounts(
        data.map((a) => ({
          id: a.id,
          handle: a.handle,
          name: a.name,
          savedPosts: a.savedPosts,
        }))
      );
    });
  }, []);

  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId);
    const account = accounts.find((a) => a.id === accountId);
    setSelectedHandle(account?.handle || "");
    if (!accountId) {
      setPosts([]);
      return;
    }
    setLoading(true);
    const data = await getRefPosts(accountId);
    setPosts(
      data
        .filter((p) => p.mediaType === "image")
        .map((p) => ({
          id: p.id,
          shortcode: p.shortcode,
          imageUrl: p.imageUrl,
          mediaType: p.mediaType,
          setting: p.setting,
          outfit: p.outfit,
          lighting: p.lighting,
        }))
    );
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Source</h3>
        <button
          onClick={() => onSelect(null)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Start Fresh
        </button>
      </div>

      {/* Account dropdown */}
      <select
        value={selectedAccountId}
        onChange={(e) => handleAccountChange(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none"
      >
        <option value="">Select an account...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            @{a.handle} ({a.savedPosts} posts)
          </option>
        ))}
      </select>

      {/* Selected source preview */}
      {selected && (
        <div className="mb-3 rounded-lg border border-amber-800/50 bg-amber-900/10 p-2">
          <div className="mb-1 text-[10px] font-medium text-amber-400">SELECTED SOURCE</div>
          <img
            src={selected.imageUrl}
            alt=""
            className="w-full rounded-md"
          />
          <div className="mt-1 text-[10px] text-zinc-500">
            @{selected.handle} / {selected.shortcode}
          </div>
        </div>
      )}

      {/* Post grid */}
      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-600">Loading posts...</div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {posts.map((p) => (
            <div
              key={p.id}
              onClick={() =>
                onSelect({
                  id: p.id,
                  shortcode: p.shortcode,
                  imageUrl: p.imageUrl,
                  handle: selectedHandle,
                  setting: p.setting,
                  outfit: p.outfit,
                  lighting: p.lighting,
                })
              }
              className={`relative cursor-pointer overflow-hidden rounded-md ${
                selected?.id === p.id
                  ? "ring-2 ring-amber-500"
                  : "hover:ring-1 hover:ring-zinc-600"
              }`}
            >
              <img
                src={p.imageUrl}
                alt=""
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : selectedAccountId ? (
        <div className="py-8 text-center text-[11px] text-zinc-600">
          No image posts for this account.
        </div>
      ) : null}
    </div>
  );
}
