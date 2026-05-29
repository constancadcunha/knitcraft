"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, PlayCircle, ChevronDown, ChevronRight } from "lucide-react";
import { STITCH_LIBRARY } from "@/lib/craftKnowledge";
import type { CraftType } from "@/types";

// Fallback SVG data URL when image fails to load
function makeFallbackSvg(name: string, color: string): string {
  const safe = name.replace(/[<>&"]/g, " ");
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="144" viewBox="0 0 320 144">
      <rect width="320" height="144" fill="${color}"/>
      <rect x="12" y="12" width="296" height="120" rx="6" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
      <text x="160" y="72" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${safe}</text>
      <text x="160" y="100" font-family="Arial,sans-serif" font-size="11" fill="white" text-anchor="middle" opacity="0.8">tap Video for a tutorial</text>
    </svg>`
  )}`;
}

const FALLBACK_COLORS: Record<string, string> = {
  "knit": "#8b6347", "purl": "#6e88a8", "ribbing": "#6a9470",
  "garter": "#c9785c", "seed": "#9e7a8a", "cable": "#2e1f14",
  "stockinette": "#f26b5e", "yarn-over": "#2c7be5", "slipped-stitch": "#9e7a8a",
  "single-crochet": "#6a9470", "half-double-crochet": "#c9785c",
  "double-crochet": "#2c7be5", "crochet-ribbing": "#8b6347",
  "slip-stitch-crochet": "#8b6347", "treble-crochet": "#a45ee5",
  "crochet-moss": "#4fae68", "granny-square": "#6a9470", "shell-stitch": "#f26b5e",
};

const ESSENTIALS: Array<{ craftType: CraftType; title: string; detail: string; videoQuery: string }> = [
  { craftType: "knitting", title: "Cast on", detail: "Creates the very first row of live stitches on the needle. For flat garments start here at the bottom hem edge. Long-tail cast-on gives a neat elastic edge.", videoQuery: "beginner knitting long tail cast on" },
  { craftType: "knitting", title: "Bind off (cast off)", detail: "Finishes live stitches so the edge won't unravel. Use a loose bind-off or stretchy bind-off for necklines, cuffs, and collars.", videoQuery: "how to bind off knitting stretchy loose edge" },
  { craftType: "knitting", title: "Increase (m1, kfb)", detail: "Adds a stitch to widen fabric. Used for sleeves, raglans, and freehand shaping. M1L and M1R are nearly invisible. Kfb is easier and leaves a small bar.", videoQuery: "how to increase stitches knitting m1 kfb" },
  { craftType: "knitting", title: "Decrease (k2tog, ssk)", detail: "Removes stitches to shape armholes, necklines, sleeve caps, and crown shaping. K2tog leans right; SSK leans left. Pair them for a balanced look.", videoQuery: "how to decrease knitting k2tog ssk" },
  { craftType: "knitting", title: "Reading flat charts (right side rows)", detail: "Charts are read from the bottom up. Right-side (RS) rows are read right to left; a blank square usually means knit. Wrong-side (WS) rows are read left to right; a blank square usually means purl, so the public side stays smooth.", videoQuery: "how to read knitting charts right side wrong side flat" },
  { craftType: "knitting", title: "Chart reading (wrong side rows)", detail: "On wrong-side rows (left to right), symbols are worked as their reverse so the right-side fabric looks correct. A blank square = purl on WS; a dot/dash = knit on WS.", videoQuery: "how to read knitting chart wrong side" },
  { craftType: "knitting", title: "Blocking", detail: "Wet or steam blocking opens up the fabric, evens the stitches, and sets the final measurements. Block pieces before seaming so they match cleanly.", videoQuery: "how to block knitting wet blocking" },
  { craftType: "knitting", title: "Patch pockets", detail: "Work a small rectangle with a firm ribbed top edge, block it flat, then sew it to the fronts after trying the garment on. Buttonhole bands and pocket widths go in the pattern notes.", videoQuery: "how to knit patch pockets cardigan sew on" },
  { craftType: "knitting", title: "Mattress stitch seam", detail: "An invisible vertical seam for joining side seams and sleeve seams. Work one stitch in from each edge, picking up the bar between stitches alternately.", videoQuery: "how to mattress stitch knitting seam invisible" },
  { craftType: "knitting", title: "Picking up stitches", detail: "Used to start button bands, collars, and neckbands directly on the finished garment edge. Insert the needle through the edge, wrap yarn, pull through.", videoQuery: "how to pick up stitches knitting neckband" },
  { craftType: "crocheting", title: "Foundation chain", detail: "Crochet starts with a chain, not a cast-on. Chain loosely or go up a hook size so the first row doesn't pull in. Count chain stitches carefully before starting row 1.", videoQuery: "how to crochet foundation chain beginner loose" },
  { craftType: "crocheting", title: "Turning chain", detail: "Added at the start of each new row to reach the correct height. Chain 1 for sc, chain 2 for hdc, chain 3 for dc. Count it as a stitch only when the pattern says to.", videoQuery: "crochet turning chain sc hdc dc height" },
  { craftType: "crocheting", title: "Fasten off", detail: "Cuts the yarn and locks the final loop. Cut yarn leaving a 6-inch tail, pull tail through the last loop on the hook, tighten gently, then weave into the nearby stitches.", videoQuery: "how to fasten off crochet weave in ends" },
  { craftType: "crocheting", title: "Increase", detail: "Work two or more stitches into the same stitch or chain space to widen the fabric. Used for sleeves, shawls, circles, granny squares, and freehand shaping.", videoQuery: "how to increase crochet stitches beginner" },
  { craftType: "crocheting", title: "Decrease (sc2tog, dc2tog)", detail: "Combines two stitches into one to narrow fabric. Used for armholes, necklines, sleeve caps, hat crowns, and toe shaping.", videoQuery: "how to decrease crochet sc2tog dc2tog" },
  { craftType: "crocheting", title: "Reading crochet charts", detail: "Crochet symbol charts use pictograms. Each row reads right to left on RS rows, left to right on WS. Common symbols: circle = chain, x or + = single crochet, T = double crochet.", videoQuery: "how to read crochet chart symbols beginner" },
  { craftType: "crocheting", title: "Working in the round", detail: "Start with a magic ring or short foundation chain joined into a ring. Each round builds on the last. Do not turn; the RS usually faces you.", videoQuery: "how to crochet in the round magic ring" },
  { craftType: "crocheting", title: "Seaming crochet pieces", detail: "Slip-stitch seam: hold pieces with RS together, insert hook through both edges, slip stitch across. Mattress stitch also works for an invisible flat join.", videoQuery: "how to seam crochet pieces slip stitch mattress" },
];

const CHART_READING_NOTES = [
  {
    craftType: "knitting" as CraftType,
    title: "Flat knitting chart direction",
    body: "Charts show the right side of the fabric. Row 1 (bottom of chart) is usually a RS row and is read right to left. Row 2 (WS) is read left to right. Always check the pattern notes; some designers use the opposite convention.",
  },
  {
    craftType: "knitting" as CraftType,
    title: "Symbol meanings",
    body: "Blank/empty square = knit on RS, purl on WS. Dot or dash = purl on RS, knit on WS. A diagonal slash or crossed box = decrease. A circle or 'o' = yarn over (increase). The pattern key always overrides general convention.",
  },
  {
    craftType: "crocheting" as CraftType,
    title: "Crochet symbol charts",
    body: "Each symbol represents a complete stitch: circle = chain; x or + = sc; T-shape = dc; inverted T = hdc. Arrows show the working direction. Charts are usually read bottom to top, right to left on RS rows.",
  },
];

export default function LearnPage() {
  const [activeCraft, setActiveCraft] = useState<CraftType>("knitting");

  return (
    <div className="min-h-screen px-4 py-8 overflow-x-hidden">
      <div className="mx-auto max-w-5xl w-full">
        <header className="mb-6 comic-panel px-5 py-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="icon-slate grid h-12 w-12 place-items-center rounded-xl shrink-0">
              <BookOpen size={22} color="white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-black text-[#251a1c]" style={{ fontFamily: "var(--font-lora), serif" }}>
                Stitch Dictionary
              </h1>
              <p className="text-sm text-[#6b5d52]">
                Everything knitting &amp; crochet - stitches, chart reading, techniques, and YouTube tutorials.
              </p>
            </div>
          </div>
        </header>

        {/* Craft switcher */}
        <div className="flex gap-2 mb-6">
          {(["knitting", "crocheting"] as CraftType[]).map((ct) => (
            <button
              key={ct}
              onClick={() => setActiveCraft(ct)}
              className={`px-5 py-2.5 rounded-xl border-2 font-black text-sm transition-all ${
                activeCraft === ct
                  ? "bg-[#251a1c] border-[#251a1c] text-[#ffd166]"
                  : "bg-[#fffaf0] border-[#e8ddd0] text-[#251a1c] hover:border-[#251a1c]"
              }`}
            >
              {ct === "knitting" ? "Knitting" : "Crochet"}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {/* Stitches grid */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[#251a1c]" style={{ fontFamily: "var(--font-lora), serif" }}>
              {activeCraft === "knitting" ? "Knitting stitches" : "Crochet stitches"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STITCH_LIBRARY.filter((s) => s.craftType === activeCraft).map((stitch) => (
                <StitchCard key={stitch.id} stitch={stitch} />
              ))}
            </div>
          </section>

          {/* Chart reading notes */}
          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#251a1c]" style={{ fontFamily: "var(--font-lora), serif" }}>
              Reading charts ({activeCraft === "knitting" ? "knitting" : "crochet"})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHART_READING_NOTES.filter((n) => n.craftType === activeCraft).map((note) => (
                <div key={note.title} className="comic-panel bg-[#fff0bf] p-4">
                  <h3 className="font-black text-sm text-[#251a1c] mb-2">{note.title}</h3>
                  <p className="text-xs leading-relaxed text-[#4a3a30]">{note.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Essential techniques */}
          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#251a1c]" style={{ fontFamily: "var(--font-lora), serif" }}>
              Essential techniques - {activeCraft === "knitting" ? "knitting" : "crochet"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ESSENTIALS.filter((e) => e.craftType === activeCraft).map((item) => (
                <article key={item.title} className="comic-panel bg-[#fffaf0] p-4">
                  <h3 className="mb-1 text-sm font-black text-[#251a1c]">{item.title}</h3>
                  <p className="mb-3 text-xs leading-relaxed text-[#6b5d52]">{item.detail}</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.videoQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black text-[#251a1c]"
                  >
                    <PlayCircle size={13} /> Tutorial
                  </a>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StitchCard({ stitch }: { stitch: typeof STITCH_LIBRARY[0] }) {
  const [imgSrc, setImgSrc] = useState(stitch.imageUrl);
  const [open, setOpen] = useState(false);
  const fallback = makeFallbackSvg(stitch.name, FALLBACK_COLORS[stitch.id] ?? "#8b6347");

  return (
    <article className="comic-panel overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={stitch.name}
        className="h-36 w-full object-contain bg-white p-3"
        onError={() => setImgSrc(fallback)}
        loading="lazy"
      />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-black text-[#251a1c] leading-tight">{stitch.name}</h3>
          <span className="shrink-0 rounded-md border-2 border-[#251a1c] bg-[#fff0bf] px-2 py-0.5 text-xs font-black">
            {stitch.abbreviation}
          </span>
        </div>

        <p className="mb-1 text-xs text-[#8b6347]">
          <strong>Looks like:</strong> {stitch.appearance}
        </p>
        <p className="mb-2 text-xs text-[#8b6347]">
          <strong>Use for:</strong> {stitch.useFor}
        </p>

        {/* Expandable how-to */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] font-black text-[#6a9470] mb-2"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} How to work it
        </button>
        {open && (
          <div className="mb-3 space-y-2 bg-[#f5ede0] rounded-lg p-2 border border-[#e8ddd0]">
            <p className="text-xs leading-relaxed text-[#6b5d52]">{stitch.tutorial}</p>
            {stitch.tutorialImages?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {stitch.tutorialImages.slice(0, 4).map((src, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${stitch.id}-tutorial-${index}`}
                    src={src}
                    alt={`${stitch.name} tutorial step ${index + 1}`}
                    className="h-24 w-full rounded-md border border-[#e8ddd0] bg-white object-contain p-1"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(stitch.videoQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black text-[#251a1c]"
          >
            <PlayCircle size={13} /> Video
          </a>
          <a
            href={stitch.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#251a1c]"
          >
            <ExternalLink size={13} /> Source
          </a>
        </div>
      </div>
    </article>
  );
}
