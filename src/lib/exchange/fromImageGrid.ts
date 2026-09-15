/**
 * A chart photographed or screenshotted, turned into a tracker-ready project.
 *
 * The pixel work is already done and already tested: `src/lib/imageChart.ts`
 * quantises the picture to a grid of palette indices (canvas, so it only runs
 * in the browser) and `src/lib/motif/chartFromImage` reduces each row to a
 * number of colours that can actually be carried across the back of the work.
 * This file only joins the two to the project model, so there is exactly one
 * implementation of "photo to chart" in the app.
 */

import { chartFromImage, type ImportedGrid } from "@/lib/motif";
import { generateId } from "@/lib/id";
import type { ProjectSource, YarnCraft, YarnProject } from "@/types";
import { projectFromSymbolChart, type ImportToProjectOptions } from "./toProject";

export interface ImageImportResult {
  project: YarnProject;
  /** Rows whose colour count had to be reduced to make them workable. */
  rowsReduced: number;
  note?: string;
}

export function projectFromImportedGrid(
  imported: ImportedGrid,
  options: Omit<ImportToProjectOptions, "source"> & {
    source: ProjectSource;
    craft: YarnCraft;
    /** Colours carried in one row. 2 is stranded tradition; Infinity is intarsia. */
    maxColoursPerRow?: number;
  },
): ImageImportResult {
  const result = chartFromImage(imported, {
    id: generateId(),
    name: options.name,
    craft: options.craft,
    maxColoursPerRow: options.maxColoursPerRow,
  });

  return {
    project: projectFromSymbolChart(result.chart, options),
    rowsReduced: result.rowsReduced,
    note: result.note,
  };
}
