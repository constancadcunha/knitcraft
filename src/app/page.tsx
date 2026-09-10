import type { Metadata } from "next";
import Link from "next/link";
import { GarmentIcon } from "@/components/GarmentIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Bits";
import {
  buildSamplerGrid,
  SAMPLER_PALETTE,
  SAMPLER_WIDTH,
} from "@/lib/demo/sampler";

export const metadata: Metadata = {
  title: "StitchCraft Studio — knitting & crochet pattern builder",
};

const ACTIONS = [
  {
    href: "/generate",
    label: "Pattern Studio",
    detail: "Describe a garment and get real gauge maths, sized to fit.",
    accent: "bg-berry",
  },
  {
    href: "/chart-editor",
    label: "Chart Editor",
    detail: "Colourwork, cables, lace and texture on one grid.",
    accent: "bg-cobalt",
  },
  {
    href: "/learn",
    label: "Stitch Library",
    detail: "Every stitch drawn, not photographed badly.",
    accent: "bg-fern",
  },
  {
    href: "/saved",
    label: "My Library",
    detail: "Your projects, saved in this browser.",
    accent: "bg-grape",
  },
] as const;

const PROMISES = [
  {
    title: "The numbers add up",
    body: "Stitch counts come from your measurements, ease and gauge — with a running count on every row, so you always know if you have gone wrong.",
  },
  {
    title: "Counts out loud",
    body: "Say “one” to tally a stitch, “next row” to advance, “where am I” to hear your place. Your hands never leave the needles.",
  },
  {
    title: "Stays on your machine",
    body: "Every project lives in this browser. No account, no upload, nothing sent anywhere.",
  },
];

const GARMENTS = [
  { type: "Cardigan", text: "Back, fronts, bands and sleeves, sized together." },
  { type: "Sweater", text: "Set-in, raglan or yoke — each shapes differently." },
  { type: "Gloves", text: "Thumb gussets and finger divisions, worked out for you." },
];

export default function HomePage() {
  const grid = buildSamplerGrid();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* ---- hero ---------------------------------------------------- */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center">
        <div>
          <Tag tone="gold">Knit &amp; crochet</Tag>
          <h1 className="mt-4 font-display text-2xl leading-[1.6] text-ink sm:text-[28px] sm:leading-[1.6]">
            A chart is
            <br />
            <span className="text-berry">pixel art</span>
            <br />
            you can wear.
          </h1>
          <p className="mt-5 max-w-md text-base text-ink-soft">
            Design the chart, let the maths size it to a real body, then work it
            row by row — counting out loud, hands free.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/generate" size="lg">
              Start a pattern
            </ButtonLink>
            <ButtonLink href="/chart-editor" variant="secondary" size="lg">
              Open the grid
            </ButtonLink>
          </div>
        </div>

        {/* ---- chart sampler ------------------------------------------ */}
        <figure className="panel">
          <figcaption className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-gold px-4 py-2.5">
            <span className="label">Fair Isle sampler</span>
            <span className="label text-ink/70">row 1 at the bottom</span>
          </figcaption>
          <div className="bg-panel p-3">
            <div
              className="grid gap-0 border-[3px] border-ink"
              style={{
                gridTemplateColumns: `repeat(${SAMPLER_WIDTH}, minmax(0, 1fr))`,
              }}
              role="img"
              aria-label="A knitting chart showing two Nordic star motifs above a row of diamonds"
            >
              {grid.flatMap((row, y) =>
                row.map((cell, x) => (
                  <span
                    key={`${y}-${x}`}
                    className="aspect-square"
                    style={{ backgroundColor: SAMPLER_PALETTE[cell] }}
                  />
                ))
              )}
            </div>
          </div>
        </figure>
      </section>

      {/* ---- what it actually does ----------------------------------- */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {PROMISES.map((p) => (
          <Panel key={p.title} title={p.title} accent="cobalt">
            <p className="text-sm text-ink-soft">{p.body}</p>
          </Panel>
        ))}
      </section>

      {/* ---- entry points -------------------------------------------- */}
      <section className="mt-14">
        <h2 className="label mb-4 text-ink-faint">Where to start</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACTIONS.map(({ href, label, detail, accent }) => (
            <Link
              key={href}
              href={href}
              className="panel lift flex items-center gap-4 p-4"
            >
              <span
                className={`${accent} h-11 w-11 shrink-0 border-[3px] border-ink`}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="label block text-ink">{label}</span>
                <span className="mt-1 block text-sm text-ink-soft">{detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- garments ------------------------------------------------ */}
      <section className="mt-14">
        <h2 className="label mb-4 text-ink-faint">Built to fit</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {GARMENTS.map((item) => (
            <div key={item.type} className="panel flex items-center gap-3 p-4">
              <GarmentIcon type={item.type} active className="h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <h3 className="label text-ink">{item.type}</h3>
                <p className="mt-1 text-sm text-ink-soft">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
