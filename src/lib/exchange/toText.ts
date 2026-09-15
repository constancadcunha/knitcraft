/**
 * A pattern as readable plain text, for printing.
 *
 * Plain text rather than PDF or HTML because of where it is used: propped
 * against a lamp, marked up with a pencil, emailed to the person knitting the
 * other sleeve. It has to survive being pasted anywhere, so it is 72 columns of
 * ASCII with no markup at all.
 *
 * The instructions come from `chartToInstructions` via the project's stored
 * pattern, never from a second templater here — chart and prose must stay the
 * same artefact.
 */

import {
  buildLegend,
  chartToInstructions,
  type SymbolChart,
} from "@/lib/chart";
import { chartGeometry } from "@/lib/project/geometry";
import {
  CRAFT_LABELS,
  isCrossStitchChart,
  isYarnProject,
  type Project,
} from "@/types";

const WIDTH = 72;

function rule(char = "="): string {
  return char.repeat(WIDTH);
}

function heading(text: string): string[] {
  return [text.toUpperCase(), rule("-")];
}

/** Hard-wrap prose so the text prints the same everywhere. */
function wrap(text: string, indent = ""): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = indent;
  for (const word of words) {
    if (line.trim() && line.length + word.length + 1 > WIDTH) {
      lines.push(line);
      line = indent;
    }
    line += (line.trim() ? " " : "") + word;
  }
  if (line.trim()) lines.push(line);
  return lines;
}

/**
 * One project as printable text.
 *
 * Falls back to generating instructions straight from the charts when the
 * project has no written pattern — an imported chart has stitches to work long
 * before anybody has filled in a materials list.
 */
export function projectToText(project: Project, now = new Date().toISOString()): string {
  const lines: string[] = [];

  lines.push(rule());
  lines.push(project.name.toUpperCase());
  lines.push(rule());
  lines.push("");
  lines.push(
    `${CRAFT_LABELS[project.craftType]} · ${project.garmentType} · size ${project.size} · ${project.difficulty}`,
  );

  if (isYarnProject(project)) {
    const { gauge, toolMm, worked } = project.settings;
    lines.push(
      `Gauge: ${gauge.stitchesPer10cm} sts and ${gauge.rowsPer10cm} rows to 10 cm${gauge.measuredOver ? ` in ${gauge.measuredOver}` : ""}.`,
    );
    lines.push(
      `${project.craftType === "crocheting" ? "Hook" : "Needles"}: ${toolMm} mm. Worked ${worked === "round" ? "in the round" : "flat"}.`,
    );
  } else {
    const { fabric, strands } = project.settings;
    lines.push(
      `Fabric: ${fabric.kind} ${fabric.count}${fabric.kind === "evenweave" ? ` over ${fabric.over}` : ""}. ${strands} strands.`,
    );
  }

  if (project.notes.trim()) {
    lines.push("");
    lines.push(...heading("Notes"));
    lines.push(...wrap(project.notes));
  }

  const pattern = project.pattern;

  if (pattern) {
    const { yarns, needles, notions, floss } = pattern.materials;
    if (yarns.length || needles.length || notions.length || floss?.length) {
      lines.push("");
      lines.push(...heading("Materials"));
      for (const yarn of yarns) {
        lines.push(
          `  ${yarn.role}: ${yarn.yarn.name ?? "yarn"} — ${Math.ceil(yarn.balls)} ball(s), about ${Math.round(yarn.metres)} m`,
        );
      }
      for (const needle of needles) {
        lines.push(`  ${needle.mm} mm ${needle.kind}${needle.use ? ` — ${needle.use}` : ""}`);
      }
      for (const skein of floss ?? []) {
        lines.push(
          `  ${skein.floss.brand} ${skein.floss.code} ${skein.floss.name} — ${Math.ceil(skein.skeins)} skein(s)`,
        );
      }
      for (const notion of notions) lines.push(`  ${notion}`);
    }

    if (pattern.abbreviations.length) {
      lines.push("");
      lines.push(...heading("Abbreviations"));
      for (const entry of pattern.abbreviations) {
        lines.push(...wrap(`${entry.abbr} — ${entry.meaning}`, ""));
      }
    }

    for (const section of pattern.sections) {
      lines.push("");
      lines.push(...heading(section.name));
      if (section.description.trim()) {
        lines.push(...wrap(section.description));
        lines.push("");
      }
      for (const instruction of section.instructions) lines.push(...wrap(instruction.text));
    }
  }

  // Charts the written pattern does not already cover still need their rows in
  // print, or an imported chart exports as a title page and nothing else.
  const covered = new Set((pattern?.sections ?? []).map((section) => section.chartId).filter(Boolean));
  for (const saved of project.charts) {
    if (covered.has(saved.id)) continue;
    lines.push("");
    lines.push(...heading(saved.name));
    lines.push(...chartLines(saved.chart));
  }

  lines.push("");
  lines.push(rule());
  lines.push(`Exported from StitchCraft Studio on ${now.slice(0, 10)}.`);
  lines.push("Projects live in the browser only; this file is the copy you keep.");

  return `${lines.join("\n")}\n`;
}

function chartLines(chart: Project["charts"][number]["chart"]): string[] {
  if (isCrossStitchChart(chart)) {
    const geometry = chartGeometry(chart);
    return [
      `${chart.width} x ${chart.height} stitches, ${geometry.totalStitches} to work.`,
      ...chart.palette.map(
        (floss) => `  ${floss.symbol}  ${floss.brand} ${floss.code} ${floss.name}`,
      ),
    ];
  }

  const symbolChart = chart as SymbolChart;
  const instructions = chartToInstructions(symbolChart);
  const legend = buildLegend(symbolChart);
  return [
    ...wrap(instructions.castOnText),
    "",
    ...instructions.rows.flatMap((row) => wrap(row.text)),
    "",
    "Legend:",
    ...legend.symbols.map((entry) => `  ${entry.abbreviation} — ${entry.label}`),
  ];
}

/**
 * Every project in one text file. Used by "export everything" so a maker can
 * print their whole library, and so a plain-text backup is readable even if
 * this app stops existing.
 */
export function libraryToText(projects: readonly Project[], now?: string): string {
  if (projects.length === 0) return "No projects.\n";
  return projects.map((project) => projectToText(project, now)).join(`\n${rule("#")}\n\n`);
}

/** A safe, recognisable file name stem. Never empty, never a path. */
export function fileStem(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return slug || "stitchcraft-project";
}
