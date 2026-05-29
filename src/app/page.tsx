import Link from "next/link";
import { ArrowRight, BookOpen, LayoutGrid, PenLine, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip px-4 py-8">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="comic-panel bg-[#fffaf0] p-6 sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#ffd166] px-3 py-1.5 text-xs font-black uppercase text-[#251a1c]">
            <Sparkles size={14} /> StitchCraft Studio
          </div>
          <h1 className="text-4xl font-black leading-tight text-[#251a1c] sm:text-6xl">
            Make the chart. Track the rows. Finish the thing.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#6b5d52] sm:text-lg">
            Draft a garment, generate shaped colour charts from your description or photo, then work through every section from shopping list to finishing.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/generate" className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#f26b5e] px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#251a1c]">
              <Sparkles size={16} /> Open Pattern Studio <ArrowRight size={16} />
            </Link>
            <Link href="/chart-editor" className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#251a1c] bg-[#fffaf0] px-5 py-3 text-sm font-black text-[#251a1c] shadow-[4px_4px_0_#251a1c]">
              <PenLine size={16} /> Draw a Chart
            </Link>
          </div>
        </div>

        <div className="comic-panel bg-[#fff0bf] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#251a1c]">Generated chart preview</h2>
            <span className="rounded-md border-2 border-[#251a1c] bg-[#fffaf0] px-2 py-1 text-[10px] font-black text-[#251a1c]">bottom up</span>
          </div>
          <div
            className="grid aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-[#251a1c] bg-[#fffaf0]"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
          >
            {Array.from({ length: 24 * 18 }, (_, index) => {
              const row = Math.floor(index / 24);
              const col = index % 24;
              const heart = Math.pow(((col - 12) / 5) ** 2 + ((row - 7) / 4) ** 2 - 1, 3) - ((col - 12) / 5) ** 2 * ((row - 7) / 4) ** 3 <= 0;
              const stripe = row > 14 && col % 2 === 0;
              const wave = Math.abs((col + Math.round(Math.sin(row / 2) * 3)) % 10 - 5) < 1;
              const color = heart ? "#f26b5e" : stripe ? "#c4a07e" : wave ? "#2c7be5" : "#fffaf0";
              return <span key={index} className="border border-[#251a1c]/10" style={{ backgroundColor: color }} />;
            })}
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-[#6b5d52]">
            Prompt words like heart, flowers, stripes, checker, waves, buttons, collar, pockets, and colour names now show up in the chart cells.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {actions.map(({ href, title, desc, icon: Icon, bg }) => (
          <Link key={href} href={href} className="comic-panel group bg-[#fffaf0] p-5 transition-transform hover:-translate-y-1">
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-lg border-2 border-[#251a1c] ${bg}`}>
              <Icon size={20} color="white" />
            </div>
            <h3 className="text-lg font-black text-[#251a1c]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5d52]">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#251a1c] underline">
              Start <ArrowRight size={13} />
            </span>
          </Link>
        ))}
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-6xl gap-4 md:grid-cols-4">
        {steps.map(({ title, desc }, index) => (
          <div key={title} className="rounded-lg border-2 border-[#251a1c] bg-[#ffd166] p-4 shadow-[4px_4px_0_#251a1c]">
            <div className="mb-3 grid h-8 w-8 place-items-center rounded-full border-2 border-[#251a1c] bg-[#251a1c] text-sm font-black text-[#ffd166]">
              {index + 1}
            </div>
            <h3 className="text-sm font-black text-[#251a1c]">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#4a3a30]">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

const actions = [
  {
    href: "/generate",
    title: "Pattern Studio",
    desc: "Use a photo or description to build a project with shopping list, shaped charts, tracker steps, and finishing order.",
    icon: Sparkles,
    bg: "bg-[#f26b5e]",
  },
  {
    href: "/chart-editor",
    title: "Chart Editor",
    desc: "Choose a garment, toggle ribbing, draw colourwork, or freehand row shaping with add/take stitch controls.",
    icon: LayoutGrid,
    bg: "bg-[#2c7be5]",
  },
  {
    href: "/learn",
    title: "Quick Learn",
    desc: "Open stitch references, chart symbols, tutorial pictures, video searches, and craft-specific technique notes.",
    icon: BookOpen,
    bg: "bg-[#4fae68]",
  },
];

const steps = [
  { title: "Plan", desc: "Pick craft, garment style, size, stitch feel, ribbing, and design notes." },
  { title: "Shop", desc: "Check yarn by colour, tools, and notions before the first row." },
  { title: "Track", desc: "Work bottom-up chart sections and mark rows or individual stitches." },
  { title: "Finish", desc: "Block, seam, add collars or buttons, and close the project." },
];
