import Link from "next/link";
import { ArrowRight, BookOpen, FolderOpen, PenLine, Sparkles } from "lucide-react";
import { GarmentIcon } from "@/components/GarmentIcon";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 sm:py-8">
      <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[330px_1fr]">
        <aside className="comic-panel bg-[#fffaf0] p-4 sm:p-5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#8b6347]">
            StitchCraft Studio
          </p>
          <h1 className="text-3xl font-black leading-tight text-[#251a1c] sm:text-4xl">
            Make a chart, then work it row by row.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5f4c42]">
            Start from a description, a garment photo, an exact chart image, or a blank grid. Every project opens with a shopping list, setup steps, chart sections, and finishing.
          </p>

          <div className="mt-5 grid gap-2">
            {primaryActions.map(({ href, label, detail, icon: Icon, className }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-lg border-2 border-[#251a1c] bg-[#fff0bf] p-3 shadow-[4px_4px_0_#251a1c] transition-transform hover:-translate-y-0.5"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-[#251a1c] ${className}`}>
                  <Icon size={18} color="white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#251a1c]">{label}</span>
                  <span className="block text-[11px] leading-relaxed text-[#5f4c42]">{detail}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-[#251a1c]" />
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          <section className="comic-panel overflow-hidden bg-[#251a1c]">
            <div className="flex items-center justify-between border-b-[3px] border-[#251a1c] bg-[#ffd166] px-4 py-3">
              <span className="text-sm font-black uppercase tracking-wide text-[#251a1c]">Static project preview</span>
              <span className="rounded-md border-2 border-[#251a1c] bg-[#fffaf0] px-2 py-1 text-[10px] font-black text-[#251a1c]">
                row 1 starts at the bottom
              </span>
            </div>
            <div className="grid gap-0 bg-[#fffaf0] md:grid-cols-[1fr_220px]">
              <div className="p-3 sm:p-4">
                <div className="grid max-h-[520px] min-h-[360px] overflow-hidden rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] p-2" style={{ gridTemplateColumns: "repeat(38, minmax(0, 1fr))" }}>
                  {Array.from({ length: 38 * 48 }, (_, index) => {
                    const row = Math.floor(index / 38);
                    const col = index % 38;
                    return (
                      <span
                        key={index}
                        className="aspect-square border border-[#251a1c]/10"
                        style={{ backgroundColor: sampleChartCell(row, col) }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="border-t-[3px] border-[#251a1c] bg-[#fff0bf] p-4 md:border-l-[3px] md:border-t-0">
                <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-[#8b6347]">
                  Project order
                </p>
                <ol className="space-y-2 text-xs font-black text-[#251a1c]">
                  {["Shopping list", "Start here", "Front chart", "Back chart", "Sleeves", "Finish off"].map((label, index) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[#251a1c] bg-[#fffaf0] text-[10px]">
                        {index + 1}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[11px] leading-relaxed text-[#5f4c42]">
                  This preview is informational. Use the action buttons on the left to create, draw, learn, or reopen a project.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {garmentExamples.map((item) => (
              <div key={item.type} className="comic-panel flex items-center gap-3 bg-[#fffaf0] p-3">
                <GarmentIcon type={item.type} active className="h-14 w-14 shrink-0" />
                <div>
                  <h2 className="text-sm font-black text-[#251a1c]">{item.type}</h2>
                  <p className="text-[11px] leading-relaxed text-[#5f4c42]">{item.text}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function sampleChartCell(row: number, col: number): string {
  const topBand = row < 16;
  const middleBand = row >= 16 && row < 29;
  const hem = row >= 42 && col % 2 === 0;
  const penguin =
    row >= 7 && row <= 13 && col >= 17 && col <= 21 &&
    !(row === 7 && (col < 18 || col > 20)) &&
    !(row === 13 && (col < 18 || col > 20));
  const letterLine =
    (row === 22 || row === 25) &&
    ((col >= 5 && col <= 11) || (col >= 14 && col <= 19) || (col >= 23 && col <= 31));
  const underline = row === 27 && col >= 17 && col <= 22;
  if (penguin) return col === 19 && row > 8 && row < 13 ? "#fffaf0" : "#251a1c";
  if (letterLine) return "#251a1c";
  if (underline) return "#f26b5e";
  if (middleBand) return "#fffaf0";
  if (hem) return "#8b6347";
  return topBand || row >= 29 ? "#b64236" : "#fffaf0";
}

const primaryActions = [
  {
    href: "/generate",
    label: "Pattern Studio",
    detail: "Describe, import, or extract a garment design.",
    icon: Sparkles,
    className: "bg-[#f26b5e]",
  },
  {
    href: "/chart-editor",
    label: "Chart Editor",
    detail: "Draw or import a chart by section.",
    icon: PenLine,
    className: "bg-[#2c7be5]",
  },
  {
    href: "/learn",
    label: "Quick Learn",
    detail: "Open stitch and technique lessons.",
    icon: BookOpen,
    className: "bg-[#4fae68]",
  },
  {
    href: "/saved",
    label: "My Library",
    detail: "Return to saved projects and charts.",
    icon: FolderOpen,
    className: "bg-[#8b6347]",
  },
];

const garmentExamples = [
  { type: "Cardigan", text: "Back, fronts, bands, sleeves, optional pockets, and finishing stay linked." },
  { type: "Sweater", text: "Crew necks use neckbands; turtlenecks use real collar sections." },
  { type: "Gloves", text: "Small accessories can still use exact charts, imported grids, and row tracking." },
];
