import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InstructionBrowser from "../InstructionBrowser";
import { rowsFromWrittenInstructions } from "../instructionSections";
import type { Instruction } from "@/types";

/** A plain 60-row stockinette back, as `assemblePattern` would have written it. */
function longBook() {
  const lines: Instruction[] = [{ rowNumber: 0, text: "Cast on 106 sts." }];
  for (let row = 1; row <= 60; row += 1) {
    const side = row % 2 === 1 ? "RS" : "WS";
    lines.push({
      rowNumber: row,
      text: `Row ${row} (${side}): ${side === "RS" ? "k106" : "p106"}. (106 sts)`,
    });
  }
  return rowsFromWrittenInstructions(lines);
}

describe("InstructionBrowser", () => {
  it("shows one section at a time, not sixty rows at once", () => {
    const html = renderToStaticMarkup(<InstructionBrowser book={longBook()} />);
    expect(html).toContain("Row 1 (RS)");
    expect(html).not.toContain("Row 60 (WS)");
    expect(html).toContain("Section 1 of");
  });

  it("keeps the cast-on in front of the reader wherever they are", () => {
    const html = renderToStaticMarkup(<InstructionBrowser book={longBook()} activeRow={45} />);
    expect(html).toContain("Cast on 106 sts.");
  });

  it("opens on the section holding the row being worked and says so", () => {
    const html = renderToStaticMarkup(<InstructionBrowser book={longBook()} activeRow={45} />);
    expect(html).toContain("Row 45 (RS)");
    expect(html).not.toContain("Row 1 (RS)");
    expect(html).toContain("You are here");
  });

  it("offers every way of moving: a section list, prev/next and a jump box", () => {
    const html = renderToStaticMarkup(<InstructionBrowser book={longBook()} />);
    expect(html).toContain("Sections of this piece");
    expect(html).toContain("Prev");
    expect(html).toContain("Next");
    expect(html).toContain("Go to row");
    expect(html).toContain('placeholder="1–60"');
  });

  it("draws checkboxes only when rows can actually be ticked off", () => {
    const plain = renderToStaticMarkup(<InstructionBrowser book={longBook()} />);
    expect(plain).not.toContain('type="checkbox"');

    const tickable = renderToStaticMarkup(
      <InstructionBrowser
        book={longBook()}
        isRowWorked={(row) => row < 3}
        onToggleRow={() => {}}
      />
    );
    expect(tickable).toContain('type="checkbox"');
    expect(tickable).toContain("checked");
  });

  it("says something useful when a piece has no written rows", () => {
    const html = renderToStaticMarkup(
      <InstructionBrowser book={{ castOnText: null, rows: [] }} />
    );
    expect(html).toContain("no written rows");
  });
});
