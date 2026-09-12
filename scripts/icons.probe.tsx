import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { spriteCanvas } from "@/components/icons/pixelSprite";
import { GARMENT_SPRITES } from "@/components/icons/garmentSprites";
import type { DiagramPalette } from "@/lib/diagrams/primitives";

const ACTIVE: DiagramPalette = {
  ink: "#1f1b2e", paper: "none", grid: "#efe4cb", yarn: "#f2b53c",
  yarnAlt: "#e2483d", highlight: "#2f6fd0", tool: "#5b5470", text: "#1f1b2e",
};

it("renders every garment icon", () => {
  const cells = Object.entries(GARMENT_SPRITES).map(([name, art]) => {
    const svg = spriteCanvas(art).toSVG(ACTIVE);
    return `<figure><div class="big">${svg}</div><div class="small">${svg}</div><figcaption>${name}</figcaption></figure>`;
  });
  writeFileSync(
    process.env.ICON_OUT ?? "/tmp/icons.html",
    `<style>
      body{font-family:system-ui;background:#f7efdd;color:#1f1b2e;margin:0;padding:20px;
           display:flex;flex-wrap:wrap;gap:14px}
      figure{margin:0;width:126px;border:3px solid #1f1b2e;background:#fffdf6;padding:8px;
             text-align:center}
      .big svg{width:96px;height:96px}
      .small svg{width:40px;height:40px}
      figcaption{font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-top:6px}
    </style>${cells.join("")}`
  );
});
