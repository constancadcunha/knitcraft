export type ImportedChart = {
  grid: number[][];
  colors: string[];
};

type ImageChartOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxColors?: number;
};

export async function imagePreviewToChart(
  src: string,
  options: ImageChartOptions = {}
): Promise<ImportedChart> {
  const image = await loadImage(src);
  const maxWidth = options.maxWidth ?? 72;
  const maxHeight = options.maxHeight ?? 96;
  const maxColors = options.maxColors ?? 10;
  const aspect = image.width / Math.max(1, image.height);
  const width = aspect >= 1
    ? maxWidth
    : Math.max(12, Math.round(maxHeight * aspect));
  const height = aspect >= 1
    ? Math.max(12, Math.round(maxWidth / aspect))
    : maxHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { grid: [[0]], colors: ["#f5ede0"] };

  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, { rgb: [number, number, number]; count: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    const rgb: [number, number, number] = alpha < 0.1
      ? [245, 237, 224]
      : [pixels[i], pixels[i + 1], pixels[i + 2]];
    const bucket = rgb.map((value) => Math.max(0, Math.min(255, Math.round(value / 32) * 32))) as [number, number, number];
    const key = bucket.join(",");
    const current = buckets.get(key);
    if (current) current.count += 1;
    else buckets.set(key, { rgb: bucket, count: 1 });
  }

  const paletteRgb = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((entry) => entry.rgb);
  if (!paletteRgb.length) paletteRgb.push([245, 237, 224]);

  const colors = paletteRgb.map(rgbToHex);
  const grid = Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const i = (row * width + col) * 4;
      const rgb: [number, number, number] = pixels[i + 3] < 26
        ? [245, 237, 224]
        : [pixels[i], pixels[i + 1], pixels[i + 2]];
      return nearestPaletteIndex(rgb, paletteRgb);
    })
  );

  return { grid, colors };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });
}

function nearestPaletteIndex(rgb: [number, number, number], palette: [number, number, number][]): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  palette.forEach((candidate, index) => {
    const distance =
      (rgb[0] - candidate[0]) ** 2 +
      (rgb[1] - candidate[1]) ** 2 +
      (rgb[2] - candidate[2]) ** 2;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
