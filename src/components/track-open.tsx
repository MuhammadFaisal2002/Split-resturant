"use client";

import { useEffect } from "react";

// Module-level so React Strict Mode's double effect run (dev) and re-renders
// never send more than one ping per code per page load.
const sent = new Set<string>();

/** Fires one `link_opened` event per real page load (not on router.refresh polls). */
export function TrackOpen({ code }: { code: string }) {
  useEffect(() => {
    if (sent.has(code)) return;
    sent.add(code);
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "link_opened", code }),
      keepalive: true,
    }).catch(() => {});
  }, [code]);
  return null;
}
