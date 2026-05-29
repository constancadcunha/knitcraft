# StitchCraft Studio

A web app for knitters and crocheters to plan, design, and track their projects.

## What it does

**Pattern Studio** - Describe or photograph a garment and StitchCraft drafts a complete knitting or crochet pattern: materials, gauge, sizing chart, section-by-section row instructions, and abbreviations. Every pattern automatically gets a linked project tracker.

**Chart Editor** - Draw custom colourwork charts on a grid, choose garment templates (sweater, cardigan, hat, socks, shawl, and more), pick yarn colours, and save finished designs to your library.

**Project tracker** - Follow your pattern step by step: mark rows and stitches as worked, check off the shopping list, work through start-up notes, track each chart section, and finish with assembly and blocking instructions.

**Stitch Dictionary (Quick Learn)** - A reference guide for knitting and crochet stitches: appearance, uses, step-by-step technique, video links, and chart symbol images. Covers everything from cast-on and basic stitches through cables, lace, brioche, stranded colourwork, and all major crochet stitches.

**My Library** - All saved patterns (from Pattern Studio) and all manually created charts (from Chart Editor) in one place. Continue any project with one tap.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If your shell cannot find Node but Homebrew installed it:

```bash
PATH="/opt/homebrew/bin:$PATH" npm run dev
```

## Optional: cloud pattern drafting

The app works without an API key and will create a gauge-based pattern draft. To let Pattern Studio try a cloud model first, add your OpenRouter key to `.env.local`:

```
OPENROUTER_API_KEY=your_key_here
```

## Scripts

```bash
npm run dev      # start dev server
npm run lint     # lint check
npm run build    # production build
```
