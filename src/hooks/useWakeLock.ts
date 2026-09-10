"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Screen wake lock, so a chart left open mid-row doesn't dim and sleep.
 *
 * There is exactly one screen wake lock per document, so it is modelled as a
 * module-level external store with a reference count rather than per-component
 * state: two components asking to stay awake must not fight over one sentinel,
 * and `held` is state the *browser* owns, not React.
 *
 * The browser silently drops the lock whenever the tab is hidden, so it is
 * re-acquired on `visibilitychange`.
 */

let sentinel: WakeLockSentinel | null = null;
let held = false;
let refCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setHeld(next: boolean) {
  if (held === next) return;
  held = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isSupported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

async function acquire() {
  if (!isSupported() || sentinel || refCount === 0) return;
  try {
    const next = await navigator.wakeLock.request("screen");
    // Another consumer may have released while we awaited.
    if (refCount === 0) {
      void next.release();
      return;
    }
    sentinel = next;
    next.addEventListener("release", () => {
      sentinel = null;
      setHeld(false);
    });
    setHeld(true);
  } catch {
    // Denied by battery saver or permissions policy — degrade silently.
    setHeld(false);
  }
}

async function release() {
  const current = sentinel;
  sentinel = null;
  setHeld(false);
  try {
    await current?.release();
  } catch {
    // Already released.
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible" && refCount > 0) void acquire();
}

/** Request that the screen stay awake for as long as `active` is true. */
export function useWakeLock(active: boolean) {
  const heldNow = useSyncExternalStore(
    subscribe,
    () => held,
    () => false
  );

  useEffect(() => {
    if (!active) return;

    refCount += 1;
    if (refCount === 1) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    void acquire();

    return () => {
      refCount -= 1;
      if (refCount === 0) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        void release();
      }
    };
  }, [active]);

  return { supported: isSupported(), held: heldNow };
}
