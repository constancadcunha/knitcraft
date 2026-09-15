/**
 * What did the maker just hand us?
 *
 * The import UI takes one box and one file picker rather than four, so this
 * decides which importer the content belongs to. Sniffing beats asking here:
 * somebody pasting a chart out of a spreadsheet should not first have to know
 * whether the app calls it "CSV" or "a symbol grid".
 *
 * Order matters. An export file announces itself, so it is checked first and
 * never re-read as prose. After that a block of rows that all start "Row N:" is
 * a written pattern, and anything else that looks like a table of short cells
 * is a grid.
 */

import { EXCHANGE_FORMAT } from "./envelope";

export type ImportKind = "export-file" | "pattern-text" | "grid" | "unknown";

/** "Row 3 (RS):", "Rnd 12:", "Rows 2-8:". Loose on purpose. */
const ROW_LIKE = /^\s*(rows?|rnds?|rounds?|r)\s*\d+[^:]{0,24}[:.]/i;

export function detectImportKind(text: string): ImportKind {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";

  if (trimmed.startsWith("{") && trimmed.includes(EXCHANGE_FORMAT)) return "export-file";

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "unknown";

  const rowLines = lines.filter((line) => ROW_LIKE.test(line)).length;
  if (rowLines >= 1 && rowLines * 3 >= lines.length) return "pattern-text";

  // A grid is many lines of the same shape, made of short cells. Prose is not:
  // it has long lines and sentences.
  const delimited = lines.filter((line) => /[,;\t]/.test(line)).length;
  const shortCells = lines.filter((line) => {
    const cells = line.split(/[,;\t]|\s{2,}/).filter(Boolean);
    return cells.length >= 2 && cells.every((cell) => cell.trim().length <= 8);
  }).length;
  if (lines.length >= 2 && (delimited >= lines.length / 2 || shortCells >= lines.length / 2)) {
    return "grid";
  }

  // A block of equal-length lines with no spaces is a dense character grid.
  const dense = lines.every((line) => !/\s/.test(line) && line.length === lines[0].length);
  if (lines.length >= 2 && dense && lines[0].length >= 2) return "grid";

  if (rowLines > 0) return "pattern-text";
  return "unknown";
}

/** File extensions the import control offers. Images go through the canvas path. */
export const ACCEPTED_FILE_TYPES =
  ".json,.txt,.csv,.tsv,.md,.png,.jpg,.jpeg,.gif,.webp,image/*,text/plain,text/csv,application/json";

export function isImageFile(file: { name: string; type: string }): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.name);
}
