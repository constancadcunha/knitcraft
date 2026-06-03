import type { StitchEntry } from "@/lib/craftKnowledge";

type StitchImageEntry = Pick<StitchEntry, "id" | "craftType">;

const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";
const COMMONS_THUMB = `${COMMONS}/thumb`;

const KNIT_PHOTO = `${COMMONS}/5/58/Stockinette.jpg`;
const KNIT_BACK_PHOTO = `${COMMONS}/0/0b/Stockinette_example_back.JPG`;
const CROCHET_PHOTO = `${COMMONS_THUMB}/d/d9/Single_Crochet_Stitch.jpg/960px-Single_Crochet_Stitch.jpg`;
const CROCHET_CHAIN = `${COMMONS_THUMB}/4/45/Crochet_Chain_Stitch.jpg/960px-Crochet_Chain_Stitch.jpg`;
const DOUBLE_CROCHET = `${COMMONS_THUMB}/2/2e/Double_Crochet.jpg/960px-Double_Crochet.jpg`;
const HALF_DOUBLE_CROCHET = `${COMMONS_THUMB}/7/7b/Half_double_Crochet.jpg/960px-Half_double_Crochet.jpg`;
const TREBLE_CROCHET = `${COMMONS_THUMB}/3/33/Crochet_Treble.jpg/960px-Crochet_Treble.jpg`;
const SLIP_STITCH_CROCHET = `${COMMONS_THUMB}/1/1a/Crochet_Slip_Stitch.jpg/960px-Crochet_Slip_Stitch.jpg`;
const CROCHET_BLANKET_CLOSEUP = `${COMMONS_THUMB}/5/5c/Crochet_blanket_in_progress_close-up.jpg/960px-Crochet_blanket_in_progress_close-up.jpg`;

const STITCH_PHOTOS: Record<string, string> = {
  knit: `${COMMONS}/5/59/Knit_stockinette_stitch.jpg`,
  purl: KNIT_BACK_PHOTO,
  stockinette: KNIT_PHOTO,
  garter: `${COMMONS}/c/c8/R%C3%A4tstickning.jpg`,
  ribbing: `${COMMONS}/b/b5/Ribbstickning.jpg`,
  seed: `${COMMONS}/c/ca/Seed_stitch_beret.jpg`,
  moss: `${COMMONS}/2/2a/Moss_stitch.jpg`,
  cable: `${COMMONS}/a/a5/Fl%C3%A4tstickning.jpg`,
  "yarn-over": `${COMMONS}/4/4c/Lace_Close_Up.jpg`,
  k2tog: KNIT_PHOTO,
  increase: KNIT_PHOTO,
  "slipped-stitch": `${COMMONS}/a/a8/Slip_Stitch.jpg`,
  brioche: `${COMMONS}/2/29/Patentstickning.jpg`,
  "short-rows": KNIT_PHOTO,
  "stranded-colourwork": `${COMMONS}/4/4c/Knitting_red_courses_stockinette_garter.png`,
  lace: `${COMMONS}/4/4c/Lace_Close_Up.jpg`,
  icord: KNIT_PHOTO,
  "magic-ring": `${COMMONS}/f/f7/Szyde%C5%82kowe_magiczne_k%C3%B3%C5%82ko.jpg`,
  "single-crochet": CROCHET_PHOTO,
  "slip-stitch-crochet": SLIP_STITCH_CROCHET,
  "half-double-crochet": HALF_DOUBLE_CROCHET,
  "double-crochet": DOUBLE_CROCHET,
  "treble-crochet": TREBLE_CROCHET,
  "crochet-decrease": `${COMMONS_THUMB}/e/eb/Singlestitch.jpg/640px-Singlestitch.jpg`,
  "bobble-stitch": `${COMMONS}/3/39/Crocheted_bobble_edging.jpg`,
  "puff-stitch": CROCHET_BLANKET_CLOSEUP,
  "v-stitch": `${COMMONS}/5/5e/Florence_home_needle-work_%281895%29_%2814582735197%29.jpg`,
  "crochet-moss": `${COMMONS}/5/5e/Florence_home_needle-work_%281895%29_%2814582735197%29.jpg`,
  "crochet-ribbing": "https://media.craftyarncouncil.com/images/learn/single_crochet_9.jpg",
  "granny-square": `${COMMONS_THUMB}/9/96/Granny_square.jpg/640px-Granny_square.jpg`,
  "shell-stitch": `${COMMONS}/b/b2/Scallop_edge%2C_also_known_as_shell_stitch_border.jpg`,
};

const TECHNIQUE_PHOTOS: Record<string, string> = {
  "Cast on": `${COMMONS_THUMB}/5/55/Caston.jpg/960px-Caston.jpg`,
  "Bind off (cast off)": `${COMMONS}/5/59/Knit_stockinette_stitch.jpg`,
  "Reading flat charts": `${COMMONS}/4/4c/Knitting_red_courses_stockinette_garter.png`,
  "Gauge swatch": KNIT_PHOTO,
  Blocking: `${COMMONS_THUMB}/1/1a/Blocking2.jpg/960px-Blocking2.jpg`,
  "Mattress stitch seam": `${COMMONS}/a/a8/Slip_Stitch.jpg`,
  "Picking up stitches": `${COMMONS}/5/59/Knit_stockinette_stitch.jpg`,
  "Patch pockets": `${COMMONS}/b/b5/Ribbstickning.jpg`,
  "Foundation chain": CROCHET_CHAIN,
  "Turning chain": HALF_DOUBLE_CROCHET,
  "Fasten off": CROCHET_PHOTO,
  "Working in the round": `${COMMONS}/f/f7/Szyde%C5%82kowe_magiczne_k%C3%B3%C5%82ko.jpg`,
  "Reading crochet charts": `${COMMONS_THUMB}/9/96/Granny_square.jpg/640px-Granny_square.jpg`,
  "Seaming crochet pieces": SLIP_STITCH_CROCHET,
};

const STITCH_VIDEO_IDS: Record<string, string> = {
  "magic-ring": "__1zTPAJ_As",
  "stranded-colourwork": "XSusihL_vbw",
};

export function stitchDisplayImage(stitch: StitchImageEntry): string {
  return STITCH_PHOTOS[stitch.id] ?? (stitch.craftType === "crocheting" ? CROCHET_PHOTO : KNIT_PHOTO);
}

export function techniqueDisplayImage(title: string, craftType: StitchImageEntry["craftType"]): string {
  return TECHNIQUE_PHOTOS[title] ?? (craftType === "crocheting" ? CROCHET_PHOTO : KNIT_PHOTO);
}

export function stitchVideoEmbedUrl(stitch: StitchImageEntry): string | null {
  const id = STITCH_VIDEO_IDS[stitch.id];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
