"use client";

import SaveStatus from "@/components/SaveStatus";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { loadAccount, accountRecords, saveRecord } from "@/lib/account";
import { parseProject } from "@/lib/project/validate";
import type { ChartProgress, Project } from "@/types";
import {
  deleteProject as deleteFromStorage,
  getLocalStorage,
  loadProjects,
  saveProject as saveToStorage,
  type StorageFailure,
} from "@/lib/project/persistence";

/**
 * The client store.
 *
 * Modelled as a module-level external store read through `useSyncExternalStore`
 * rather than as component state loaded in an effect. Three reasons:
 *
 *  1. The React Compiler forbids calling setState from an effect, and hydrating
 *     from localStorage in an effect is exactly that.
 *  2. localStorage IS external state. Two mounted components must see the same
 *     projects, and a write from one must reach the other.
 *  3. The server snapshot is always empty, so there is no hydration mismatch:
 *     the server cannot know what is in the browser.
 *
 * Local storage provides a fast browser copy while the workspace API keeps a
 * private server-side copy that can be recovered on another device.
 */

export interface StoreSnapshot {
  projects: Project[];
  /** False until the first read from storage has happened. */
  loaded: boolean;
  /** Set when stored data was unreadable and had to be discarded. */
  discardedNotice: string | null;
  /** Set when storage itself is failing — quota, private mode, disabled. */
  storageError: StorageFailure | null;
}

const EMPTY: StoreSnapshot = {
  projects: [],
  loaded: false,
  discardedNotice: null,
  storageError: null,
};

let snapshot: StoreSnapshot = EMPTY;
const listeners = new Set<() => void>();
let loading = false;

function emit() {
  for (const listener of listeners) listener();
}

/** Replace the snapshot. The object identity must change for React to re-render. */
function setSnapshot(next: Partial<StoreSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Read from storage exactly once, lazily, on the first client snapshot.
 * getSnapshot must be cheap and must return a stable reference, so the load
 * happens here and then never again.
 */
function getSnapshot(): StoreSnapshot {
  if (!snapshot.loaded && !loading) {
    loading = true;
    void loadAccount().then(async () => {
      const remote = Object.entries(accountRecords()).filter(([k]) => k.startsWith("project.")).map(([,v]) => parseProject(v)).filter((p): p is Project => !!p);
      const local = loadProjects(getLocalStorage());
      const missing = accountRecords().migration ? [] : local.projects.filter(p => !remote.some(r => r.id === p.id));
      for (const p of missing) await saveRecord(`project.${p.id}`, p);
      if (!accountRecords().migration) await saveRecord("migration", true);
      setSnapshot({ projects: [...remote, ...missing], loaded: true, storageError: null });
    }).catch(e => { loading = false; setSnapshot({ storageError: { reason: "unavailable", message: e.message } }); });
  }
  return snapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return EMPTY;
}

function persist(projects: Project[], changed: Project | null, removedId?: string) {
  const storage = getLocalStorage();
  const ids = projects.map(p => p.id);
  if (changed) saveToStorage(storage, changed, ids);
  if (removedId) deleteFromStorage(storage, removedId, ids);
  setSnapshot({ projects });
  const key = changed ? `project.${changed.id}` : removedId ? `project.${removedId}` : null;
  if (key) void saveRecord(key, changed).then(() => setSnapshot({ storageError: null })).catch(e => setSnapshot({ storageError: { reason: "unavailable", message: e.message } }));
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export function putProject(project: Project) {
  const current = getSnapshot().projects;
  const index = current.findIndex((p) => p.id === project.id);
  const stamped: Project = { ...project, updatedAt: new Date().toISOString() };
  const next =
    index === -1
      ? [stamped, ...current]
      : current.map((p) => (p.id === project.id ? stamped : p));
  persist(next, stamped);
}

export function removeProject(id: string) {
  const next = getSnapshot().projects.filter((p) => p.id !== id);
  persist(next, null, id);
}

/** Apply a change to one project, saving only that project. */
export function mutateProject(id: string, change: (project: Project) => Project) {
  const current = getSnapshot().projects;
  const existing = current.find((p) => p.id === id);
  if (!existing) return;
  const updated: Project = { ...change(existing), updatedAt: new Date().toISOString() };
  persist(
    current.map((p) => (p.id === id ? updated : p)),
    updated
  );
}

/**
 * Apply a change to one chart's progress. This is the path the tracker and the
 * voice counter both go through, so every stitch counted aloud is persisted
 * the same way as one clicked by hand.
 */
export function mutateChartProgress(
  projectId: string,
  chartId: string,
  change: (progress: ChartProgress) => ChartProgress
) {
  mutateProject(projectId, (project) => {
    const existing = project.progress.charts[chartId];
    if (!existing) return project;
    return {
      ...project,
      progress: {
        ...project.progress,
        charts: { ...project.progress.charts, [chartId]: change(existing) },
        lastWorkedAt: new Date().toISOString(),
      },
    };
  });
}

export function dismissDiscardedNotice() {
  setSnapshot({ discardedNotice: null });
}

/* -------------------------------------------------------------------------- */
/* React surface                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Kept as a component so the app's tree does not change shape, though the store
 * itself no longer needs a context: any component can subscribe directly.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  return <><SaveStatus />{children}</>;
}

export interface StoreApi extends StoreSnapshot {
  getProject: (id: string) => Project | undefined;
  putProject: typeof putProject;
  removeProject: typeof removeProject;
  mutateProject: typeof mutateProject;
  mutateChartProgress: typeof mutateChartProgress;
  dismissDiscardedNotice: typeof dismissDiscardedNotice;
}

export function useStore(): StoreApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  return {
    ...state,
    getProject,
    putProject,
    removeProject,
    mutateProject,
    mutateChartProgress,
    dismissDiscardedNotice,
  };
}

export { generateId } from "@/lib/id";
