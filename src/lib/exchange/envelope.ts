/**
 * The project exchange file.
 *
 * "You should be able to export all of the patterns" — so this is the format
 * that leaves the browser, and the one that has to come back in unchanged.
 *
 * ROUND-TRIPPING IS THE WHOLE PROPERTY. An export that does not re-import to an
 * identical project is worse than no export, because the maker finds out months
 * later with a half-worked sleeve. Two decisions follow from that:
 *
 *  1. The file holds `Project` objects VERBATIM. The model is already
 *     JSON-serialisable by construction (`src/types/index.ts`: no Date, no Map,
 *     no class instances), so there is no bespoke serialisation to drift.
 *  2. Reading a file back goes through `parseProject` — the SAME validator the
 *     app uses on localStorage. A file off someone's disk is exactly as
 *     untrusted as a localStorage value edited in devtools, and there must not
 *     be a second, weaker door into the model.
 *
 * The envelope around the projects carries the schema version, so a file
 * written by a future build is refused with a sentence a human can act on
 * rather than silently dropping every project inside it.
 */

import { PROJECT_SCHEMA_VERSION, type Project } from "@/types";
import { parseProject } from "@/lib/project/validate";

export const EXCHANGE_FORMAT = "stitchcraft.project-export";
export const EXCHANGE_VERSION = 1;

/** 24 MB. Large enough for a library full of chart thumbnails, small enough
 *  that a hostile or accidental multi-gigabyte file cannot lock up the tab. */
export const MAX_IMPORT_BYTES = 24 * 1024 * 1024;

/** JSON nested deeper than this is not our format and is not worth walking. */
const MAX_DEPTH = 32;

export interface ExchangeEnvelope {
  format: typeof EXCHANGE_FORMAT;
  version: typeof EXCHANGE_VERSION;
  app: string;
  exportedAt: string;
  /** The project model version the projects inside were written against. */
  projectSchemaVersion: number;
  projects: Project[];
}

export function buildEnvelope(
  projects: readonly Project[],
  now = new Date().toISOString(),
): ExchangeEnvelope {
  return {
    format: EXCHANGE_FORMAT,
    version: EXCHANGE_VERSION,
    app: "StitchCraft Studio",
    exportedAt: now,
    projectSchemaVersion: PROJECT_SCHEMA_VERSION,
    projects: projects.map((project) => project),
  };
}

/** The bytes of an export file. Indented: people do open these in an editor. */
export function serializeProjects(
  projects: readonly Project[],
  now?: string,
): string {
  return `${JSON.stringify(buildEnvelope(projects, now), null, 2)}\n`;
}

/* -------------------------------------------------------------------------- */
/* Reading a file back                                                         */
/* -------------------------------------------------------------------------- */

export interface ImportFailure {
  ok: false;
  /** A sentence to show the maker. Never a stack trace. */
  message: string;
}

export interface ImportSuccess {
  ok: true;
  projects: Project[];
  /** Entries in the file that `parseProject` refused. */
  dropped: number;
  exportedAt: string | null;
}

export type ImportOutcome = ImportSuccess | ImportFailure;

/**
 * Keys that must never reach an object literal we then spread.
 *
 * `JSON.parse` itself is safe — it creates `__proto__` as an ordinary own
 * property — but `parseProject` passes some sub-objects through with a spread,
 * and object spread on a `__proto__` own property is the one shape that can
 * end up mutating a prototype in some engines. Stripping them costs one walk
 * and removes the whole class of question.
 */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Deep-copy parsed JSON onto null-prototype-free plain values with the
 * dangerous keys removed, refusing anything nested absurdly deep.
 */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) throw new RangeError("too deeply nested");
  if (Array.isArray(value)) return value.map((entry) => sanitize(entry, depth + 1));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = sanitize(entry, depth + 1);
  }
  return out;
}

/**
 * An inspiration photo is stored as a data URL and rendered in an `<img>`.
 * Only real image data URLs are kept: a file could otherwise carry
 * `data:text/html,...` into a tag, and a "just a picture" field is not the
 * place to find that out.
 */
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;

function scrubSource(project: Record<string, unknown>): void {
  const source = project.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) return;
  const record = source as Record<string, unknown>;
  if (typeof record.imagePreview === "string" && !IMAGE_DATA_URL.test(record.imagePreview)) {
    delete record.imagePreview;
  }
}

/**
 * Read an export file.
 *
 * Never throws. Every refusal carries a sentence that says what is wrong with
 * the file, because "import failed" in front of someone's only backup is not a
 * message, it is an accusation.
 */
export function parseExportFile(text: string): ImportOutcome {
  if (text.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      message: `That file is larger than ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB, which is far bigger than any library this app writes. It was not opened.`,
    };
  }
  if (!text.trim()) {
    return { ok: false, message: "That file is empty." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message:
        "That is not a StitchCraft export file — it is not valid JSON. Exports are the .json files this page writes.",
    };
  }

  let clean: unknown;
  try {
    clean = sanitize(raw);
  } catch {
    return { ok: false, message: "That file is nested far too deeply to be a project export." };
  }

  if (clean === null || typeof clean !== "object" || Array.isArray(clean)) {
    return {
      ok: false,
      message: "That file does not contain a project export.",
    };
  }

  const envelope = clean as Record<string, unknown>;
  if (envelope.format !== EXCHANGE_FORMAT) {
    return {
      ok: false,
      message:
        "That JSON file is not a StitchCraft export. Use the Export buttons on this page to make one.",
    };
  }
  if (typeof envelope.version !== "number" || envelope.version > EXCHANGE_VERSION) {
    return {
      ok: false,
      message: `That file was written by a newer version of this app (format ${String(envelope.version)}). Update before importing it.`,
    };
  }
  if (
    typeof envelope.projectSchemaVersion === "number" &&
    envelope.projectSchemaVersion !== PROJECT_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      message: `That file holds version ${envelope.projectSchemaVersion} projects and this app reads version ${PROJECT_SCHEMA_VERSION}. There is no honest way to convert them, so nothing was imported.`,
    };
  }
  if (!Array.isArray(envelope.projects)) {
    return { ok: false, message: "That export file has no projects list in it." };
  }

  const projects: Project[] = [];
  let dropped = 0;
  for (const entry of envelope.projects) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      scrubSource(entry as Record<string, unknown>);
    }
    const project = parseProject(entry);
    if (project) projects.push(project);
    else dropped += 1;
  }

  if (projects.length === 0) {
    return {
      ok: false,
      message:
        dropped > 0
          ? `None of the ${dropped} project${dropped === 1 ? "" : "s"} in that file could be read. It may have been edited by hand, or written by a different app.`
          : "That export file is valid but contains no projects.",
    };
  }

  return {
    ok: true,
    projects,
    dropped,
    exportedAt: typeof envelope.exportedAt === "string" ? envelope.exportedAt : null,
  };
}
