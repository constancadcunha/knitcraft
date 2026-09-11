import { describe, expect, it } from "vitest";
import { draftGarment } from "@/lib/garments";
import { applyMotif } from "@/lib/motif";
import { createProject, createSavedChart } from "../factory";
import { createChartProgress, increment, trackerView, undo } from "../progress";
import { chartGeometry } from "../geometry";
import { loadProjects, saveProject, type StorageLike } from "../persistence";
import { chartToInstructions } from "@/lib/chart";
import type { Project } from "@/types";

/** An in-memory localStorage, so the test exercises the real persistence path. */
function fakeStorage(): StorageLike & { size: () => number } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    size: () => map.size,
  };
}

/** The whole user journey, in the order the app performs it. */
function makeProject(): Project {
  const draft = draftGarment({
    garment: "Hat",
    craft: "knitting",
    size: "M",
    gauge: { stitchesPer10cm: 20, rowsPer10cm: 28 },
  });

  const charts = draft.pieces.map((piece, i) => {
    const { chart } = applyMotif(piece.chart, {
      kind: "colourwork",
      palette: ["#fffdf6", "#e2483d"],
      seed: "Emberwood",
    });
    return createSavedChart({ chart, name: piece.panel.name, piece: piece.panel.name, order: i });
  });

  const base = createProject({
    name: "Emberwood Hat",
    craftType: "knitting",
    garmentType: "Hat",
    size: "M",
  });

  return {
    ...base,
    charts,
    progress: {
      ...base.progress,
      activeChartId: charts[0].id,
      charts: Object.fromEntries(charts.map((c) => [c.id, createChartProgress(c.id)])),
    },
  } as Project;
}

describe("a project survives the whole journey", () => {
  it("drafts, saves, reloads, and still tracks", () => {
    const storage = fakeStorage();
    const project = makeProject();

    expect(project.charts.length).toBeGreaterThan(0);

    const saved = saveProject(storage, project, [project.id]);
    expect(saved.ok, JSON.stringify(saved)).toBe(true);

    // Reload exactly as a returning visitor would.
    const loaded = loadProjects(storage);
    expect(loaded.discarded).toBe(false);
    expect(loaded.projects).toHaveLength(1);

    const back = loaded.projects[0];
    expect(back.name).toBe("Emberwood Hat");
    expect(back.charts).toHaveLength(project.charts.length);
    // The motif's colours must survive the round trip. A ProjectChart may be
    // either kind, so narrow before reaching for a yarn chart's palette.
    const reloaded = back.charts[0].chart;
    if (reloaded.craft === "cross-stitch") throw new Error("expected a yarn chart");
    expect(reloaded.colors).toContain("#e2483d");
  });

  it("counts stitches through the reloaded project, and undoes them", () => {
    const storage = fakeStorage();
    const project = makeProject();
    saveProject(storage, project, [project.id]);

    const back = loadProjects(storage).projects[0];
    const saved = back.charts[0];
    const geometry = chartGeometry(saved.chart);
    let progress = back.progress.charts[saved.id];
    expect(progress).toBeDefined();

    const before = trackerView(geometry, progress);
    expect(before.stitchesDone).toBe(0);
    expect(before.stitchesInRow).toBeGreaterThan(0);

    progress = increment(geometry, progress, 5);
    expect(trackerView(geometry, progress).stitchesDone).toBe(5);

    progress = undo(progress);
    expect(trackerView(geometry, progress).stitchesDone).toBe(0);
  });

  it("produces written instructions with running stitch counts", () => {
    const project = makeProject();
    const chart = project.charts[0].chart;
    if (chart.craft === "cross-stitch") throw new Error("expected a yarn chart");

    const instructions = chartToInstructions(chart);
    expect(instructions.castOn).toBeGreaterThan(0);
    expect(instructions.rows.length).toBe(chart.height);
    for (const row of instructions.rows) {
      expect(row.text).toBeTruthy();
      expect(row.stitchesAfter).toBeGreaterThan(0);
    }
  });

  it("a returning visitor with unreadable data gets an empty app, not a crash", () => {
    const storage = fakeStorage();
    storage.setItem("stitchcraft.index", "{{{ not json");
    storage.setItem("kc_charts", '[{"legacy":true}]');

    const loaded = loadProjects(storage);
    expect(loaded.projects).toEqual([]);
    expect(loaded.discarded).toBe(true);
    expect(loaded.discardedReason).toBeTruthy();
  });

  it("reports a failed write instead of losing the project silently", () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const error = new Error("quota");
        error.name = "QuotaExceededError";
        throw error;
      },
      removeItem: () => {},
      key: () => null,
      length: 0,
    };
    const result = saveProject(failing, makeProject(), ["x"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("quota");
  });
});
