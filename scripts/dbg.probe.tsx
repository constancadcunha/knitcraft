import { it } from "vitest";
import { spriteCanvas } from "@/components/icons/pixelSprite";
import { PixelCanvas } from "@/lib/diagrams/primitives";

const HEX = { ink:"#000", paper:"none", grid:"#ccc", yarn:"#f00", yarnAlt:"#0f0", highlight:"#00f", tool:"#888", text:"#000" };

it("debug", () => {
  // A 4x4 square outline.
  const art = ["####", "#yy#", "#yy#", "####"];
  console.log("SPRITE SVG:", spriteCanvas(art).toSVG(HEX));

  // Same thing drawn directly, bypassing the sprite layer.
  const cv = new PixelCanvas(4, 4);
  for (let x = 0; x < 4; x++) { cv.px(x, 0, "ink"); cv.px(x, 3, "ink"); }
  cv.px(0,1,"ink"); cv.px(3,1,"ink"); cv.px(0,2,"ink"); cv.px(3,2,"ink");
  cv.px(1,1,"yarn"); cv.px(2,1,"yarn"); cv.px(1,2,"yarn"); cv.px(2,2,"yarn");
  console.log("DIRECT SVG:", cv.toSVG(HEX));
});
