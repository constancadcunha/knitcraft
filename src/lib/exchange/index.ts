/**
 * Import and export — the two halves of getting a pattern in and out.
 *
 * IN  (`chartFromPatternText`, `chartFromGridText`, `projectFromImportedGrid`,
 *      `parseExportFile`) every path ends at a `Project` that opens in the
 *      tracker, via `projectFromSymbolChart`.
 * OUT (`serializeProjects`, `projectToText`, `libraryToText`) writes files that
 *      come back in through the same door they left by.
 *
 * Framework-free apart from `download.ts`, which is the only file here that
 * touches the DOM.
 */

export {
  EXCHANGE_FORMAT,
  EXCHANGE_VERSION,
  MAX_IMPORT_BYTES,
  buildEnvelope,
  parseExportFile,
  serializeProjects,
} from "./envelope";
export type {
  ExchangeEnvelope,
  ImportFailure,
  ImportOutcome,
  ImportSuccess,
} from "./envelope";

export { chartFromPatternText } from "./fromText";
export type {
  ParsedRow,
  SkippedLine,
  TextImportOptions,
  TextImportReport,
} from "./fromText";

export { chartFromGridText } from "./fromGrid";
export type {
  GridImportOptions,
  GridImportReport,
  GridMode,
  UnknownCell,
} from "./fromGrid";

export { projectFromImportedGrid } from "./fromImageGrid";

export { patternFromChart, projectFromSymbolChart } from "./toProject";
export type { ImportToProjectOptions } from "./toProject";

export { fileStem, libraryToText, projectToText } from "./toText";

export { ACCEPTED_FILE_TYPES, detectImportKind, isImageFile } from "./detect";
export type { ImportKind } from "./detect";

export { downloadText, readFileAsDataUrl, readFileAsText } from "./download";
export type { DownloadResult } from "./download";

export {
  lookupStitch,
  normalizeToken,
  parseStitchFragment,
  sniffCraft,
} from "./vocabulary";
export type { CountedStitch, SymbolLookup } from "./vocabulary";
