import type { Metadata } from "next";
import Link from "next/link";
import { GarmentIcon } from "@/components/GarmentIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading, Tag } from "@/components/ui/Bits";
import {
  buildSamplerGrid,
  SAMPLER_PALETTE,
  SAMPLER_WIDTH,
} from "@/lib/demo/sampler";

export const metadata: Metadata = {
  title: "StitchCraft Studio — knitting & crochet pattern builder",
};

/** The three steps, in the order a project actually happens. */
const STEPS = [
  {
    href: "/generate",
    label: "Draft it",
    detail:
      "Say what you are making and which size. Every stitch count comes out of your own gauge swatch.",
    accent: "bg-berry text-panel",
  },
  {
    href: "/chart-editor",
    label: "Draw it",
    detail:
      "The grid arrives already the right shape. Put colourwork, cables, lace or texture on it.",
    accent: "bg-cobalt text-panel",
  },
  {
    href: "/saved",
    label: "Work it",
    detail:
      "Count row by row with the tracker — out loud if your hands are busy, which they are.",
    accent: "bg-fern text-panel",
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
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-12">
        <div>
          <Tag tone="gold">Knit &amp; crochet</Tag>
          <h1 className="mt-5 font-display text-2xl leading-[1.6] text-ink sm:text-[28px] sm:leading-[1.6]">
            A chart is
            <br />
            <span className="text-berry">pixel art</span>
            <br />
            you can wear.
          </h1>
          <p className="mt-6 max-w-md text-base text-ink-soft">
            Design the chart, let the maths size it to a real body, then work it
            row by row — counting out loud, hands free.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/generate" size="lg">
              Start a pattern
            </ButtonLink>
            <ButtonLink href="/chart-editor" variant="secondary" size="lg">
              Open the grid
            </ButtonLink>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-tiny text-ink-faint">
            <span className="inline-block h-2 w-2 bg-fern" aria-hidden />
            No account. No upload. Works offline once loaded.
          </p>
        </div>

        {/* ---- chart sampler ------------------------------------------ */}
        <figure className="panel">
          <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink bg-gold px-4 py-3">
            <span className="label">Fair Isle sampler</span>
            <span className="label text-ink/70">row 1 at the bottom</span>
          </figcaption>
          <div className="bg-panel p-4">
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

      {/* ---- how it goes --------------------------------------------- */}
      <section className="mt-16">
        <SectionHeading count="Three steps">How a project goes</SectionHeading>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="panel lift flex h-full flex-col gap-3 p-5"
              >
                <span className="flex items-center gap-3">
                  {/* The step number is the sprite: square, outlined, filled. */}
                  <span
                    className={`label flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-ink text-[13px] ${step.accent}`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="label text-ink">{step.label}</span>
                </span>
                <span className="text-sm text-ink-soft">{step.detail}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- what it actually does ----------------------------------- */}
      <section className="mt-16">
        <SectionHeading>Why bother with this one</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <Panel key={p.title} title={p.title} accent="cobalt" headingAs="h3">
              <p className="text-sm text-ink-soft">{p.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ---- garments ------------------------------------------------ */}
      <section className="mt-16">
        <SectionHeading count="18 garment kinds">Built to fit</SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-3">
          {GARMENTS.map((item) => (
            <li key={item.type} className="panel flex items-center gap-4 p-5">
              <GarmentIcon type={item.type} active className="h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <h3 className="label text-ink">{item.type}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-ink-soft">
          <Link
            href="/generate"
            className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-berry"
          >
            See every garment the drafter knows →
          </Link>
        </p>
      </section>
    </div>
  );
}
