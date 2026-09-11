"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
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
 * Everything stays on the device. There is no backend and no network call here.
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
  if (!snapshot.loaded) {
    const storage = getLocalStorage();
    const result = loadProjects(storage);
    snapshot = {
      projects: result.projects,
      loaded: true,
      discardedNotice: result.discarded ? (result.discardedReason ?? null) : null,
      storageError: result.error ?? null,
    };
  }
  return snapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return EMPTY;
}

function persist(projects: Project[], changed: Project | null, removedId?: string) {
  const storage = getLocalStorage();
  const ids = projects.map((p) => p.id);
  const result = changed
    ? saveToStorage(storage, changed, ids)
    : removedId
      ? deleteFromStorage(storage, removedId, ids)
      : { ok: true as const };

  setSnapshot({
    projects,
    // A failed write must be visible: silently losing a project is the worst
    // outcome for someone who has spent hours on it.
    storageError: result.ok ? null : result.error,
  });
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
  return <>{children}</>;
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
