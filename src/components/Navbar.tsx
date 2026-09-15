"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import YarnMark from "@/components/YarnMark";

const LINKS = [
  { href: "/generate", label: "Studio" },
  { href: "/chart-editor", label: "Charts" },
  { href: "/learn", label: "Learn" },
  { href: "/saved", label: "Library" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-panel">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 py-2"
          aria-label="StitchCraft Studio home"
        >
          <span className="border-[3px] border-ink bg-paper p-1 shadow-pop-sm transition-transform group-hover:-translate-y-0.5">
            <YarnMark size={26} />
          </span>
          <span className="font-display text-[11px] leading-tight text-ink">
            Stitch<span className="text-berry">Craft</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 sm:flex" aria-label="Main">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                /* `hit` keeps every nav target at 44px — the old 35px links
                   were the smallest tap area in the app. */
                className={`label hit inline-flex items-center gap-2 border-[3px] border-ink px-3.5 transition-transform ${
                  active
                    ? "bg-berry text-panel shadow-pop-sm"
                    : "bg-panel text-ink hover:-translate-y-0.5 hover:bg-gold hover:shadow-pop-sm"
                }`}
              >
                {/* The current page is marked by a filled square as well as by
                    colour, so the state survives greyscale. */}
                {active && <span className="inline-block h-2 w-2 bg-panel" aria-hidden />}
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="press hit bg-panel px-4 text-ink sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t-[3px] border-ink bg-panel-sunk px-4 py-4 sm:hidden"
        >
          <ul className="flex flex-col gap-2.5">
            {LINKS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`label hit flex items-center gap-2 border-[3px] border-ink px-4 ${
                      active
                        ? "bg-berry text-panel shadow-pop-sm"
                        : "bg-panel text-ink"
                    }`}
                  >
                    {active && (
                      <span className="inline-block h-2 w-2 bg-panel" aria-hidden />
                    )}
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
