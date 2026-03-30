"use client";

import { useEffect } from "react";
import { useCreatorStore } from "@/stores/creator-store";
import { getWorkspaceData } from "@/server/actions/workspace-actions";
import { getCreatorReferences } from "@/server/actions/reference-actions";

export function WorkspaceInit() {
  const { loaded, setCreators, setActiveCreator, setCredits, setLoaded, activeCreatorId, setReferences } =
    useCreatorStore();

  useEffect(() => {
    if (loaded) return;

    getWorkspaceData()
      .then((data) => {
        if (data.creators.length > 0) {
          setCreators(data.creators);
          setActiveCreator(data.creators[0].id);
        }
        setCredits(data.balance);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load workspace data:", err);
        setLoaded(true);
      });
  }, [loaded, setCreators, setActiveCreator, setCredits, setLoaded]);

  useEffect(() => {
    if (!activeCreatorId) return;
    getCreatorReferences(activeCreatorId).then(setReferences);
  }, [activeCreatorId, setReferences]);

  return null;
}
