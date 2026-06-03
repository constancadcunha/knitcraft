import type { SVGProps } from "react";

type GarmentIconProps = {
  type: string;
  active?: boolean;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "type">;

function colors(active: boolean | undefined) {
  return {
    ink: active ? "#251a1c" : "#8b6347",
    fill: active ? "#fff0bf" : "#fffaf0",
    accent: active ? "#f26b5e" : "#c4a07e",
    blue: active ? "#2c7be5" : "#8fb0d6",
    green: active ? "#4fae68" : "#8caf8a",
  };
}

export function GarmentIcon({ type, active, className = "h-12 w-12", ...props }: GarmentIconProps) {
  const normalized = type === "Hat / Beanie" ? "Hat" : type;
  const c = colors(active);
  const common = {
    viewBox: "0 0 64 56",
    fill: "none",
    className,
    "aria-hidden": true,
    ...props,
  } as const;

  switch (normalized) {
    case "Sweater":
    case "Pullover":
      return (
        <svg {...common}>
          <path d="M23 8c1.5 5 4.6 7.4 9 7.4S39.5 13 41 8l11 5 7 20-10 3-4-10v23H19V26l-4 10-10-3 7-20 11-5Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M26 9.5c1.8 2.2 3.8 3.2 6 3.2 2.3 0 4.3-1 6-3.2" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M19 43h26" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Cardigan":
      return (
        <svg {...common}>
          <path d="M23 8 12 13 5 33l10 3 4-10v23h13V16c-4.4 0-7.5-2.6-9-8Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M41 8c-1.5 5.4-4.6 8-9 8v33h13V26l4 10 10-3-7-20-11-5Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 17v31" stroke={c.ink} strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="36" cy="25" r="1.6" fill={c.accent} />
          <circle cx="36" cy="32" r="1.6" fill={c.accent} />
          <circle cx="36" cy="39" r="1.6" fill={c.accent} />
        </svg>
      );
    case "Vest":
      return (
        <svg {...common}>
          <path d="M22 8c1.7 5 5 7 10 7s8.3-2 10-7l8 7-4 34H18l-4-34 8-7Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M25 10c1.3 6 3.8 10 7 10s5.7-4 7-10" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M17 18c4 3 6 7 6 12M47 18c-4 3-6 7-6 12" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "Tank Top":
      return (
        <svg {...common}>
          <path d="M24 8h16c0 7 3 12 8 16l-4 25H20l-4-25c5-4 8-9 8-16Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M26 10c.8 6 2.8 9 6 9s5.2-3 6-9" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M20 25c4 2 8 3 12 3s8-1 12-3" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "Hat":
      return (
        <svg {...common}>
          <path d="M14 38c0-15 36-15 36 0H14Z" fill={c.green} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="10" y="36" width="44" height="9" rx="4.5" fill={c.fill} stroke={c.ink} strokeWidth="3" />
          <path d="M22 35c.5-6 4-10 10-10s9.5 4 10 10" stroke={c.ink} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "Scarf":
      return (
        <svg {...common}>
          <path d="M25 6h14v37c0 5-3.2 8-7 8s-7-3-7-8V6Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M25 16h14M25 26h14M25 36h14" stroke={c.accent} strokeWidth="3" />
          <path d="M27 51v-5M32 51v-5M37 51v-5" stroke={c.ink} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "Cowl":
      return (
        <svg {...common}>
          <ellipse cx="32" cy="29" rx="23" ry="16" fill={c.green} fillOpacity=".28" stroke={c.ink} strokeWidth="3" />
          <ellipse cx="32" cy="29" rx="13" ry="8" fill="#fffaf0" stroke={c.ink} strokeWidth="3" />
          <path d="M12 28c7 5 33 5 40 0" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Mittens":
      return (
        <svg {...common}>
          <path d="M22 49h19V22c0-7-4-12-10-12s-10 5-10 12v12l-6-6c-3-3-8 2-5 6l12 15Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 41h19" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Gloves":
      return (
        <svg {...common}>
          <path d="M14 50h18V27c0-2-3-2-3 0v7h-3V19c0-2.4-3.8-2.4-3.8 0v15h-3V21c0-2.4-3.8-2.4-3.8 0v15h-3V25c0-2.4-3.8-2.4-3.8 0v15l-3-3c-2-2-5.5 1-3.4 4.2L14 50Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M36 50h18l10.8-8.8c2.1-3.2-1.4-6.2-3.4-4.2l-3 3V25c0-2.4-3.8-2.4-3.8 0v11h-3V21c0-2.4-3.8-2.4-3.8 0v13h-3V19c0-2.4-3.8-2.4-3.8 0v15h-3v-7c0-2-3-2-3 0v23Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M14 43h18M36 43h18" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Socks":
      return (
        <svg {...common}>
          <path d="M22 7h18v27c0 7 8 4 8 11 0 5-5 8-13 8-9 0-13-6-13-14V7Z" fill={c.blue} fillOpacity=".35" stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 16h18M22 24h18" stroke={c.accent} strokeWidth="3" />
        </svg>
      );
    case "Shawl":
      return (
        <svg {...common}>
          <path d="M32 7 8 49h48L32 7Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 16 18 42M32 16l14 26M18 42h28" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "Tote Bag":
      return (
        <svg {...common}>
          <path d="M17 23h30l-3 27H20l-3-27Z" fill={c.green} fillOpacity=".32" stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M24 23c0-8 16-8 16 0" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M22 32h20" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Dishcloth":
    case "Baby Blanket":
    case "Throw Blanket":
      return (
        <svg {...common}>
          <rect x="11" y="9" width="42" height="38" rx="4" fill={c.fill} stroke={c.ink} strokeWidth="3" />
          <path d="M11 22h42M11 34h42M25 9v38M39 9v38" stroke={c.accent} strokeWidth="2.5" />
          {normalized === "Baby Blanket" && <path d="M23 28h18" stroke={c.green} strokeWidth="4" strokeLinecap="round" />}
        </svg>
      );
    case "Headband":
      return (
        <svg {...common}>
          <path d="M13 30c5-10 33-10 38 0-5 10-33 10-38 0Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 30c4-4 20-4 24 0" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "Leg Warmers":
      return (
        <svg {...common}>
          <path d="M17 9h12l-2 40H15L17 9Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M36 9h12l2 40H38L36 9Z" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M17 18h11M16 40h11M36 18h12M38 40h11" stroke={c.accent} strokeWidth="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="13" y="12" width="38" height="32" rx="6" fill={c.fill} stroke={c.ink} strokeWidth="3" strokeDasharray="6 4" />
          <path d="M24 28h16M32 20v16" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}
