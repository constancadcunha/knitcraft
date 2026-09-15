/**
 * localStorage persistence. Client-only: there is no backend, no account and no
 * cloud, by design — the maker's projects never leave their browser.
 *
 * Three things this fixes from the old store:
 *
 *  1. VERSIONED KEYS AND A CLEAN BREAK. Keys carry the schema version, so data
 *     written by an older model is simply not found, and the known old keys are
 *     swept on first load. A returning user with v1 data gets an empty working
 *     app instead of a crash inside a renderer that expected a field that is no
 *     longer there.
 *
 *  2. ONE KEY PER PROJECT. The old store re-serialised EVERY chart the user had
 *     ever saved on every single stitch toggle — ~1 MB per write for one worked
 *     cardigan. Writes are now scoped to the project that changed.
 *
 *  3. FAILURES ARE REPORTED. `catch {}` around `setItem` is how people lost a
 *     session's counting without a word of warning. Every write returns a
 *     result, and the store surfaces it.
 */

import { PROJECT_SCHEMA_VERSION, type Project } from "@/types";
import { parseProject } from "./validate";

export const STORAGE_NAMESPACE = "stitchcraft";

const PREFIX = `${STORAGE_NAMESPACE}.v${PROJECT_SCHEMA_VERSION}`;

export const INDEX_KEY = `${PREFIX}.index`;

export function projectKey(id: string): string {
  return `${PREFIX}.project.${id}`;
}

/**
 * Keys written by builds before the rebuild. There is no migration — the model
 * changed too much for one to be honest — so these are deleted on sight.
 */
export const LEGACY_KEYS: readonly string[] = ["kc_patterns", "kc_charts", "kc_projects"];

/** The slice of the Storage API we use. Narrow, so tests can fake it in four lines. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Optional: present on real localStorage, used only to sweep stale versions. */
  readonly length?: number;
  key?(index: number): string | null;
}

export type StorageFailureReason = "quota" | "unavailable" | "serialize";

export interface StorageFailure {
  reason: StorageFailureReason;
  message: string;
}

export type SaveResult = { ok: true } | { ok: false; error: StorageFailure };

export interface LoadResult {
  projects: Project[];
  /**
   * True when something stored had to be thrown away. The UI should say so
   * once — a user whose projects vanished deserves to know it was deliberate.
   */
  discarded: boolean;
  discardedReason?: string;
  error?: StorageFailure;
}

const OK: SaveResult = { ok: true };

/* -------------------------------------------------------------------------- */
/* Getting at storage safely                                                   */
/* -------------------------------------------------------------------------- */

/**
 * localStorage, or null.
 *
 * Merely TOUCHING `window.localStorage` throws in some privacy modes and when
 * site data is blocked, so even the access is guarded. Null means "run without
 * persistence", never "crash".
 */
export function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    // Safari in private mode used to expose localStorage and throw on write, so
    // probe it rather than trusting its presence.
    const probe = `${PREFIX}.probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Is this the browser saying "no room left"?
 *
 * Chrome throws QuotaExceededError (code 22), Firefox NS_ERROR_DOM_QUOTA_REACHED
 * (code 1014), and older WebKit throws a plain error in private mode. All three
 * mean the same thing to the maker: the count is not being saved.
 */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const code = (error as DOMException).code;
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

function failureFor(error: unknown): StorageFailure {
  if (isQuotaError(error)) {
    return {
      reason: "quota",
      message:
        "This browser has run out of storage space, so your progress is not being saved. Delete or export an old project to make room.",
    };
  }
  return {
    reason: "unavailable",
    message:
      "This browser would not let the app save. Your work is safe on screen but will be lost if you close the tab.",
  };
}

function writeKey(storage: StorageLike, key: string, value: string): SaveResult {
  try {
    storage.setItem(key, value);
    return OK;
  } catch (error) {
    return { ok: false, error: failureFor(error) };
  }
}

function readKey(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function dropKey(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing useful to do: we were trying to free space in the first place.
  }
}

/* -------------------------------------------------------------------------- */
/* Index                                                                       */
/* -------------------------------------------------------------------------- */

interface StoredIndex {
  schemaVersion: number;
  ids: string[];
  savedAt: string;
}

function parseIndex(raw: string | null): StoredIndex | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    if (record.schemaVersion !== PROJECT_SCHEMA_VERSION) return null;
    if (!Array.isArray(record.ids)) return null;
    return {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      ids: record.ids.filter((id): id is string => typeof id === "string"),
      savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeIndex(storage: StorageLike, ids: string[], now: string): SaveResult {
  const index: StoredIndex = { schemaVersion: PROJECT_SCHEMA_VERSION, ids, savedAt: now };
  return writeKey(storage, INDEX_KEY, JSON.stringify(index));
}

/**
 * Remove data this build cannot read: the pre-rebuild keys, and any other
 * schema version's keys when the storage lets us enumerate them.
 */
export function sweepLegacy(storage: StorageLike): boolean {
  let swept = false;

  for (const key of LEGACY_KEYS) {
    if (readKey(storage, key) !== null) {
      dropKey(storage, key);
      swept = true;
    }
  }

  const count = storage.length;
  if (typeof count === "number" && typeof storage.key === "function") {
    const stale: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(`${STORAGE_NAMESPACE}.v`) && !key.startsWith(`${PREFIX}.`)) {
        stale.push(key);
      }
    }
    for (const key of stale) {
      dropKey(storage, key);
      swept = true;
    }
  }

  return swept;
}

/* -------------------------------------------------------------------------- */
/* Load                                                                        */
/* -------------------------------------------------------------------------- */

/** Read every project. Never throws; discards anything it cannot trust. */
export function loadProjects(storage: StorageLike | null): LoadResult {
  if (!storage) {
    return {
      projects: [],
      discarded: false,
      error: {
        reason: "unavailable",
        message: "Storage is unavailable in this browser, so nothing will be saved.",
      },
    };
  }

  const sweptLegacy = sweepLegacy(storage);
  const index = parseIndex(readKey(storage, INDEX_KEY));

  if (!index) {
    // Either a first visit, or data from a schema this build cannot read.
    const hadIndex = readKey(storage, INDEX_KEY) !== null;
    if (hadIndex) dropKey(storage, INDEX_KEY);
    return {
      projects: [],
      discarded: sweptLegacy || hadIndex,
      discardedReason:
        sweptLegacy || hadIndex
          ? "Projects saved by an earlier version of the app could not be read and were cleared."
          : undefined,
    };
  }

  const projects: Project[] = [];
  const keptIds: string[] = [];
  let dropped = 0;

  for (const id of index.ids) {
    const key = projectKey(id);
    const raw = readKey(storage, key);
    if (raw === null) {
      dropped += 1;
      continue;
    }
    let parsed: Project | null = null;
    try {
      parsed = parseProject(JSON.parse(raw) as unknown);
    } catch {
      parsed = null;
    }
    if (!parsed) {
      dropKey(storage, key);
      dropped += 1;
      continue;
    }
    projects.push(parsed);
    keptIds.push(id);
  }

  // Rewrite the index if it named things that are gone, so the damage does not
  // compound over later sessions.
  if (dropped > 0) writeIndex(storage, keptIds, new Date().toISOString());

  const discarded = sweptLegacy || dropped > 0;
  return {
    projects,
    discarded,
    discardedReason: discarded
      ? dropped > 0
        ? `${dropped} saved project${dropped === 1 ? "" : "s"} could not be read and ${dropped === 1 ? "was" : "were"} cleared.`
        : "Projects saved by an earlier version of the app could not be read and were cleared."
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Save                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Write one project and make sure the index names it.
 *
 * The project is written FIRST: if the index write then fails, storage holds an
 * unreferenced project (harmless, and swept later) rather than an index naming
 * a project that was never written (a permanent hole).
 */
export function saveProject(
  storage: StorageLike | null,
  project: Project,
  allIds: string[],
  now = new Date().toISOString(),
): SaveResult {
  if (!storage) return { ok: false, error: failureFor(new Error("no storage")) };

  let payload: string;
  try {
    payload = JSON.stringify(project);
  } catch (error) {
    return {
      ok: false,
      error: {
        reason: "serialize",
        message: `Project "${project.name}" could not be saved: ${(error as Error).message}`,
      },
    };
  }

  const written = writeKey(storage, projectKey(project.id), payload);
  if (!written.ok) return written;
  return writeIndex(storage, allIds, now);
}

/** Remove one project and drop it from the index. */
export function deleteProject(
  storage: StorageLike | null,
  id: string,
  remainingIds: string[],
  now = new Date().toISOString(),
): SaveResult {
  if (!storage) return { ok: false, error: failureFor(new Error("no storage")) };
  dropKey(storage, projectKey(id));
  return writeIndex(storage, remainingIds, now);
}

/** Rewrite everything. Used on import and on bulk edits, not on every stitch. */
export function saveAllProjects(
  storage: StorageLike | null,
  projects: Project[],
  now = new Date().toISOString(),
): SaveResult {
  if (!storage) return { ok: false, error: failureFor(new Error("no storage")) };
  const ids = projects.map((project) => project.id);
  for (const project of projects) {
    const result = saveProject(storage, project, ids, now);
    if (!result.ok) return result;
  }
  return writeIndex(storage, ids, now);
}

/** Delete every key this build owns. The "start again" button. */
export function clearAll(storage: StorageLike | null): void {
  if (!storage) return;
  const index = parseIndex(readKey(storage, INDEX_KEY));
  for (const id of index?.ids ?? []) dropKey(storage, projectKey(id));
  dropKey(storage, INDEX_KEY);
  sweepLegacy(storage);
}

/** Rough bytes this build is using, for a storage-pressure warning in the UI. */
export function storageFootprint(storage: StorageLike | null): number {
  if (!storage) return 0;
  const index = parseIndex(readKey(storage, INDEX_KEY));
  let bytes = readKey(storage, INDEX_KEY)?.length ?? 0;
  for (const id of index?.ids ?? []) bytes += readKey(storage, projectKey(id))?.length ?? 0;
  return bytes;
}
