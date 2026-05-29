import Link from "next/link";
import { ArrowRight, BookOpen, LayoutGrid, PenLine, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip px-4 py-6 sm:py-8">
      <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex min-h-[520px] flex-col justify-between rounded-lg border-[3px] border-[#251a1c] bg-[#fffaf0] p-6 shadow-[6px_6px_0_#251a1c] sm:p-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black uppercase text-[#251a1c]">
              <Sparkles size={14} /> StitchCraft Studio
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[0.94] text-[#251a1c] sm:text-7xl">
              Draft it. Chart it. Finish it.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5f4c42] sm:text-lg">
              Build a real knitting or crochet project from the first shopping-list check to the last seam. Pattern Studio turns your exact description into charted garment sections, then the tracker keeps the whole project together.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/generate" className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#f26b5e] px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#251a1c]">
              <Sparkles size={16} /> Open Pattern Studio <ArrowRight size={16} />
            </Link>
            <Link href="/chart-editor" className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] px-5 py-3 text-sm font-black text-[#251a1c] shadow-[4px_4px_0_#251a1c]">
              <PenLine size={16} /> Draw a Chart
            </Link>
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-lg border-[3px] border-[#251a1c] bg-[#fff0bf] shadow-[6px_6px_0_#251a1c]">
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b-[3px] border-[#251a1c] bg-[#251a1c] px-4 py-3 text-[#fffaf0]">
            <span className="text-sm font-black uppercase tracking-wide">Flower cardigan chart</span>
            <span className="rounded border-2 border-[#ffd166] px-2 py-0.5 text-[10px] font-black text-[#ffd166]">row 1 at bottom</span>
          </div>
          <div className="grid h-full min-h-[520px] grid-cols-[1fr_72px] pt-12">
            <div
              className="grid h-full border-r-[3px] border-[#251a1c] bg-[#fffaf0]"
              style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
            >
              {Array.from({ length: 30 * 34 }, (_, index) => {
                const row = Math.floor(index / 30);
                const col = index % 30;
                const flower = flowerCell(col, row, 8, 9) || flowerCell(col, row, 20, 11) || flowerCell(col, row, 14, 23);
                const stem = stemCell(col, row, 8, 9) || stemCell(col, row, 20, 11) || stemCell(col, row, 14, 23);
                const hem = row > 29 && col % 2 === 0;
                const fill = flower === "centre" ? "#ffd166" : flower ? "#f26b5e" : stem ? "#4fae68" : hem ? "#8b6347" : "#fffaf0";
                return <span key={index} className="border border-[#251a1c]/10" style={{ backgroundColor: fill }} />;
              })}
            </div>
            <div className="flex flex-col justify-end gap-2 bg-[#f5ede0] p-3">
              {["Shop", "Start", "Back", "Front", "Sleeves", "Finish"].map((label, index) => (
                <div key={label} className={`rounded border-2 border-[#251a1c] px-2 py-2 text-[10px] font-black ${index === 0 ? "bg-[#ffd166]" : "bg-[#fffaf0]"}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {actions.map(({ href, title, desc, icon: Icon, bg }) => (
          <Link key={`${href}-${title}`} href={href} className="comic-panel group bg-[#fffaf0] p-5 transition-transform hover:-translate-y-1">
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-lg border-2 border-[#251a1c] ${bg}`}>
              <Icon size={20} color="white" />
            </div>
            <h2 className="text-lg font-black text-[#251a1c]">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5d52]">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#251a1c] underline">
              Open <ArrowRight size={13} />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function flowerCell(col: number, row: number, cx: number, cy: number) {
  const dx = col - cx;
  const dy = row - cy;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return "centre";
  if (
    Math.abs(dx) + Math.abs(dy + 3) <= 3 ||
    Math.abs(dx) + Math.abs(dy - 3) <= 3 ||
    Math.abs(dx + 3) + Math.abs(dy) <= 3 ||
    Math.abs(dx - 3) + Math.abs(dy) <= 3
  ) return "petal";
  return "";
}

function stemCell(col: number, row: number, cx: number, cy: number) {
  const dx = col - cx;
  const dy = row - cy;
  return (Math.abs(dx) <= 0 && dy > 3 && dy < 10) || (dy > 6 && Math.abs(dx - 2) + Math.abs(dy - 8) < 4);
}

const actions = [
  {
    href: "/generate",
    title: "Pattern Studio",
    desc: "Describe the motif, colours, garment style, and size. Get shopping, start, chart, and finish steps as one project.",
    icon: Sparkles,
    bg: "bg-[#f26b5e]",
  },
  {
    href: "/chart-editor",
    title: "Chart Editor",
    desc: "Draw your own sections, choose ribbing with a checkbox, and save the whole project into the same tracker flow.",
    icon: LayoutGrid,
    bg: "bg-[#2c7be5]",
  },
  {
    href: "/learn",
    title: "Quick Learn",
    desc: "Browse knitting and crochet separately, save cards, and open focused stitch or technique references.",
    icon: BookOpen,
    bg: "bg-[#4fae68]",
  },
];
