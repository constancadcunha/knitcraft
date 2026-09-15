"use client";
import { useEffect } from "react";
import { useAccount, hasPendingSaves, retrySaves } from "@/lib/account";
export default function SaveStatus() {
  const account = useAccount();
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (hasPendingSaves()) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, []);
  if (account.error) return <div role="alert" className="border-b-2 border-berry bg-panel px-5 py-3 text-berry">{account.error} <button className="underline ml-3" onClick={() => void retrySaves().catch(() => {})}>Retry saving</button></div>;
  return <div role="status" className="px-5 py-1 text-right text-xs text-ink-faint">{account.saving ? "Saving…" : account.loaded ? "Saved to database" : "Connecting to your database…"}</div>;
}
