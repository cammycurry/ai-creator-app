"use client";

type Account = {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  postCount: number | null;
  profilePicUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  isBusiness: boolean;
  categoryName: string | null;
  externalUrl: string | null;
  niche: string[];
  gender: string | null;
  vibe: string | null;
  quality: number | null;
  notes: string | null;
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
          <div className="flex items-center gap-3">
            {a.profilePicUrl && (
              <img
                src={a.profilePicUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-semibold text-zinc-100 truncate">@{a.handle}</div>
                {a.isVerified && <span className="text-[10px] text-blue-400" title="Verified">✓</span>}
                {a.isPrivate && <span className="text-[10px] text-zinc-500" title="Private">🔒</span>}
                <a
                  href={`https://instagram.com/${a.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                  title="Open Instagram profile"
                >
                  ↗
                </a>
              </div>
              {a.name && (
                <div className="text-xs text-zinc-500 truncate">{a.name}</div>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex gap-3 text-[11px] text-zinc-600">
            {a.followers != null && (
              <span>
                <span className="font-semibold text-zinc-400">{fmtNum(a.followers)}</span> followers
              </span>
            )}
            {a.following != null && (
              <span>
                <span className="font-semibold text-zinc-400">{fmtNum(a.following)}</span> following
              </span>
            )}
            <span>
              <span className="font-semibold text-zinc-400">{a.savedPosts}</span> saved
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {a.categoryName && (
              <span className="rounded bg-indigo-900/40 px-1.5 py-0.5 text-[10px] text-indigo-300">
                {a.categoryName}
              </span>
            )}
            {a.isBusiness && !a.categoryName && (
              <span className="rounded bg-indigo-900/40 px-1.5 py-0.5 text-[10px] text-indigo-300">
                Creator
              </span>
            )}
            {a.gender && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {a.gender}
              </span>
            )}
            {a.vibe && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {a.vibe}
              </span>
            )}
            {a.niche.map((n) => (
              <span
                key={n}
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {n}
              </span>
            ))}
            {a.quality != null && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-amber-400">
                Q{a.quality}
              </span>
            )}
          </div>

          {a.externalUrl && (
            <div className="mt-1">
              <a
                href={a.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-blue-400 hover:underline truncate block"
              >
                {a.externalUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}

          {a.bio && (
            <div className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-600">
              {a.bio}
            </div>
          )}
          {a.notes && (
            <div className="mt-1 line-clamp-1 text-[10px] italic text-zinc-600">
              {a.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
