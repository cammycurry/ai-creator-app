"use client";

import { useEffect, useState } from "react";

// Force component re-render on an interval so elapsed-time displays update
// without triggering server polls.
export function useTick(intervalMs: number = 1000): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
