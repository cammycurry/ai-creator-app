"use client";

import { useEffect, useState } from "react";

// Force component re-render on an interval so elapsed-time displays update
// without triggering server polls. Pass enabled=false to pause the tick
// (avoids re-rendering a large grid when nothing is actively generating).
export function useTick(intervalMs: number = 1000, enabled: boolean = true): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return tick;
}
