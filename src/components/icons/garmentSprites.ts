/**
 * garmentSprites.ts — one picture per garment.
 *
 * Authored as ASCII so the silhouette can be reviewed by looking at it. See
 * pixelSprite.ts for the character set: `#` outline, `y` fabric, `a` contrast
 * (ribbing, bands, heels), `h` accent (buttons, pompom), `t` hardware (hoop,
 * handles, needle), `g` faint ground, `.` transparent.
 *
 * Every sprite is 20x20. The test asserts that no two garments rasterise
 * identically, because the bug being fixed here is that the old icons did not
 * read as the garments they named.
 *
 * WHERE TWO GARMENTS COULD BE CONFUSED, the distinguishing feature is
 * deliberate and called out in a comment above the art. That is the whole job:
 * a glove is not a mitten because you can see the fingers.
 */

import type { SpriteArt } from "./pixelSprite";

/** Crew neck, set-in sleeves, ribbed hem and cuffs. No front opening. */
const SWEATER: SpriteArt = [
  "....................",
  ".....##########.....",
  "....#yyy####yyy#....",
  "...#yyyy#..#yyyy#...",
  "..##yyyyy##yyyyy##..",
  ".#aayyyyyyyyyyyyaa#.",
  ".#aayyyyyyyyyyyyaa#.",
  ".#aayyyyyyyyyyyyaa#.",
  ".###yyyyyyyyyyyy###.",
  "...#yyyyyyyyyyyy#...",
  "...#yyyyyyyyyyyy#...",
  "...#yyyyyyyyyyyy#...",
  "...#yyyyyyyyyyyy#...",
  "...#yyyyyyyyyyyy#...",
  "...#aaaaaaaaaaaa#...",
  "...#aaaaaaaaaaaa#...",
  "...##############...",
  "....................",
  "....................",
  "....................",
];

/** Sweater plus a CENTRE FRONT OPENING and buttons — that is the difference. */
const CARDIGAN: SpriteArt = [
  "....................",
  ".....##########.....",
  "....#yyy####yyy#....",
  "...#yyyy#..#yyyy#...",
  "..##yyyy#hh#yyyy##..",
  ".#aayyyyy#h#yyyyaa#.",
  ".#aayyyyy#h#yyyyaa#.",
  ".#aayyyyy#h#yyyyaa#.",
  ".###yyyyy#h#yyyy###.",
  "...#yyyyy#h#yyyy#...",
  "...#yyyyy#h#yyyy#...",
  "...#yyyyy#h#yyyy#...",
  "...#yyyyy#h#yyyy#...",
  "...#yyyyy#h#yyyy#...",
  "...#aaaaa#h#aaaa#...",
  "...#aaaaa#h#aaaa#...",
  "...##############...",
  "....................",
  "....................",
  "....................",
];

/** Sleeveless, with deep armholes cut into the sides. */
const VEST: SpriteArt = [
  "....................",
  "....##########......",
  "...#yyy####yyy#.....",
  "...#yy#....#yy#.....",
  "..##yy#....#yy##....",
  "..#yyy#....#yyy#....",
  "..#yyyy#..#yyyy#....",
  "..#yyyyy##yyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#aaaaaaaaaaaa#....",
  "..#aaaaaaaaaaaa#....",
  "..##############....",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Narrow straps and a scooped neck — not a vest's shoulder seam. */
const TANK_TOP: SpriteArt = [
  "....................",
  "....##......##......",
  "....#a#....#a#......",
  "....#a#....#a#......",
  "....#a#....#a#......",
  "...##a######a##.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#yyyyyyyyyy#.....",
  "...#aaaaaaaaaa#.....",
  "...############.....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Domed crown, turned-up ribbed brim, pompom on top. */
const HAT: SpriteArt = [
  ".........hh.........",
  "........#hh#........",
  ".........##.........",
  "......########......",
  ".....#yyyyyyyy#.....",
  "....#yyyyyyyyyy#....",
  "...#yyyyyyyyyyyy#...",
  "..#yyyyyyyyyyyyyy#..",
  "..#yyyyyyyyyyyyyy#..",
  ".#yyyyyyyyyyyyyyyy#.",
  ".#yyyyyyyyyyyyyyyy#.",
  ".#aaaaaaaaaaaaaaaa#.",
  ".#aaaaaaaaaaaaaaaa#.",
  ".#aaaaaaaaaaaaaaaa#.",
  ".##################.",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A long flat strip with fringe at the bottom. One piece, hanging. */
const SCARF: SpriteArt = [
  "......######........",
  "......#yyyy#........",
  "......#aaaa#........",
  "......#yyyy#........",
  "......#yyyy#........",
  "......#aaaa#........",
  "......#yyyy#........",
  "......#yyyy#........",
  "......#aaaa#........",
  "......#yyyy#........",
  "......#yyyy#........",
  "......#aaaa#........",
  "......#yyyy#........",
  "......#yyyy#........",
  "......######........",
  "......#.#.#.........",
  "......#.#.#.........",
  "......#.#.#.........",
  "....................",
  "....................",
];

/** A closed loop seen at an angle — a tube, not a flat strip. */
const COWL: SpriteArt = [
  "....................",
  "....############....",
  "..##yyyyyyyyyyyy##..",
  ".#yyyyyyyyyyyyyyyy#.",
  ".#yy##########yyyy#.",
  ".#y##........##yyy#.",
  ".#y#..........#yyy#.",
  ".#y#..........#yyy#.",
  ".#y#..........#yyy#.",
  ".#y#..........#yyy#.",
  ".#y##........##yyy#.",
  ".#yy##########yyyy#.",
  ".#aaaaaaaaaaaaaaaa#.",
  "..##aaaaaaaaaaaa##..",
  "....############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A PAIR, each with a thumb and NO separate fingers. Compare GLOVES. */
const MITTENS: SpriteArt = [
  "....................",
  "..####......####....",
  ".#yyyy#....#yyyy#...",
  "#yyyyyy#..#yyyyyy#..",
  "#yyyyyy#..#yyyyyy#..",
  "#yyyyyy#..#yyyyyy#..",
  "#yyyyyy##.#yyyyyy#..",
  "#yyyyyy#y##yyyyyy#..",
  "#yyyyyy#yy#yyyyyy#..",
  "#yyyyyyyyy#yyyyyy#..",
  "#yyyyyyyy#.#yyyyyy#.",
  ".#yyyyyy#..#yyyyyy#.",
  ".#aaaaaa#..#aaaaaa#.",
  ".#aaaaaa#..#aaaaaa#.",
  ".########..########.",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** FOUR SEPARATE FINGERS plus a thumb. This is what makes it not a mitten. */
const GLOVES: SpriteArt = [
  "....................",
  "..#.#.#.#...#.#.#.#.",
  ".#y#y#y#y#.#y#y#y#y#",
  ".#y#y#y#y#.#y#y#y#y#",
  ".#yyyyyyy#.#yyyyyyy#",
  "#yyyyyyyy#.#yyyyyyy#",
  "#y#yyyyyy#.#yyyyyy#y",
  "#yy#yyyyy#.#yyyyy#yy",
  "#yyy#yyyy#.#yyyy#yyy",
  ".#yyyyyyy#.#yyyyyyy#",
  ".#yyyyyyy#.#yyyyyyy#",
  ".#aaaaaaa#.#aaaaaaa#",
  ".#aaaaaaa#.#aaaaaaa#",
  ".#########.#########",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** An L-shaped foot with a contrast heel and toe. */
const SOCKS: SpriteArt = [
  "....................",
  "...######...........",
  "...#aaaa#...........",
  "...#aaaa#...........",
  "...#yyyy#...........",
  "...#yyyy#...........",
  "...#yyyy#...........",
  "...#yyyy#...........",
  "...#yyyy#...........",
  "...#yyyy#####.......",
  "...#yyyyyyyy###.....",
  "...#yyyyyyyyyy##....",
  "...#aayyyyyyyyaa#...",
  "...#aayyyyyyyyaa#...",
  "...###############..",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A triangle, point down — the shape a shawl is worked to. */
const SHAWL: SpriteArt = [
  "....................",
  "####################",
  ".#aaaaaaaaaaaaaaaa#.",
  ".#yyyyyyyyyyyyyyyy#.",
  "..#yyyyyyyyyyyyyy#..",
  "..#yyyyyyyyyyyyyy#..",
  "...#yyyyyyyyyyyy#...",
  "...#yyyyyyyyyyyy#...",
  "....#yyyyyyyyyy#....",
  "....#yyyyyyyyyy#....",
  ".....#yyyyyyyy#.....",
  ".....#yyyyyyyy#.....",
  "......#yyyyyy#......",
  "......#yyyyyy#......",
  ".......#yyyy#.......",
  ".......#yyyy#.......",
  "........#yy#........",
  "........#yy#........",
  ".........##.........",
  "....................",
];

/** Small, soft, with a motif in the middle. Compare THROW_BLANKET. */
const BABY_BLANKET: SpriteArt = [
  "....................",
  "....############....",
  "....#aaaaaaaaaa#....",
  "....#ayyyyyyyya#....",
  "....#ayyyyyyyya#....",
  "....#ayyyhhyyya#....",
  "....#ayyhhhhyya#....",
  "....#ayyhhhhyya#....",
  "....#ayyyhhyyya#....",
  "....#ayyyyyyyya#....",
  "....#ayyyyyyyya#....",
  "....#aaaaaaaaaa#....",
  "....############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Large, folded over itself — the drape is what says "throw". */
const THROW_BLANKET: SpriteArt = [
  "....................",
  "..################..",
  "..#aaaaaaaaaaaaaa#..",
  "..#yyyyyyyyyyyyyy#..",
  "..#ygygygygygygy#...",
  "..#yyyyyyyyyyyyyy#..",
  "..#ygygygygygygy#...",
  "..#yyyyyyyyyyyyyy#..",
  "..#ygygygygygygy#...",
  "..#yyyyyyyyyyyyyy#..",
  "..#aaaaaaaaaaaaaa#..",
  "..################..",
  "....##########......",
  "....#yyyyyyyy#......",
  "....#gygygyg#.......",
  "....#########.......",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A bag body with two handles above it. */
const TOTE_BAG: SpriteArt = [
  "....................",
  "....tt......tt......",
  "...t..t....t..t.....",
  "...t..t....t..t.....",
  "...t..t....t..t.....",
  "..##t##tttt##t##....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yaaaaaaaaaay#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..#yaaaaaaaaaay#....",
  "..#yyyyyyyyyyyy#....",
  "..#yyyyyyyyyyyy#....",
  "..##############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A small textured square. Plain and flat — that is the whole garment. */
const DISHCLOTH: SpriteArt = [
  "....................",
  "....############....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A band worn round the head: a loop, wide in front, narrow at the back. */
const HEADBAND: SpriteArt = [
  "....................",
  "....................",
  "....############....",
  "..##aaaaaaaaaaaa##..",
  ".#yyyyyyyyyyyyyyyy#.",
  "#yyyyyyyyyyyyyyyyyy#",
  "#yyyy##########yyyy#",
  "#yyy#..........#yyy#",
  "#yyy#..........#yyy#",
  "#yyyy##########yyyy#",
  "#yyyyyyyyyyyyyyyyyy#",
  ".#yyyyyyyyyyyyyyyy#.",
  "..##aaaaaaaaaaaa##..",
  "....############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A TAPERED PAIR with ribbed ends — wider at the calf. Compare SCARF. */
const LEG_WARMERS: SpriteArt = [
  "....................",
  "..######....######..",
  "..#aaaa#....#aaaa#..",
  "..#yyyy#....#yyyy#..",
  "..#yyyy#....#yyyy#..",
  "..#yyyy#....#yyyy#..",
  "..#yyyy#....#yyyy#..",
  "...#yyy#....#yyy#...",
  "...#yyy#....#yyy#...",
  "...#yyy#....#yyy#...",
  "....#yy#....#yy#....",
  "....#yy#....#yy#....",
  "....#yy#....#yy#....",
  "....#aa#....#aa#....",
  "....####....####....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/* -------------------------------------------------------------------------- */
/* Cross stitch makes — these are not garments and must not look like them.    */
/* -------------------------------------------------------------------------- */

/** A worked sampler: gridded ground with stitched motifs. */
const SAMPLER: SpriteArt = [
  "....................",
  "...##############...",
  "...#gggggggggggg#...",
  "...#ghhgggggghgg#...",
  "...#gghhggghhggg#...",
  "...#gggahhahgggg#...",
  "...#ggaaahaaaggg#...",
  "...#gggahhahgggg#...",
  "...#gghhggghhggg#...",
  "...#ghhgggggghgg#...",
  "...#gggggggggggg#...",
  "...#gyygyygyygyg#...",
  "...#gggggggggggg#...",
  "...##############...",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Fabric held in a round hoop — the hoop is the whole identity. */
const HOOP_ART: SpriteArt = [
  "........tttt........",
  "......tt####tt......",
  ".....t########t.....",
  "....t##gggggg##t....",
  "...t##gggahggg##t...",
  "...t#ggghahgggg#t...",
  "..t##ggahhhagg##t...",
  "..t#gggghahggggg#t..",
  "..t#ggggahhagggg#t..",
  "..t#gggggahgggggg#t.",
  "..t##ggggggggg##t...",
  "...t##gggggggg##t...",
  "....t##ggggg##t.....",
  ".....t######t.......",
  "......tttttt........",
  "........tt..........",
  "........tt..........",
  "....................",
  "....................",
  "....................",
];

/** A narrow strip with a tassel — long and thin, unlike a sampler. */
const BOOKMARK: SpriteArt = [
  ".......####.........",
  ".......#gg#.........",
  ".......#hg#.........",
  ".......#gh#.........",
  ".......#gg#.........",
  ".......#hg#.........",
  ".......#gh#.........",
  ".......#gg#.........",
  ".......#hg#.........",
  ".......#gh#.........",
  ".......#gg#.........",
  ".......#hg#.........",
  ".......#gh#.........",
  ".......####.........",
  ".......#..#.........",
  ".......#..#.........",
  "........tt..........",
  "........tt..........",
  "....................",
  "....................",
];

/** A hanging shape with a loop at the top. */
const ORNAMENT: SpriteArt = [
  "........tt..........",
  "........tt..........",
  ".......t..t.........",
  "......##..##........",
  ".....##gggg##.......",
  "....##gghhgg##......",
  "...##ggghhggg##.....",
  "..##gghhhhhhgg##....",
  "..#ggghhhhhhggg#....",
  "..#gghhhhhhhhgg#....",
  "..#ggghhhhhhggg#....",
  "..##gghhhhhhgg##....",
  "...##ggghhggg##.....",
  "....##gghhgg##......",
  ".....##gggg##.......",
  "......######........",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A mounted piece: a frame around worked fabric. */
const FRAMED_PICTURE: SpriteArt = [
  "....................",
  "..tttttttttttttttt..",
  "..t##############t..",
  "..t#gggggggggggg#t..",
  "..t#ggghhhhhgggg#t..",
  "..t#gghhhhhhhggg#t..",
  "..t#gghhaaahhggg#t..",
  "..t#gghhaaahhggg#t..",
  "..t#gghhhhhhhggg#t..",
  "..t#ggghhhhhgggg#t..",
  "..t#gggggggggggg#t..",
  "..t##############t..",
  "..tttttttttttttttt..",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** A plump square with corner tassels. */
const CUSHION: SpriteArt = [
  "....................",
  "..t##############t..",
  "..################..",
  "..#yyyyyyyyyyyyyy#..",
  "..#yyghhhhhhhhgyy#..",
  "..#ygghhhhhhhhggy#..",
  "..#yghhhaaaahhhgy#..",
  "..#yghhhaaaahhhgy#..",
  "..#ygghhhhhhhhggy#..",
  "..#yyghhhhhhhhgyy#..",
  "..#yyyyyyyyyyyyyy#..",
  "..################..",
  "..t##############t..",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Anything else: a plain worked swatch, honestly generic. */
const OTHER: SpriteArt = [
  "....................",
  "....................",
  "....############....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....#ayayayayay#....",
  "....#yayayayaya#....",
  "....############....",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
];

/** Keyed by GARMENT_TYPES value. */
export const GARMENT_SPRITES: Record<string, SpriteArt> = {
  Sweater: SWEATER,
  Cardigan: CARDIGAN,
  Vest: VEST,
  "Tank Top": TANK_TOP,
  Hat: HAT,
  Scarf: SCARF,
  Cowl: COWL,
  Mittens: MITTENS,
  Gloves: GLOVES,
  Socks: SOCKS,
  Shawl: SHAWL,
  "Baby Blanket": BABY_BLANKET,
  "Throw Blanket": THROW_BLANKET,
  "Tote Bag": TOTE_BAG,
  Dishcloth: DISHCLOTH,
  Headband: HEADBAND,
  "Leg Warmers": LEG_WARMERS,
  Sampler: SAMPLER,
  "Hoop Art": HOOP_ART,
  Bookmark: BOOKMARK,
  Ornament: ORNAMENT,
  "Framed Picture": FRAMED_PICTURE,
  Cushion: CUSHION,
  Other: OTHER,
};

/** Aliases the app has used for the same make. */
export const SPRITE_ALIASES: Record<string, string> = {
  "Hat / Beanie": "Hat",
  Beanie: "Hat",
  Pullover: "Sweater",
  Jumper: "Sweater",
  Blanket: "Throw Blanket",
};

export function spriteFor(type: string): SpriteArt {
  return (
    GARMENT_SPRITES[type] ??
    GARMENT_SPRITES[SPRITE_ALIASES[type] ?? ""] ??
    GARMENT_SPRITES.Other
  );
}
