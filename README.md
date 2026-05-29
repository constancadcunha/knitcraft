# StitchCraft Studio

A knitting and crochet workspace for drafting patterns, designing shaped colourwork charts, tracking rows and stitches, and learning techniques.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If your shell cannot find Node but Homebrew installed it, run:

```bash
PATH="/opt/homebrew/bin:$PATH" npm run dev
```

## Optional Pattern Generation

The app works without a cloud key and will create a local gauge-first pattern draft. To enable cloud generation, add this to `.env.local`:

```bash
OPENROUTER_API_KEY=your_key_here
```

## GitHub Setup

1. Create a new empty repository on GitHub.
2. In this project folder, run:

```bash
git init
git add .
git commit -m "Initial StitchCraft Studio build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. Keep `.env.local` private. It is already ignored by Git.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
