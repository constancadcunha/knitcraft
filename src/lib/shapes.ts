export type ShapeFn = (row: number, col: number, w: number, h: number) => boolean;
export type RowShaping = Record<string, { start: number; width: number }>;

// Shape functions return true if a cell is inside the garment piece.
// Row 0 is the visual top of the garment, so necklines and collars live at the top.
const SHAPE_FUNCTIONS: Record<string, ShapeFn> = {
  rect: () => true,
  sweaterBack: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      const cut = Math.round((1 - t) * w * 0.14);
      if (col < cut || col >= w - cut) return false;
    }
    if (row < Math.floor(h * 0.13)) {
      const neckW = Math.round(w * 0.34);
      const neckL = Math.floor((w - neckW) / 2);
      if (col >= neckL && col < neckL + neckW) return false;
    }
    return true;
  },
  sweaterBackHighNeck: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      const cut = Math.round((1 - t) * w * 0.14);
      if (col < cut || col >= w - cut) return false;
    }
    if (row < Math.floor(h * 0.07)) {
      const neckW = Math.round(w * 0.22);
      const neckL = Math.floor((w - neckW) / 2);
      if (col >= neckL && col < neckL + neckW) return false;
    }
    return true;
  },
  sweaterFront: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      const cut = Math.round((1 - t) * w * 0.14);
      if (col < cut || col >= w - cut) return false;
    }
    const neckDepth = Math.max(1, Math.floor(h * 0.34));
    if (row < neckDepth) {
      const t = row / neckDepth;
      const neckHalf = Math.round((1 - t) * w * 0.20);
      const center = Math.floor(w / 2);
      if (Math.abs(col - center) <= neckHalf) return false;
    }
    return true;
  },
  sweaterFrontHighNeck: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      const cut = Math.round((1 - t) * w * 0.14);
      if (col < cut || col >= w - cut) return false;
    }
    const neckDepth = Math.max(1, Math.floor(h * 0.13));
    if (row < neckDepth) {
      const t = row / neckDepth;
      const neckHalf = Math.round((1 - t) * w * 0.14);
      const center = Math.floor(w / 2);
      if (Math.abs(col - center) <= neckHalf) return false;
    }
    return true;
  },
  cardiganFrontRight: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      if (col >= w - Math.round((1 - t) * w * 0.18)) return false;
    }
    const neckDepth = Math.max(1, Math.floor(h * 0.42));
    if (row < neckDepth) {
      const t = row / neckDepth;
      if (col < Math.round((1 - t) * w * 0.40)) return false;
    }
    return true;
  },
  cardiganFrontLeft: (row, col, w, h) => {
    const armholeEnd = Math.max(1, Math.floor(h * 0.30));
    if (row < armholeEnd) {
      const t = row / armholeEnd;
      if (col < Math.round((1 - t) * w * 0.18)) return false;
    }
    const neckDepth = Math.max(1, Math.floor(h * 0.42));
    if (row < neckDepth) {
      const t = row / neckDepth;
      if (col >= w - Math.round((1 - t) * w * 0.40)) return false;
    }
    return true;
  },
  sleeve: (row, col, w, h) => {
    const capEnd = Math.max(1, Math.floor(h * 0.28));
    if (row < capEnd) {
      const t = row / capEnd;
      const activeW = Math.round(w * (0.30 + t * 0.70));
      const offset = Math.floor((w - activeW) / 2);
      if (col < offset || col >= offset + activeW) return false;
    } else {
      const t = (row - capEnd) / Math.max(1, h - capEnd);
      const activeW = Math.round(w * (1 - t * 0.34));
      const offset = Math.floor((w - activeW) / 2);
      if (col < offset || col >= offset + activeW) return false;
    }
    return true;
  },
  hatCrown: (row, col, w, h) => {
    const t = row / h;
    const activeW = Math.max(2, Math.round(w * (0.22 + t * 0.78)));
    const offset = Math.floor((w - activeW) / 2);
    return col >= offset && col < offset + activeW;
  },
  triangleShawl: (row, col, w, h) => {
    const t = row / Math.max(1, h - 1);
    const activeW = Math.max(2, Math.round(w * t));
    const offset = Math.floor((w - activeW) / 2);
    return col >= offset && col < offset + activeW;
  },
  toe: (row, col, w, h) => {
    const cut = Math.round(((h - row) / h) * w * 0.30);
    return col >= cut && col < w - cut;
  },
  mittensHand: (row, col, w, h) => {
    if (row < Math.floor(h * 0.28)) {
      const t = row / Math.max(1, Math.floor(h * 0.28));
      const cut = Math.round((1 - t) * w * 0.28);
      if (col < cut || col >= w - cut) return false;
    }
    return true;
  },
  mittensThumb: (row, col, w, h) => {
    if (row < Math.floor(h * 0.40)) {
      const t = row / Math.max(1, Math.floor(h * 0.40));
      const cut = Math.round((1 - t) * w * 0.25);
      if (col < cut || col >= w - cut) return false;
    }
    return true;
  },
  collar: (row, col, w, h) => {
    const center = Math.floor(w / 2);
    const t = row / Math.max(1, h - 1);
    const outerHalf = Math.round(w * (0.42 - t * 0.08));
    const innerHalf = Math.round(w * (0.20 + t * 0.10));
    const dist = Math.abs(col - center);
    return dist <= outerHalf && dist >= innerHalf;
  },
  pocket: (row, col, w, h) => {
    const topBand = Math.max(1, Math.floor(h * 0.18));
    if (row < topBand) return col > 0 && col < w - 1;
    return true;
  },
};

// Map from "GarmentKey__SectionName" to shapeKey
const SECTION_SHAPE_MAP: Record<string, string> = {
  "Sweater__Back": "sweaterBack",
  "Sweater__Front": "sweaterFront",
  "Sweater__Collar": "collar",
  "Sweater__Neckband": "collar",
  "Sweater__Turtleneck Collar": "collar",
  "Sweater__Left Sleeve": "sleeve",
  "Sweater__Right Sleeve": "sleeve",
  "Pullover__Back": "sweaterBack",
  "Pullover__Front": "sweaterFront",
  "Pullover__Neckband": "collar",
  "Pullover__Turtleneck Collar": "collar",
  "Pullover__Left Sleeve": "sleeve",
  "Pullover__Right Sleeve": "sleeve",
  "Cardigan__Back": "sweaterBack",
  "Cardigan__Front Right": "cardiganFrontRight",
  "Cardigan__Front Left": "cardiganFrontLeft",
  "Cardigan__Button Band": "rect",
  "Cardigan__Front Bands": "rect",
  "Cardigan__Collar": "collar",
  "Cardigan__Neckband": "collar",
  "Cardigan__Shawl Collar": "collar",
  "Cardigan__Turtleneck Collar": "collar",
  "Cardigan__Hood": "rect",
  "Cardigan__Left Sleeve": "sleeve",
  "Cardigan__Right Sleeve": "sleeve",
  "Cardigan__Pocket": "pocket",
  "Vest__Back": "sweaterBack",
  "Vest__Front": "sweaterFront",
  "Vest__Neckband": "collar",
  "Vest__Armhole Bands": "rect",
  "Tank Top__Back": "sweaterBack",
  "Tank Top__Front": "sweaterFront",
  "Tank Top__Neckband": "collar",
  "Tank Top__Armhole Bands": "rect",
  "Hat__Hat Body": "hatCrown",
  "Hat__Brim": "rect",
  "Scarf__Scarf": "rect",
  "Cowl__Cowl Body": "rect",
  "Socks__Leg": "rect",
  "Socks__Heel Flap": "rect",
  "Socks__Foot": "rect",
  "Socks__Toe": "toe",
  "Mittens__Hand": "mittensHand",
  "Mittens__Thumb": "mittensThumb",
  "Mittens__Cuff": "rect",
  "Gloves__Hand": "mittensHand",
  "Gloves__Fingers": "rect",
  "Gloves__Thumb": "mittensThumb",
  "Gloves__Cuff": "rect",
  "Shawl__Shawl Body": "triangleShawl",
  "Baby Blanket__Blanket": "rect",
  "Throw Blanket__Blanket": "rect",
  "Tote Bag__Front": "rect",
  "Tote Bag__Back": "rect",
  "Tote Bag__Base": "rect",
  "Tote Bag__Straps": "rect",
  "Dishcloth__Cloth": "rect",
  "Headband__Headband": "rect",
  "Leg Warmers__Left Leg Warmer": "rect",
  "Leg Warmers__Right Leg Warmer": "rect",
  "Leg Warmers__Cuffs": "rect",
};

export function getShapeKey(garmentKey: string, sectionName: string): string {
  return SECTION_SHAPE_MAP[`${garmentKey}__${sectionName}`] ?? "rect";
}

export function isActiveCell(shapeKey: string | undefined, row: number, col: number, w: number, h: number): boolean {
  if (!shapeKey || shapeKey === "rect") return true;
  const fn = SHAPE_FUNCTIONS[shapeKey];
  if (!fn) return true;
  return fn(row, col, w, h);
}

export function isActiveChartCell(
  shapeKey: string | undefined,
  rowShaping: RowShaping | undefined,
  row: number,
  col: number,
  w: number,
  h: number
): boolean {
  const shapedRow = rowShaping?.[String(row)];
  if (shapedRow) {
    if (col < shapedRow.start || col >= shapedRow.start + shapedRow.width) return false;
  }
  return isActiveCell(shapeKey, row, col, w, h);
}
