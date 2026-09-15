"use client";
import { useSyncExternalStore } from "react";
export interface MakerProfile { name: string; interests: string; favourites: string[]; completedLessons: string[]; }
const emptyProfile: MakerProfile = { name: "", interests: "", favourites: [], completedLessons: [] };
const initial = { recoveryCode: "", loaded: false, saving: false, profile: emptyProfile, records: {} as Record<string, unknown>, error: "" };
let state = initial;
let loading: Promise<void> | undefined;
let flushing: Promise<void> | undefined;
const writes = new Map<string, { value: unknown }>();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }
export function loadAccount() {
  if (!loading) loading = fetch("/api/workspace").then(async r => {
    if (!r.ok) throw new Error("Could not load your database. Retry to reconnect.");
    const data = await r.json();
    state = { ...state, recoveryCode: data.recoveryCode, loaded: true, records: data.records, profile: { ...emptyProfile, ...data.records.profile }, error: "" }; emit();
  }).catch(e => { state = { ...state, error: String(e.message) }; loading = undefined; emit(); throw e; });
  return loading;
}
export function accountRecords() { return state.records; }
export function hasPendingSaves() { return writes.size > 0; }
export function retrySaves(): Promise<void> {
  if (flushing) return flushing;
  state = { ...state, saving: true }; emit();
  flushing = (async () => {
    await loadAccount();
    while (writes.size) {
      const [key, entry] = writes.entries().next().value!;
      const r = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: entry.value }) });
      if (!r.ok) throw new Error("Your latest changes have not reached the database. Keep this tab open and retry.");
      if (writes.get(key) === entry) writes.delete(key);
    }
    state = { ...state, error: "" };
  })().catch(e => { state = { ...state, error: e.message }; throw e; }).finally(() => { flushing = undefined; state = { ...state, saving: false }; emit(); });
  return flushing;
}
export function saveRecord(key: string, value: unknown) {
  writes.set(key, { value });
  state = { ...state, records: { ...state.records, [key]: value } }; emit();
  return retrySaves();
}
export function updateProfile(change: Partial<MakerProfile>) {
  const profile = { ...state.profile, ...change };
  state = { ...state, profile }; emit();
  void saveRecord("profile", profile).catch(() => {});
}
function subscribe(fn: () => void) { listeners.add(fn); void loadAccount().catch(() => {}); return () => { listeners.delete(fn); }; }
export function useAccount() { return useSyncExternalStore(subscribe, () => state, () => initial); }
