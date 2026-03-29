"use client";

import { useState, useEffect } from "react";
import { getRefAccounts, getRefPosts } from "@/server/actions/admin-actions";
import { AccountGrid } from "@/components/admin/references/account-grid";
import { PostGrid } from "@/components/admin/references/post-grid";

export default function ReferencesPage() {
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof getRefAccounts>>>([]);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; handle: string } | null>(null);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof getRefPosts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRefAccounts().then((data) => {
      setAccounts(data);
      setLoading(false);
    });
  }, []);

  const handleSelectAccount = async (id: string, handle: string) => {
    setSelectedAccount({ id, handle });
    const data = await getRefPosts(id);
    setPosts(data);
  };

  if (loading) {
    return (
      <div className="px-10 py-10">
        <h1 className="text-2xl font-bold">References</h1>
        <p className="mt-4 text-sm text-zinc-500">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="px-10 py-10">
      <h1 className="text-2xl font-bold">References</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Instagram accounts and collected posts.
      </p>

      <div className="mt-6">
        {selectedAccount ? (
          <PostGrid
            posts={posts}
            handle={selectedAccount.handle}
            onBack={() => setSelectedAccount(null)}
          />
        ) : (
          <AccountGrid
            accounts={accounts}
            onSelect={handleSelectAccount}
          />
        )}
      </div>
    </div>
  );
}
