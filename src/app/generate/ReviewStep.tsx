"use client";

import Link from "next/link";
import ChartView from "@/components/chart/ChartView";
import SymbolGlyph from "@/components/chart/SymbolGlyph";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Bits";
import { getSymbol, type SymbolChart } from "@/lib/chart";
import type { DraftedPiece, GarmentDraft } from "@/lib/garments";
import type { Pattern } from "@/types";
import { describeTool, type EstimatedGauge } from "./needleGauge";
import { lessonHref, stitchesToLearn } from "./stitchLessons";
import type { YarnCraft } from "@/types";

export interface ReviewData {
  craft: YarnCraft;
  garmentLabel: string;
  sizeLabel: string;
  difficulty: string;
  fitLabel: string;
  startingPoint: string;
  designLine: string;
  gauge: { stitchesPer10cm: number; rowsPer10cm: number };
  gaugeFromSwatch: boolean;
  toolMm: number;
  estimate: EstimatedGauge;
  pieces: DraftedPiece[];
  draft: GarmentDraft;
  pattern: Pattern;
  /** Anything the chart maker had to compromise on, shown rather than hidden. */
  notes: string[];
}

/**
 * The last step: what you are about to be handed.
 *
 * It carries the two lists the user said were missing — "the material you need,
 * the stitches you may need to learn etc but that is SO needed and necessary".
 * Both are derived from the draft that is about to be saved, so neither can
 * describe a different pattern than the one you get.
 */
export default function ReviewStep({ data }: { data: ReviewData }) {
  const charts: SymbolChart[] = data.pieces.map((piece) => piece.chart);
  const stitches = stitchesToLearn(charts, data.craft);
  const yarn = data.pattern.materials.yarns[0];

  const rows: Array<[string, string]> = [
    ["Starting point", data.startingPoint],
    ["Craft", data.craft === "knitting" ? "Knitting" : "Crochet"],
    ["Garment", data.garmentLabel],
    ["Size", data.sizeLabel],
    ["Fit", data.fitLabel],
    [
      "Gauge",
      `${data.gauge.stitchesPer10cm} sts × ${data.gauge.rowsPer10cm} rows / 10 cm${
        data.gaugeFromSwatch ? " (your swatch)" : " (estimated)"
      }`,
    ],
    ["Skill", data.difficulty],
    ["Design", data.designLine],
  ];

  return (
    <div className="space-y-6">
      <div className="mb-5">
        <h2 className="font-ui text-lg uppercase text-ink">Check it over</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Save it to your library, or save it and start working straight away.
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-b-[3px] border-ink/10 pb-1.5"
          >
            <dt className="label text-ink-faint">{label}</dt>
            <dd className="text-right text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {(data.notes.length > 0 || data.draft.warnings.length > 0) && (
        <ul className="space-y-1.5">
          {[...data.notes, ...data.draft.warnings].map((note) => (
            <li key={note} className="text-sm text-rust">
              {note}
            </li>
          ))}
        </ul>
      )}

      <Panel title="What you'll need" accent="gold">
        <ul className="space-y-3">
          {yarn && (
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="label text-ink">{yarn.yarn.name}</span>
              <span className="text-sm text-ink-soft">
                about {yarn.metres} m — {yarn.balls} ball{yarn.balls === 1 ? "" : "s"} of{" "}
                {yarn.yarn.gramsPerBall} g
              </span>
            </li>
          )}
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="label text-ink">
              {data.craft === "knitting" ? "Needles" : "Hook"}
            </span>
            <span className="text-sm text-ink-soft">{describeTool(data.toolMm, data.craft)}</span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="label text-ink">Notions</span>
            <span className="text-sm text-ink-soft">{notionsFor(data).join(", ")}</span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="label text-ink">Time</span>
            <span className="text-sm text-ink-soft">{data.pattern.estimatedTime}</span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          The yarn amount comes from the area of every piece at your gauge, plus the usual
          allowance. Buy the balls in one dye lot.
        </p>
      </Panel>

      <Panel title="Stitches you'll need" accent="cobalt">
        {stitches.length === 0 ? (
          <p className="text-sm text-ink-soft">
            This pattern uses only plain fabric — there is nothing new to learn first.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {stitches.map((stitch) => {
              const symbol = getSymbol(stitch.symbolId);
              return (
                <li
                  key={stitch.symbolId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-[3px] border-ink bg-panel p-3"
                >
                  {symbol && (
                    <span className="shrink-0 border-2 border-ink bg-paper p-1" aria-hidden>
                      <SymbolGlyph symbol={symbol} size={20} />
                    </span>
                  )}
                  <span className="label text-ink">{stitch.name}</span>
                  <span className="text-sm text-ink-soft">{stitch.instruction}</span>
                  <span className="ml-auto">
                    {stitch.lesson ? (
                      <Link
                        href={lessonHref(stitch.lesson)}
                        className="press inline-flex min-h-9 items-center bg-panel px-3 py-2 text-sm text-ink hover:bg-gold"
                      >
                        Learn {stitch.abbreviation} →
                      </Link>
                    ) : (
                      <Tag tone="neutral">{stitch.abbreviation}</Tag>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div>
        <h3 className="label mb-2 text-ink-faint">
          {data.pieces.length} piece{data.pieces.length === 1 ? "" : "s"}
        </h3>
        <ul className="space-y-2">
          {data.pieces.map((piece) => (
            <li
              key={piece.chart.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-[3px] border-ink bg-panel p-3"
            >
              <span className="label text-ink">{piece.panel.name}</span>
              <span className="text-sm text-ink-soft">
                {piece.panel.stitches} sts × {piece.panel.rows} rows ·{" "}
                {piece.panel.widthCm.toFixed(1)} × {piece.panel.heightCm.toFixed(1)} cm
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.pieces[0] && (
        <Panel title={`Preview — ${data.pieces[0].panel.name}`} accent="fern">
          <div className="overflow-x-auto">
            <ChartView chart={data.pieces[0].chart} cellSize={14} showRowNumbers={false} />
          </div>
        </Panel>
      )}
    </div>
  );
}

/**
 * The notions a make actually needs, worked out from its own pieces.
 *
 * `assemblePattern` leaves this list empty because the engine has no opinion
 * about haberdashery; the wizard does, and it can be honest about it: more than
 * one piece means seaming, and a piece worked in the round means markers.
 */
function notionsFor(data: ReviewData): string[] {
  const notions = ["tapestry needle", "scissors"];
  if (data.pieces.length > 1) notions.push("stitch markers for seaming");
  if (data.pieces.some((p) => p.panel.worked === "round")) notions.push("a stitch marker for the round");
  if (data.pattern.garmentType === "Cardigan") notions.push("buttons, if you want them");
  return notions;
}
