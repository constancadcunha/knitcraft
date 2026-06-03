export type ImportedChart = {
  grid: number[][];
  colors: string[];
};

type ImageChartOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxColors?: number;
  crop?: "none" | "garment";
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

  const crop = options.crop ?? "none";
  const source = crop === "garment"
    ? {
        x: Math.round(image.width * 0.1),
        y: Math.round(image.height * 0.08),
        w: Math.round(image.width * 0.8),
        h: Math.round(image.height * 0.84),
      }
    : { x: 0, y: 0, w: image.width, h: image.height };

  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, width, height);

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

export async function photoPreviewToGarmentDesignChart(
  src: string,
  options: ImageChartOptions = {}
): Promise<ImportedChart> {
  const image = await loadImage(src);
  const width = options.maxWidth ?? 96;
  const height = options.maxHeight ?? 120;
  const maxColors = Math.max(2, options.maxColors ?? 8);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { grid: [[0]], colors: ["#f5ede0"] };

  const source = findGarmentBodyCrop(image);

  ctx.fillStyle = "#f5ede0";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const rawRowBase = Array.from({ length: height }, (_, row) => dominantRowColor(pixels, width, row));
  const bandedBase = mergeHorizontalGarmentBands(rawRowBase, height);
  const paletteRgb = buildGarmentPalette(pixels, width, height, bandedBase, maxColors);
  const colors = paletteRgb.map(rgbToHex);

  const grid = Array.from({ length: height }, (_, row) => {
    const baseIndex = nearestPaletteIndex(bandedBase[row], paletteRgb);
    return Array.from({ length: width }, () => baseIndex);
  });

  const left = Math.round(width * 0.18);
  const right = Math.round(width * 0.82);
  const top = Math.round(height * 0.08);
  const bottom = Math.round(height * 0.76);

  for (let row = top; row < bottom; row++) {
    const base = bandedBase[row];
    const baseLum = luminance(base);
    for (let col = left; col < right; col++) {
      const rgb = pixelAt(pixels, width, row, col);
      const diff = colorDistance(rgb, base);
      const lumDiff = Math.abs(luminance(rgb) - baseLum);
      const rgbSat = saturation(rgb);
      const baseSat = saturation(base);
      const darkInk = luminance(rgb) < baseLum - 44 && diff > 66;
      const lightInk = luminance(rgb) > baseLum + 54 && diff > 78;
      const colourMotif = Math.abs(rgbSat - baseSat) > 0.28 && diff > 78;
      const lightBandText = baseLum > 170 && luminance(rgb) < 135 && diff > 84;
      const saturatedOnLightBand = baseLum > 170 && rgbSat > 0.4 && diff > 108;
      if (baseLum > 170 && !(lightBandText || saturatedOnLightBand)) continue;
      const crispContrast = (darkInk || lightInk || colourMotif) && !isLikelyShadow(rgb, base);
      if (!crispContrast && lumDiff < 100) continue;
      grid[row][col] = nearestPaletteIndex(rgb, paletteRgb);
    }
  }

  return { grid: cleanupGarmentMotif(grid), colors };
}

function findGarmentBodyCrop(image: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const portrait = image.height >= image.width;
  const xRatio = portrait ? 0.06 : 0.08;
  const yRatio = portrait ? 0.14 : 0.16;
  const wRatio = portrait ? 0.88 : 0.84;
  const hRatio = portrait ? 0.70 : 0.66;
  return {
    x: Math.round(image.width * xRatio),
    y: Math.round(image.height * yRatio),
    w: Math.round(image.width * wRatio),
    h: Math.round(image.height * hRatio),
  };
}

function mergeHorizontalGarmentBands(rows: [number, number, number][], height: number): [number, number, number][] {
  const smoothed = rows.map((_, row) => medianRowColor(rows, row));
  const bands: Array<{ start: number; end: number; rgb: [number, number, number] }> = [];
  const minBand = Math.max(3, Math.round(height * 0.04));

  for (let row = 0; row < height; row++) {
    const rgb = smoothed[row];
    const last = bands[bands.length - 1];
    if (!last || colorDistance(last.rgb, rgb) > 48) {
      bands.push({ start: row, end: row, rgb });
    } else {
      const count = last.end - last.start + 1;
      last.rgb = [
        Math.round((last.rgb[0] * count + rgb[0]) / (count + 1)),
        Math.round((last.rgb[1] * count + rgb[1]) / (count + 1)),
        Math.round((last.rgb[2] * count + rgb[2]) / (count + 1)),
      ];
      last.end = row;
    }
  }

  for (let i = 1; i < bands.length - 1; i++) {
    const band = bands[i];
    if (band.end - band.start + 1 >= minBand) continue;
    const prev = bands[i - 1];
    const next = bands[i + 1];
    band.rgb = colorDistance(band.rgb, prev.rgb) < colorDistance(band.rgb, next.rgb) ? prev.rgb : next.rgb;
  }

  const result = [...smoothed];
  for (const band of bands) {
    for (let row = band.start; row <= band.end; row++) result[row] = band.rgb;
  }
  return result;
}

function cleanupGarmentMotif(grid: number[][]): number[][] {
  const preserved = preserveMotifEdges(grid);
  const height = preserved.length;
  const width = preserved[0]?.length ?? 0;
  const denoised = preserved.map((row, r) =>
    row.map((value, c) => {
      const same = neighboursMatching(preserved, r, c, value);
      if (same >= 3) return value;
      if (r < height * 0.08 || r > height * 0.82 || c < width * 0.12 || c > width * 0.88) {
        return dominantRowValue(preserved, r);
      }
      return value;
    })
  );
  return removeTinyMotifComponents(denoised);
}

function removeTinyMotifComponents(grid: number[][]): number[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const result = grid.map((row) => [...row]);
  const visited = new Set<string>();

  for (let row = 0; row < height; row++) {
    const base = dominantRowValue(grid, row);
    for (let col = 0; col < width; col++) {
      const key = `${row},${col}`;
      if (visited.has(key) || grid[row][col] === base) continue;
      const value = grid[row][col];
      const stack = [[row, col]];
      const cells: Array<[number, number]> = [];
      visited.add(key);
      while (stack.length) {
        const [r, c] = stack.pop()!;
        cells.push([r, c]);
        for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (rr < 0 || rr >= height || cc < 0 || cc >= width) continue;
          const nextKey = `${rr},${cc}`;
          if (visited.has(nextKey) || grid[rr][cc] !== value) continue;
          visited.add(nextKey);
          stack.push([rr, cc]);
        }
      }
      if (cells.length < 4) {
        for (const [r, c] of cells) result[r][c] = dominantRowValue(grid, r);
      }
    }
  }

  return result;
}

function neighboursMatching(grid: number[][], row: number, col: number, value: number): number {
  let count = 0;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r === row && c === col) continue;
      if (r < 0 || r >= grid.length || c < 0 || c >= (grid[0]?.length ?? 0)) continue;
      if (grid[r][c] === value) count++;
    }
  }
  return count;
}

function dominantRowValue(grid: number[][], row: number): number {
  const counts = new Map<number, number>();
  for (const value of grid[row] ?? []) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
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

function pixelAt(data: Uint8ClampedArray, width: number, row: number, col: number): [number, number, number] {
  const i = (row * width + col) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function dominantRowColor(data: Uint8ClampedArray, width: number, row: number): [number, number, number] {
  const buckets = new Map<string, { rgb: [number, number, number]; count: number }>();
  const left = Math.round(width * 0.18);
  const right = Math.round(width * 0.82);

  for (let col = left; col < right; col++) {
    const rgb = quantizeRgb(pixelAt(data, width, row, col), 24);
    const key = rgb.join(",");
    const current = buckets.get(key);
    if (current) current.count++;
    else buckets.set(key, { rgb, count: 1 });
  }

  return Array.from(buckets.values()).sort((a, b) => b.count - a.count)[0]?.rgb ?? [245, 237, 224];
}

function medianRowColor(rows: [number, number, number][], row: number): [number, number, number] {
  const start = Math.max(0, row - 2);
  const end = Math.min(rows.length - 1, row + 2);
  const values = rows.slice(start, end + 1);
  return [0, 1, 2].map((channel) => {
    const sorted = values.map((rgb) => rgb[channel]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }) as [number, number, number];
}

function buildGarmentPalette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rowBase: [number, number, number][],
  maxColors: number
): [number, number, number][] {
  const buckets = new Map<string, { rgb: [number, number, number]; count: number }>();

  for (const rgb of rowBase) addBucket(buckets, quantizeRgb(rgb, 24), 8);

  const left = Math.round(width * 0.14);
  const right = Math.round(width * 0.86);
  const top = Math.round(height * 0.08);
  const bottom = Math.round(height * 0.82);

  for (let row = top; row < bottom; row++) {
    const base = rowBase[row];
    for (let col = left; col < right; col++) {
      const rgb = pixelAt(data, width, row, col);
      if (colorDistance(rgb, base) > 72 && Math.abs(luminance(rgb) - luminance(base)) > 44) {
        addBucket(buckets, quantizeRgb(rgb, 24), 1);
      }
    }
  }

  const palette = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((entry) => entry.rgb);
  if (!palette.length) palette.push([245, 237, 224]);
  return palette;
}

function addBucket(
  buckets: Map<string, { rgb: [number, number, number]; count: number }>,
  rgb: [number, number, number],
  count: number
) {
  const key = rgb.join(",");
  const current = buckets.get(key);
  if (current) current.count += count;
  else buckets.set(key, { rgb, count });
}

function quantizeRgb(rgb: [number, number, number], step: number): [number, number, number] {
  return rgb.map((value) => Math.max(0, Math.min(255, Math.round(value / step) * step))) as [number, number, number];
}

function luminance(rgb: [number, number, number]): number {
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function saturation(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function isLikelyShadow(rgb: [number, number, number], base: [number, number, number]): boolean {
  const sameHueish = Math.abs(rgb[0] - base[0]) < 34 && Math.abs(rgb[1] - base[1]) < 34 && Math.abs(rgb[2] - base[2]) < 34;
  return sameHueish && luminance(rgb) < luminance(base);
}

function preserveMotifEdges(grid: number[][]): number[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  return grid.map((row, r) =>
    row.map((value, c) => {
      const counts = new Map<number, number>();
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (rr === r && cc === c) continue;
          if (rr < 0 || rr >= height || cc < 0 || cc >= width) continue;
          counts.set(grid[rr][cc], (counts.get(grid[rr][cc]) ?? 0) + 1);
        }
      }
      const same = counts.get(value) ?? 0;
      if (same > 0) return value;
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? value;
    })
  );
}
