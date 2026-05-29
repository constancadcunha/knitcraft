"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, ExternalLink, PlayCircle, Bookmark, BookmarkCheck, X, ChevronRight,
} from "lucide-react";
import { STITCH_LIBRARY } from "@/lib/craftKnowledge";
import type { CraftType } from "@/types";

type Section = "all" | "stitches" | "charts" | "essentials" | "saved";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function learnId(value: string): string {
  return `learn-${slugify(value)}`;
}

function makeFallbackSvg(name: string, color: string): string {
  const safe = name.replace(/[<>&"]/g, " ");
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="144" viewBox="0 0 320 144">
      <rect width="320" height="144" fill="${color}"/>
      <rect x="12" y="12" width="296" height="120" rx="6" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
      <text x="160" y="72" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${safe}</text>
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

const CHART_READING_NOTES: Array<{ craftType: CraftType; title: string; body: string }> = [
  {
    craftType: "knitting",
    title: "Flat knitting chart direction",
    body: "Charts show the right side of the fabric. Row 1 (bottom of chart) is usually a RS row and is read right to left. Row 2 (WS) is read left to right. Always check the pattern notes; some designers use the opposite convention.",
  },
  {
    craftType: "knitting",
    title: "Symbol meanings",
    body: "Blank/empty square = knit on RS, purl on WS. Dot or dash = purl on RS, knit on WS. A diagonal slash or crossed box = decrease. A circle or 'o' = yarn over (increase). The pattern key always overrides general convention.",
  },
  {
    craftType: "knitting",
    title: "Repeat brackets",
    body: "Brackets [ ] or asterisks * mark a section you repeat across the row. The number after tells you how many times. When a chart shows a repeat box, that column of stitches tiles across the full row.",
  },
  {
    craftType: "knitting",
    title: "No-stitch cells",
    body: "Grey or shaded squares in a chart mean 'no stitch here'. They are filler to keep the grid rectangular when shaping changes the stitch count. Skip them; do not work a stitch into them.",
  },
  {
    craftType: "crocheting",
    title: "Crochet symbol charts",
    body: "Each symbol represents a complete stitch: circle = chain; x or + = sc; T-shape = dc; inverted T = hdc. Arrows show the working direction. Charts are usually read bottom to top, right to left on RS rows.",
  },
  {
    craftType: "crocheting",
    title: "Working in the round vs flat",
    body: "Round charts spiral outward from the centre. Read counter-clockwise, or as arrows show. Flat charts switch direction each row. A turning chain at the start of a row is usually shown outside the main chart grid.",
  },
  {
    craftType: "crocheting",
    title: "Chain spaces",
    body: "An arch or curved line between symbols represents a chain space (ch-sp). When the pattern says 'work into the ch-sp', insert your hook into the gap under the chain, not into individual chain stitches.",
  },
];

const ESSENTIALS: Array<{
  craftType: CraftType;
  title: string;
  detail: string;
  videoQuery: string;
  steps: string[];
}> = [
  {
    craftType: "knitting",
    title: "Cast on",
    detail: "Creates the very first row of live stitches on the needle. Long-tail cast-on gives a neat elastic edge. Start at the bottom hem edge for flat garments.",
    videoQuery: "beginner knitting long tail cast on",
    steps: [
      "Make a slip knot and place it on the needle. This is stitch 1.",
      "Long-tail: loop yarn over thumb and index finger, dip needle through the thumb loop, catch the index-finger strand, pull through and drop thumb loop.",
      "Repeat for each stitch. The cast-on edge becomes the hem of your garment.",
    ],
  },
  {
    craftType: "knitting",
    title: "Bind off (cast off)",
    detail: "Finishes live stitches so the edge won't unravel. Use a loose or stretchy bind-off for necklines and cuffs.",
    videoQuery: "how to bind off knitting stretchy loose edge",
    steps: [
      "Knit 2 stitches. Insert left needle tip through the first stitch on the right needle.",
      "Lift that stitch over the second stitch and off the needle. One stitch is now bound off.",
      "Knit 1 more stitch and repeat until 1 stitch remains. Cut yarn and pull tail through the last loop.",
    ],
  },
  {
    craftType: "knitting",
    title: "Reading flat charts",
    detail: "Charts show the right side of the fabric. RS rows are read right to left; WS rows left to right. A blank square = knit on RS, purl on WS.",
    videoQuery: "how to read knitting charts right side wrong side flat",
    steps: [
      "Start at bottom-right of chart. Row 1 (RS) reads right to left. Blank square = knit.",
      "Row 2 (WS) reads left to right. Blank square = purl on this row so the RS stays smooth.",
      "Work up the chart row by row. Each row number tells you which side you're on.",
    ],
  },
  {
    craftType: "knitting",
    title: "Gauge swatch",
    detail: "A small test square tells you whether your yarn, needles, and tension match the project counts.",
    videoQuery: "how to knit a gauge swatch measure stitches rows",
    steps: [
      "Cast on more stitches than the gauge width so the centre of the swatch is not distorted by edges.",
      "Work at least 4 in in the main stitch, then block the swatch the way you will block the project.",
      "Measure stitches and rows across the centre. If you have too many stitches per inch, use a larger needle; too few, use a smaller needle.",
    ],
  },
  {
    craftType: "knitting",
    title: "Blocking",
    detail: "Wet or steam blocking opens up the fabric, evens stitches, and sets final measurements. Block pieces before seaming.",
    videoQuery: "how to block knitting wet blocking",
    steps: [
      "Soak the finished piece in cool water for 15-20 minutes until fully saturated.",
      "Gently squeeze out water (don't wring). Roll in a towel to remove excess moisture.",
      "Pin to measurements on a foam mat or towel and leave to dry fully before removing pins.",
    ],
  },
  {
    craftType: "knitting",
    title: "Mattress stitch seam",
    detail: "An invisible vertical seam for joining side seams and sleeve seams. Work one stitch in from each edge.",
    videoQuery: "how to mattress stitch knitting seam invisible",
    steps: [
      "Lay pieces flat with RS facing up, edges touching. Thread a blunt tapestry needle.",
      "Pick up the bar between the 1st and 2nd stitch on one piece, then the matching bar on the other.",
      "Alternate sides every 2 bars, then pull gently to close. The seam vanishes into the fabric.",
    ],
  },
  {
    craftType: "knitting",
    title: "Picking up stitches",
    detail: "Used to start button bands, collars, and neckbands on the finished garment edge.",
    videoQuery: "how to pick up stitches knitting neckband",
    steps: [
      "Hold the garment with RS facing you. Insert needle through the edge from front to back.",
      "Wrap yarn around the needle and pull through to form a new stitch on the needle.",
      "Space stitches evenly. A common starting point is 3 stitches per 4 rows along a vertical edge.",
    ],
  },
  {
    craftType: "knitting",
    title: "Patch pockets",
    detail: "Work a small rectangle with a firm ribbed top edge, block it flat, then sew to the garment front.",
    videoQuery: "how to knit patch pockets cardigan sew on",
    steps: [
      "Knit a rectangle to the pocket dimensions with 4-6 rows of ribbing at the top edge.",
      "Block the pocket flat to match the fabric of the garment.",
      "Pin to position, try the garment on if possible, then sew with mattress stitch on 3 sides.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Foundation chain",
    detail: "Crochet starts with a chain. Chain loosely or go up a hook size so the first row doesn't pull in.",
    videoQuery: "how to crochet foundation chain beginner loose",
    steps: [
      "Make a slip knot and place it on the hook. Hold yarn behind and wrap over the hook tip.",
      "Pull the wrap through the loop on the hook. That is 1 chain. Repeat for the required count.",
      "Count chains carefully (don't count the slip knot or the loop on the hook).",
    ],
  },
  {
    craftType: "crocheting",
    title: "Turning chain",
    detail: "Added at the start of each row to reach the correct height. Chain 1 for sc, chain 2 for hdc, chain 3 for dc.",
    videoQuery: "crochet turning chain sc hdc dc height",
    steps: [
      "At the end of a row, turn the work so the other side faces you.",
      "Chain the required number of times to reach your stitch height before working the first stitch.",
      "Check the pattern. Sometimes the turning chain counts as the first stitch, sometimes it doesn't.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Fasten off",
    detail: "Cuts the yarn and locks the final loop. Always leave a 6-inch tail for weaving in.",
    videoQuery: "how to fasten off crochet weave in ends",
    steps: [
      "Complete the last stitch normally, then cut the yarn leaving at least a 6-inch tail.",
      "Pull the tail through the final loop on the hook and tighten gently.",
      "Thread the tail onto a tapestry needle and weave it through nearby stitches for 2-3 inches to secure.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Working in the round",
    detail: "Start with a magic ring or short foundation chain joined into a ring. RS usually faces you throughout.",
    videoQuery: "how to crochet in the round magic ring",
    steps: [
      "Make a magic ring or chain 4 and join with a slip stitch to form a ring.",
      "Work the first-round stitches into the ring. Do not turn at the end of rounds.",
      "Mark the first stitch of each round with a stitch marker and move it up as you go.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Reading crochet charts",
    detail: "Symbol charts use pictograms. Common symbols: circle = chain, x or + = sc, T = dc.",
    videoQuery: "how to read crochet chart symbols beginner",
    steps: [
      "Start at the bottom of the chart. The foundation chain runs along the base.",
      "Identify symbols using the chart key. Each symbol shows the complete stitch to work.",
      "Follow arrows for row direction: right to left on RS rows, left to right on WS rows.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Gauge swatch",
    detail: "A crochet swatch checks hook size, stitch height, drape, and whether the fabric is too stiff or too loose.",
    videoQuery: "how to crochet a gauge swatch measure stitches rows",
    steps: [
      "Chain more stitches than the gauge width, then work the main stitch for at least 4 in.",
      "Block or rest the swatch the same way you will treat the final project.",
      "Measure stitches and rows across the centre. Change hook size if the count does not match.",
    ],
  },
  {
    craftType: "crocheting",
    title: "Seaming crochet pieces",
    detail: "Slip-stitch seam or mattress stitch join. Hold RS together for an invisible seam.",
    videoQuery: "how to seam crochet pieces slip stitch mattress",
    steps: [
      "Hold the two pieces with RS facing each other, edges aligned.",
      "Insert hook through matching stitches on both pieces, yarn over and pull through.",
      "Slip stitch across the entire seam, keeping tension even. Fasten off and weave in ends.",
    ],
  },
];

function readSavedStitches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("kc_saved_stitches");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function resolveInitialLearnState(): { activeCraft: CraftType; activeSection: Section } {
  if (typeof window === "undefined") return { activeCraft: "knitting", activeSection: "all" };
  const raw = window.location.hash.replace(/^#learn-/, "");
  if (!raw) return { activeCraft: "knitting", activeSection: "all" };

  const stitch = STITCH_LIBRARY.find((entry) => entry.id === raw);
  if (stitch) return { activeCraft: stitch.craftType, activeSection: "stitches" };

  const essential = ESSENTIALS.find((entry) => slugify(entry.title) === raw);
  if (essential) return { activeCraft: essential.craftType, activeSection: "essentials" };

  const chartNote = CHART_READING_NOTES.find((entry) => slugify(entry.title) === raw);
  if (chartNote) return { activeCraft: chartNote.craftType, activeSection: "charts" };

  return { activeCraft: "knitting", activeSection: "all" };
}

export default function LearnPage() {
  const [initialLearn] = useState(resolveInitialLearnState);
  const [activeCraft, setActiveCraft] = useState<CraftType>(initialLearn.activeCraft);
  const [activeSection, setActiveSection] = useState<Section>(initialLearn.activeSection);
  const [savedIds, setSavedIds] = useState<string[]>(readSavedStitches);
  const [popupStitch, setPopupStitch] = useState<typeof STITCH_LIBRARY[0] | null>(null);

  useEffect(() => {
    if (!window.location.hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [activeCraft, activeSection]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("kc_saved_stitches", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleCraftSwitch = (ct: CraftType) => {
    setActiveCraft(ct);
    if (activeSection === "saved") setActiveSection("all");
  };

  const stitches = STITCH_LIBRARY.filter((s) => s.craftType === activeCraft);
  const savedStitches = STITCH_LIBRARY.filter((s) => savedIds.includes(s.id));

  const SECTIONS: { key: Section; label: string }[] = [
    { key: "all", label: "All" },
    { key: "stitches", label: "Stitches" },
    { key: "charts", label: "Chart Reading" },
    { key: "essentials", label: "Techniques" },
    { key: "saved", label: `Saved${savedIds.length ? ` (${savedIds.length})` : ""}` },
  ];

  return (
    <div className="min-h-screen px-4 py-8 overflow-x-hidden">
      <div className="mx-auto max-w-5xl w-full">
        <header className="mb-6 comic-panel px-5 py-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="icon-slate grid h-12 w-12 place-items-center rounded-xl shrink-0">
              <BookOpen size={22} color="white" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-3xl font-black text-[#251a1c]"
                style={{ fontFamily: "var(--font-lora), serif" }}
              >
                Stitch Dictionary
              </h1>
              <p className="text-sm text-[#6b5d52]">
                Stitches, chart reading, and essential techniques. Tap any card to explore.
              </p>
            </div>
          </div>
        </header>

        {/* Craft switcher hidden on saved tab */}
        {activeSection !== "saved" && (
          <div className="flex gap-2 mb-4">
            {(["knitting", "crocheting"] as CraftType[]).map((ct) => (
              <button
                key={ct}
                onClick={() => handleCraftSwitch(ct)}
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
        )}

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-px">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`shrink-0 px-4 py-2 text-sm font-black rounded-t-lg border-2 border-b-0 transition-all ${
                activeSection === key
                  ? "bg-[#251a1c] border-[#251a1c] text-[#ffd166]"
                  : "bg-[#fffaf0] border-[#e8ddd0] text-[#6b5d52] hover:border-[#251a1c]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeSection === "all" && (
          <div className="space-y-8">
            <section>
              <SectionHeading title={`${activeCraft === "knitting" ? "Knitting" : "Crochet"} stitches`} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stitches.map((stitch) => (
                  <StitchCard
                    key={stitch.id}
                    stitch={stitch}
                    isSaved={savedIds.includes(stitch.id)}
                    onOpen={() => setPopupStitch(stitch)}
                    onToggleSave={() => toggleSave(stitch.id)}
                  />
                ))}
              </div>
            </section>
            <section>
              <SectionHeading title="Chart reading" />
              <div className="grid gap-3 sm:grid-cols-2">
                {CHART_READING_NOTES.filter((n) => n.craftType === activeCraft).map((note) => (
                  <ChartNoteCard key={note.title} note={note} />
                ))}
              </div>
            </section>
            <section>
              <SectionHeading title="Essential techniques" />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {ESSENTIALS.filter((e) => e.craftType === activeCraft).map((item) => (
                  <EssentialCard key={item.title} item={item} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Stitches */}
        {activeSection === "stitches" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stitches.map((stitch) => (
              <StitchCard
                key={stitch.id}
                stitch={stitch}
                isSaved={savedIds.includes(stitch.id)}
                onOpen={() => setPopupStitch(stitch)}
                onToggleSave={() => toggleSave(stitch.id)}
              />
            ))}
          </div>
        )}

        {/* Chart reading */}
        {activeSection === "charts" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {CHART_READING_NOTES.filter((n) => n.craftType === activeCraft).map((note) => (
              <ChartNoteCard key={note.title} note={note} />
            ))}
          </div>
        )}

        {/* Essential techniques */}
        {activeSection === "essentials" && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ESSENTIALS.filter((e) => e.craftType === activeCraft).map((item) => (
              <EssentialCard key={item.title} item={item} />
            ))}
          </div>
        )}

        {/* Saved */}
        {activeSection === "saved" && (
          <>
            {savedStitches.length === 0 ? (
              <div className="py-20 text-center text-[#6b5d52]">
                <Bookmark size={44} className="mx-auto mb-3 opacity-25" />
                <p className="font-black text-lg text-[#251a1c]">No saved stitches yet</p>
                <p className="text-sm mt-1">
                  Click the{" "}
                  <Bookmark size={13} className="inline" />{" "}
                  icon on any stitch card to save it here.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {(["knitting", "crocheting"] as CraftType[]).map((craft) => {
                  const savedForCraft = savedStitches.filter((stitch) => stitch.craftType === craft);
                  if (!savedForCraft.length) return null;
                  return (
                    <section key={craft}>
                      <SectionHeading title={craft === "knitting" ? "Saved knitting" : "Saved crochet"} />
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {savedForCraft.map((stitch) => (
                          <StitchCard
                            key={stitch.id}
                            stitch={stitch}
                            isSaved={true}
                            onOpen={() => setPopupStitch(stitch)}
                            onToggleSave={() => toggleSave(stitch.id)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Popup modal */}
      {popupStitch && (
        <StitchPopup
          stitch={popupStitch}
          isSaved={savedIds.includes(popupStitch.id)}
          onToggleSave={() => toggleSave(popupStitch.id)}
          onClose={() => setPopupStitch(null)}
        />
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xl font-black text-[#251a1c]">{title}</h2>
    </div>
  );
}

function ChartNoteCard({
  note,
}: {
  note: (typeof CHART_READING_NOTES)[0];
}) {
  return (
    <article id={learnId(note.title)} className="comic-panel bg-[#fff0bf] p-4 scroll-mt-24">
      <h3 className="font-black text-sm text-[#251a1c] mb-2">{note.title}</h3>
      <p className="text-xs leading-relaxed text-[#4a3a30]">{note.body}</p>
    </article>
  );
}

/* StitchCard */

function StitchCard({
  stitch,
  isSaved,
  onOpen,
  onToggleSave,
}: {
  stitch: typeof STITCH_LIBRARY[0];
  isSaved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(stitch.imageUrl);
  const fallback = makeFallbackSvg(stitch.name, FALLBACK_COLORS[stitch.id] ?? "#8b6347");

  return (
    <article
      id={`learn-${stitch.id}`}
      className="comic-panel overflow-hidden flex flex-col scroll-mt-24 cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      aria-label={`Open ${stitch.name} details`}
    >
      <div
        onClick={onOpen}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd166]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={stitch.name}
          className="h-36 w-full object-contain bg-white p-3 hover:opacity-90 transition-opacity"
          onError={() => setImgSrc(fallback)}
          loading="lazy"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Name row */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <button onClick={onOpen} className="text-left flex-1 focus:outline-none">
            <h3 className="text-base font-black text-[#251a1c] leading-tight hover:text-[#8b6347] transition-colors">
              {stitch.name}
            </h3>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-md border-2 border-[#251a1c] bg-[#fff0bf] px-2 py-0.5 text-xs font-black">
              {stitch.abbreviation}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleSave();
              }}
              aria-label={isSaved ? "Remove from saved" : "Save stitch"}
              className="rounded-md p-1 hover:bg-[#f5ede0] transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck size={16} className="text-[#6a9470]" />
              ) : (
                <Bookmark size={16} className="text-[#8b6347]" />
              )}
            </button>
          </div>
        </div>

        <p className="mb-1 text-xs text-[#8b6347]">
          <strong>Looks like:</strong> {stitch.appearance}
        </p>
        <p className="mb-3 text-xs text-[#8b6347]">
          <strong>Use for:</strong> {stitch.useFor}
        </p>

        <div className="mt-auto flex flex-wrap gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black text-[#251a1c] hover:bg-[#f5c842] transition-colors"
          >
            <BookOpen size={13} /> How to work it
          </button>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(stitch.videoQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#251a1c] hover:bg-[#f5ede0] transition-colors"
          >
            <PlayCircle size={13} /> Video
          </a>
        </div>
      </div>
    </article>
  );
}

/* StitchPopup */

function StitchPopup({
  stitch,
  isSaved,
  onToggleSave,
  onClose,
}: {
  stitch: typeof STITCH_LIBRARY[0];
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(stitch.imageUrl);
  const fallback = makeFallbackSvg(stitch.name, FALLBACK_COLORS[stitch.id] ?? "#8b6347");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(stitch.videoQuery)}`;
  const tutorialImages = stitch.tutorialImages?.filter((src) => src !== stitch.imageUrl) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#fffaf0] rounded-2xl border-4 border-[#251a1c] shadow-2xl">
        {/* Close + save header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[#251a1c] rounded-t-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded-md border-2 border-[#ffd166] bg-[#ffd166] px-2 py-0.5 text-xs font-black text-[#251a1c]">
              {stitch.abbreviation}
            </span>
            <h2
              className="text-lg font-black text-white truncate"
              style={{ fontFamily: "var(--font-lora), serif" }}
            >
              {stitch.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleSave}
              className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
              aria-label={isSaved ? "Remove from saved" : "Save stitch"}
            >
              {isSaved ? (
                <BookmarkCheck size={20} className="text-[#6adf90]" />
              ) : (
                <Bookmark size={20} className="text-[#ffd166]" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Chart notation diagram */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={`${stitch.name} chart notation`}
            className="w-full max-h-44 object-contain bg-white rounded-xl border-2 border-[#e8ddd0] p-3"
            onError={() => setImgSrc(fallback)}
          />

          {/* Info */}
          <div className="space-y-3">
            <div className="comic-panel bg-[#fff0bf] p-3">
              <p className="text-xs font-black text-[#251a1c] mb-0.5">Appearance</p>
              <p className="text-sm text-[#4a3a30] leading-relaxed">{stitch.appearance}</p>
            </div>
            <div className="comic-panel bg-[#f0f8f0] p-3">
              <p className="text-xs font-black text-[#251a1c] mb-0.5">Use for</p>
              <p className="text-sm text-[#4a3a30] leading-relaxed">{stitch.useFor}</p>
            </div>
            <div className="comic-panel bg-[#fffaf0] p-3">
              <p className="text-xs font-black text-[#251a1c] mb-0.5">How to work it</p>
              <p className="text-sm text-[#4a3a30] leading-relaxed">{stitch.tutorial}</p>
            </div>
          </div>

          {tutorialImages.length ? (
            <div>
              <p className="text-xs font-black text-[#251a1c] mb-2">How-to diagram</p>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                {tutorialImages.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`popup-step-${i}`}
                    src={src}
                    alt={`${stitch.name} step ${i + 1}`}
                    className="w-full rounded-xl border-2 border-[#e8ddd0] bg-white object-contain"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Video + source actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#251a1c] bg-[#ffd166] px-4 py-3 text-sm font-black text-[#251a1c] hover:bg-[#f5c842] transition-colors"
            >
              <PlayCircle size={18} />
              Open video tutorial
            </a>
            <a
              href={stitch.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#e8ddd0] bg-[#fffaf0] px-4 py-3 text-sm font-black text-[#251a1c] hover:border-[#251a1c] transition-colors"
            >
              <ExternalLink size={15} /> Source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function techniqueImage(item: typeof ESSENTIALS[0]): string {
  const stitch =
    item.title.includes("Reading flat") ? STITCH_LIBRARY.find((s) => s.id === "stockinette") :
    item.title.includes("Reading crochet") ? STITCH_LIBRARY.find((s) => s.id === "single-crochet") :
    item.title.includes("Foundation") ? STITCH_LIBRARY.find((s) => s.id === "single-crochet") :
    item.title.includes("Turning") ? STITCH_LIBRARY.find((s) => s.id === "half-double-crochet") :
    item.title.includes("round") ? STITCH_LIBRARY.find((s) => s.id === "magic-ring") :
    item.title.includes("pocket") ? STITCH_LIBRARY.find((s) => s.id === "ribbing") :
    item.title.includes("Picking") ? STITCH_LIBRARY.find((s) => s.id === "stockinette") :
    item.title.includes("Mattress") || item.title.includes("Seaming") ? STITCH_LIBRARY.find((s) => s.id === "slipped-stitch" || s.id === "slip-stitch-crochet") :
    item.craftType === "knitting" ? STITCH_LIBRARY.find((s) => s.id === "knit") :
    STITCH_LIBRARY.find((s) => s.id === "single-crochet");

  return stitch?.imageUrl ?? makeFallbackSvg(item.title, item.craftType === "knitting" ? "#8b6347" : "#6a9470");
}

/* EssentialCard */

function EssentialCard({
  item,
}: {
  item: typeof ESSENTIALS[0];
}) {
  const [open, setOpen] = useState(false);

  return (
    <article id={learnId(item.title)} className="comic-panel bg-[#fffaf0] p-4 flex flex-col scroll-mt-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={techniqueImage(item)}
        alt={`${item.title} diagram`}
        className="mb-3 h-24 w-full rounded-lg border-2 border-[#251a1c] bg-white object-contain p-2"
        loading="lazy"
      />
      <h3 className="mb-1 text-sm font-black text-[#251a1c]">{item.title}</h3>
      <p className="mb-3 text-xs leading-relaxed text-[#6b5d52]">{item.detail}</p>

      {item.steps.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-black text-[#6a9470] mb-2 flex items-center gap-1"
          >
            <ChevronRight size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} />
            {open ? "Hide steps" : "Show steps"}
          </button>
          {open && (
            <div className="space-y-3">
              <ol className="space-y-1.5 list-none">
                {item.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[#4a3a30]">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#8b6347] text-white text-[10px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <a
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.videoQuery)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black text-[#251a1c] hover:bg-[#f5c842] transition-colors self-start"
      >
        <PlayCircle size={13} /> Tutorial
      </a>
    </article>
  );
}
