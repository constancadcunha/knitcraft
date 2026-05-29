export type NamedColour = {
  name: string;
  hex: string;
  aliases: string[];
};

export const NAMED_COLOURS: NamedColour[] = [
  { name: "cream", hex: "#f5ede0", aliases: ["cream", "ivory", "off white", "oatmeal", "vanilla"] },
  { name: "white", hex: "#ffffff", aliases: ["white", "snow"] },
  { name: "black", hex: "#251a1c", aliases: ["black", "charcoal", "ink"] },
  { name: "grey", hex: "#9ca3af", aliases: ["grey", "gray", "silver", "slate"] },
  { name: "brown", hex: "#8b6347", aliases: ["brown", "espresso", "coffee", "chocolate"] },
  { name: "tan", hex: "#c4a07e", aliases: ["tan", "camel", "beige", "sand"] },
  { name: "red", hex: "#d94b42", aliases: ["red", "scarlet", "ruby", "crimson"] },
  { name: "pink", hex: "#f08aa0", aliases: ["pink", "blush", "rose"] },
  { name: "coral", hex: "#f26b5e", aliases: ["coral", "salmon", "peach"] },
  { name: "orange", hex: "#e8793e", aliases: ["orange", "tangerine", "rust"] },
  { name: "yellow", hex: "#ffd166", aliases: ["yellow", "gold", "mustard", "sunflower"] },
  { name: "green", hex: "#4fae68", aliases: ["green", "sage", "forest", "olive", "emerald"] },
  { name: "blue", hex: "#2c7be5", aliases: ["blue", "navy", "sky", "denim", "teal"] },
  { name: "purple", hex: "#9e7a8a", aliases: ["purple", "mauve", "lavender", "violet", "lilac"] },
];

const GARMENT_WORDS =
  "cardigan|sweater|pullover|jumper|vest|top|shawl|scarf|blanket|hat|beanie|cowl|sock|socks|mitten|mittens|glove|gloves|body|background|base";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractNamedColours(text: string): NamedColour[] {
  const lower = text.toLowerCase();
  const hits: Array<{ colour: NamedColour; index: number }> = [];

  for (const colour of NAMED_COLOURS) {
    const indexes = colour.aliases
      .map((alias) => lower.search(new RegExp(`\\b${escapeRegex(alias)}\\b`)))
      .filter((index) => index >= 0);
    if (indexes.length) hits.push({ colour, index: Math.min(...indexes) });
  }

  return hits
    .sort((a, b) => a.index - b.index)
    .map((hit) => hit.colour)
    .filter((colour, index, all) => all.findIndex((item) => item.name === colour.name) === index);
}

export function inferMainColour(text: string, colours: NamedColour[]): NamedColour | undefined {
  const lower = text.toLowerCase();
  for (const colour of colours) {
    const aliasPattern = colour.aliases.map(escapeRegex).join("|");
    const asGarment = new RegExp(`\\b(${aliasPattern})\\s+(${GARMENT_WORDS})\\b`).test(lower);
    const asBase = new RegExp(`\\b(main|base|background|body)\\s+(${aliasPattern})\\b`).test(lower);
    if (asGarment || asBase) return colour;
  }
  return undefined;
}

export function inferChartPalette(text: string): string[] {
  const colours = extractNamedColours(text);
  const motifText = text.toLowerCase();
  const main = inferMainColour(text, colours);
  const palette: string[] = [];

  if (main) palette.push(main.hex);
  else if (/star|celestial|moon|sun|spark/.test(motifText) && /stripe|striped|stripes/.test(motifText)) palette.push("#ffffff");
  else if (/night|goth|dark|black/.test(motifText)) palette.push("#251a1c");
  else if (colours.length > 0) palette.push("#f5ede0");
  else palette.push("#f5ede0");

  for (const colour of colours) {
    if (!palette.includes(colour.hex)) palette.push(colour.hex);
  }

  if (colours.length > 0) {
    return palette.slice(0, 10);
  }

  if (/star|celestial|moon|sun|spark/.test(motifText) && /stripe|striped|stripes/.test(motifText)) {
    for (const hex of ["#ffffff", "#d94b42", "#2c7be5"]) {
      if (!palette.includes(hex)) palette.push(hex);
    }
  } else if (/flower|floral|daisy|rose|garden|bloom/.test(motifText)) {
    for (const hex of ["#f08aa0", "#ffd166", "#4fae68"]) {
      if (!palette.includes(hex)) palette.push(hex);
    }
  } else if (/heart|love|valentine/.test(motifText)) {
    for (const hex of ["#d94b42", "#ffffff"]) {
      if (!palette.includes(hex)) palette.push(hex);
    }
  } else if (/star|celestial|moon|sun|spark/.test(motifText)) {
    for (const hex of ["#ffd166", "#ffffff", "#2c7be5"]) {
      if (!palette.includes(hex)) palette.push(hex);
    }
  } else if (palette.length === 1) {
    for (const hex of ["#8b6347", "#c9785c", "#4fae68", "#2c7be5"]) palette.push(hex);
  }

  return palette.slice(0, 10);
}

export function designTextFromParts(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join(" ").trim();
}

export function hasMotif(text: string, motif: "flower" | "heart" | "star" | "stripe" | "checker" | "wave" | "diamond" | "speckle") {
  const lower = text.toLowerCase();
  switch (motif) {
    case "flower": return /flower|floral|daisy|rose|garden|bloom/.test(lower);
    case "heart": return /heart|love|sweet|valentine/.test(lower);
    case "star": return /star|celestial|night|moon|spark|sun/.test(lower);
    case "stripe": return /stripe|striped|stripes/.test(lower);
    case "checker": return /check|checked|checker|plaid|gingham/.test(lower);
    case "wave": return /wave|wavy|ocean|ripple/.test(lower);
    case "diamond": return /argyle|diamond|fair isle|fairisle/.test(lower);
    case "speckle": return /speckle|speckled|dotted|dot|dots/.test(lower);
  }
}
