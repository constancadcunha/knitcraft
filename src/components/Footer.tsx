import Link from "next/link";
import YarnMark from "@/components/YarnMark";

const COLUMNS = [
  {
    title: "Make",
    links: [
      { href: "/generate", label: "Pattern Studio" },
      { href: "/chart-editor", label: "Chart Editor" },
      { href: "/saved", label: "My Library" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/learn", label: "Stitch Library" },
      { href: "/learn#techniques", label: "Techniques" },
      { href: "/learn#charts", label: "Reading Charts" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t-[3px] border-ink bg-panel">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="border-[3px] border-ink bg-paper p-1 shadow-pop-sm">
              <YarnMark size={24} />
            </span>
            <p className="font-display text-[13px] leading-relaxed text-ink">
              StitchCraft
              <br />
              Studio
            </p>
          </div>
          <p className="mt-4 max-w-xs text-sm text-ink-soft">
            Charts are pixel art you can wear. Built for knitters and
            crocheters who want the maths to actually add up.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="label text-ink-faint">{col.title}</h2>
            <ul className="mt-2">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    /* Footer links used to be 18px tall. Same 44px floor as
                       everywhere else, with the padding pulled back out so the
                       column still aligns to the heading. */
                    className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm text-ink-soft underline-offset-4 hover:text-berry hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t-[3px] border-ink bg-panel-sunk">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
          <p className="label text-ink-soft">
            Everything stays in your browser
          </p>
          <p className="label text-ink-faint">
            Stitch photos &copy; their authors, via Wikimedia Commons
          </p>
        </div>
      </div>
    </footer>
  );
}
