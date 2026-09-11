import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ChartView from "@/components/chart/ChartView";
import { createChart } from "@/lib/chart";
import { applyMotif, type MotifKind } from "@/lib/motif";

const OUT = process.env.MOTIF_OUT ?? "/tmp/motifs.html";

it("renders every motif for eyeballing", () => {
  const kinds: MotifKind[] = ["colourwork", "cable", "lace", "texture"];
  const palette = ["#fffdf6", "#e2483d", "#2f6fd0", "#f2b53c"];

  const blocks = kinds.map((kind) => {
    const base = createChart({
      id: kind, name: kind, craft: "knitting", width: 24, height: 24, colors: palette.slice(),
    });
    const { chart, applied, reason } = applyMotif(base, { kind, palette, seed: `${kind}-demo` });
    const svg = renderToStaticMarkup(<ChartView chart={chart} cellSize={18} />);
    return `<section><h2>${kind}${applied ? "" : ` — NOT APPLIED (${reason})`}</h2>${svg}</section>`;
  });

  writeFileSync(
    OUT,
    `<style>
      body{font-family:system-ui;background:#f7efdd;color:#1f1b2e;padding:24px;margin:0}
      section{display:inline-block;margin:0 24px 24px 0;vertical-align:top}
      h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em}
      svg{border:3px solid #1f1b2e;background:#fffdf6}
    </style>${blocks.join("")}`
  );
  console.log(`wrote ${OUT}`);
});
