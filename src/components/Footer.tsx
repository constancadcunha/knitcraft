import Link from "next/link";

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
    <footer className="border-t-[3px] border-ink bg-panel">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-[13px] leading-relaxed text-ink">
            StitchCraft
            <br />
            Studio
          </p>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            Charts are pixel art you can wear. Built for knitters and
            crocheters who want the maths to actually add up.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="label text-ink-faint">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-soft underline-offset-4 hover:text-berry hover:underline"
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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
