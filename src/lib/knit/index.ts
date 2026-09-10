/**
 * The deterministic knitwear maths engine.
 *
 * This is the source of truth for every number in every pattern the app emits.
 * The LLM supplies design intent, motifs, naming and prose; it never does
 * arithmetic, and nothing it returns may override what these modules compute.
 *
 * The modules compose in one direction, so a garment construction reads:
 *
 *   1. sizes.ts    resolveSize("2-4yr") -> getBodyMeasurements(size)   [BODY, cm]
 *   2. ease.ts     applyEase(body, "pullover", "classic")              [FINISHED, cm]
 *   3. gauge.ts    stitchesForWidth(finishedCm / 2, gauge, { repeat }) [STITCHES]
 *                  rowsForHeight(finishedLengthCm, gauge)              [ROWS]
 *   4. shaping.ts  taperSchedule(cuffSts, upperSts, availableRows)     [WHEN TO SHAPE]
 *                  bindOffCurve(armholeSts) / evenlyDistributeIncreases(a, b)
 *                  runningStitchCounts(castOn, deltas)                 [VERIFY]
 *   5. yarn.ts     estimateYarn({ pieces, gauge }) -> ballsFor(m, yarn)[SHOPPING LIST]
 *
 * Nothing here imports React, Next, or anything from `src/app`. It is plain
 * TypeScript and is unit-tested in `./__tests__`.
 */

export * from "./units";
export * from "./sizes";
export * from "./ease";
export * from "./gauge";
export * from "./shaping";
export * from "./yarn";
