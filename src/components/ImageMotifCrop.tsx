"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
export default function ImageMotifCrop({ src, onApply }: { src: string; onApply: (cropped: string) => void }) {
  const [box, setBox] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const [error, setError] = useState("");
  async function apply() {
    const image = new Image();
    image.src = src;
    try {
      await image.decode();
      const canvas = document.createElement("canvas");
      const sourceWidth = image.naturalWidth * box.width / 100;
      const sourceHeight = image.naturalHeight * box.height / 100;
      const scale = Math.min(1, 1200 / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale)); canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to read this picture.");
      context.drawImage(image, image.naturalWidth * box.left / 100, image.naturalHeight * box.top / 100, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      onApply(canvas.toDataURL("image/png")); setError("");
    } catch { setError("This picture could not be cropped. Try a JPEG or PNG."); }
  }
  return <div className="space-y-4"><h3 className="label">Choose the design area</h3><p className="text-sm text-ink-soft">Frame the motif itself, such as the lobster, to leave the sweater silhouette and photo background out of the chart.</p><div className="relative mx-auto w-fit max-w-full">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt="Source picture with selected motif area" className="max-h-72 max-w-full block" /><div className="pointer-events-none absolute border-2 border-cobalt bg-cobalt/10" style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }} />
    </div><div className="grid grid-cols-2 gap-4">{(["left", "top", "width", "height"] as const).map(key => <label key={key} className="text-sm capitalize">{key} · {box[key]}%<input type="range" className="block w-full" min={key === "width" || key === "height" ? 5 : 0} max={key === "left" ? 100 - box.width : key === "top" ? 100 - box.height : key === "width" ? 100 - box.left : 100 - box.top} value={box[key]} onChange={e => setBox({ ...box, [key]: Number(e.target.value) })} /></label>)}</div><Button variant="secondary" onClick={() => void apply()}>Use selected motif</Button>{error && <p role="alert">{error}</p>}</div>;
}
