"use client";

type Account = {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  followers: number | null;
  postCount: number | null;
  niche: string[];
  savedPosts: number;
};

function fmtNum(n: number | null) {
  if (!n) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function AccountGrid({
  accounts,
  onSelect,
}: {
  accounts: Account[];
  onSelect: (id: string, handle: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-600">
        No accounts collected yet. Use the Chrome extension to add Instagram accounts.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {accounts.map((a) => (
        <div
          key={a.id}
          onClick={() => onSelect(a.id, a.handle)}
          className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-600 hover:-translate-y-0.5"
        >
          <div className="text-sm font-semibold text-zinc-100">@{a.handle}</div>
          {a.name && (
            <div className="text-xs text-zinc-500">{a.name}</div>
          )}
          <div className="mt-2 flex gap-3 text-[11px] text-zinc-600">
            {a.followers != null && (
              <span>
                <span className="font-semibold text-zinc-400">
                  {fmtNum(a.followers)}
                </span>{" "}
                followers
              </span>
            )}
            <span>
              <span className="font-semibold text-zinc-400">
                {a.savedPosts}
              </span>{" "}
              saved
            </span>
          </div>
          {a.niche.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {a.niche.map((n) => (
                <span
                  key={n}
                  className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
          {a.bio && (
            <div className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-600">
              {a.bio}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
