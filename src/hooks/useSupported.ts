"use client";

import { useSyncExternalStore } from "react";

/** Capability probes never change during a session, so nothing to subscribe to. */
const noSubscribe = () => () => {};

/**
 * Read a browser capability without a hydration mismatch and without calling
 * setState from an effect: the server snapshot is always `false`, and React
 * re-reads the client snapshot after hydration.
 */
export function useSupported(probe: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, probe, () => false);
}
