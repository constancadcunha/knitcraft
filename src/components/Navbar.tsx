"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sparkles, LayoutGrid, BookMarked, Menu, X, GraduationCap } from "lucide-react";

const links = [
  { href: "/generate", label: "Pattern Studio", Icon: Sparkles },
  { href: "/chart-editor", label: "Chart Editor", Icon: LayoutGrid },
  { href: "/learn", label: "Quick Learn", Icon: GraduationCap },
  { href: "/saved", label: "My Library", Icon: BookMarked },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-[#d4c4b0]/30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-[60px]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <YarnMark />
          <span
            className="text-xl font-bold text-[#4a3f35] group-hover:text-[#c89b7e] transition-colors"
            style={{ fontFamily: "var(--font-lora), serif" }}
          >
            StitchCraft Studio
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {links.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={`${href}-${label}`}
                href={href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#c89b7e]/20 text-[#8b6f47]"
                    : "text-[#4a3f35] hover:bg-[#e8ddd0]/50 hover:text-[#4a3f35]"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>

        <button
          className="sm:hidden p-2 rounded-xl hover:bg-[#e8ddd0]/50 transition-colors text-[#4a3f35]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-[#d4c4b0]/30 bg-white/95 backdrop-blur-sm px-4 pb-4 pt-2 flex flex-col gap-1">
          {links.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={`${href}-${label}`}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#c89b7e]/20 text-[#8b6f47]"
                    : "text-[#4a3f35] hover:bg-[#e8ddd0]/50"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

function YarnMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="13" fill="#f5ede0" stroke="#c4a07e" strokeWidth="1.5"/>
      <path d="M7 15c2-7 9-9 13-4" stroke="#c9785c" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 19c3-6 11-7 15-2" stroke="#8b6347" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M11 9c4-2 10 0 11 7" stroke="#6a9470" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="15" cy="15" r="2.5" fill="#c4a07e"/>
    </svg>
  );
}
