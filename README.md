# StitchCraft Studio

StitchCraft Studio is a full-stack Next.js app for designing, sizing, and working knitting and crochet projects. It combines gauge-based pattern drafting, a pixel-style chart editor, hands-free row tracking, a stitch reference, and a private project library.

## Features

- **Pattern Studio** turns a garment description or photo into a size-aware draft with materials, gauge, shaping, row instructions, and abbreviations. It shows whether the cloud designer or the built-in deterministic designer handled the brief, and the sizing engine works without an AI key.
- **Chart Editor** creates colourwork, cable, lace, and texture charts using garment-shaped templates. Sweater necklines, mirrored cardigan fronts, sleeve caps, hat crowns, toes, mitten tops, and shawl points are drawn as real worked-cell silhouettes rather than rectangular canvases.
- **Project Tracker** saves row, stitch, chart, checklist, assembly, and blocking progress.
- **Quick Learn** provides guided beginner courses, saved progress, practice checks, knitting and crochet technique guides, prerequisites, fabric behavior, terminology warnings, diagrams, and selected external videos.
- **Private workspace** stores projects without requiring an email address or sign-up. A private recovery code opens the same workspace on another device.

## Requirements

- Node.js 24
- npm 11 or newer

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local SQLite database is created at `data/stitchcraft.sqlite` and is ignored by Git.

To enable cloud-assisted design interpretation, create `.env.local`:

```dotenv
OPENROUTER_API_KEY=your_key_here
```

The key stays on the server. Never commit `.env.local` or paste the key into client-side code.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

GitHub Actions runs all three checks on every push and pull request. A green **Quality checks** workflow means the exact commit compiles as a production app.

## Deploy from GitHub

This project needs a Node.js server because it has API routes and a SQLite workspace database. **Do not deploy it to GitHub Pages**: Pages only serves static files, so saving, recovery codes, and optional AI drafting would not work.

The simplest GitHub-connected deployment is Railway:

1. Push the branch you want to publish to `https://github.com/constancadcunha/knitcraft`.
2. In Railway, choose **New Project → Deploy from GitHub repo**, select `knitcraft`, and select the production branch.
3. Railway reads `railway.json` and uses the included `Dockerfile`; no custom build or start command is needed.
4. Add a Railway volume mounted at `/app/data`. This is required so projects survive restarts and redeploys.
5. Add `OPENROUTER_API_KEY` under **Variables** if cloud-assisted drafting is wanted. The rest of the app works without it.
6. Set the health-check path to `/api/health`, generate a public domain, and deploy.
7. In GitHub, open **Actions** and confirm the latest **Quality checks** run is green. In Railway, confirm `https://YOUR-DOMAIN/api/health` returns `{"status":"ok"}`.

After the GitHub repository is connected, every push to the selected branch triggers a new deployment. Railway should be configured to deploy only after its GitHub checks pass.

### Production environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `STITCHCRAFT_DB_PATH` | Set by the Docker image | SQLite file at `/app/data/stitchcraft.sqlite` |
| `OPENROUTER_API_KEY` | No | Enables cloud-assisted interpretation of text and reference images |
| `PORT` | Set by the host | Port used by the Next.js server |

Back up the mounted `/app/data` volume before destructive infrastructure changes. Recovery codes grant access to a workspace and should be treated like passwords.

## Docker smoke test

```bash
docker build -t stitchcraft-studio .
docker run --rm -p 3000:3000 -v stitchcraft-data:/app/data stitchcraft-studio
```

Then open [http://localhost:3000](http://localhost:3000) or check [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the complete Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Create the production build |
| `npm start` | Start a locally built production server |

## Data and privacy

Projects are cached in browser storage and synchronized to the server-side SQLite database. The app uses a random recovery code rather than personal identity data. A reference image or design description is sent to OpenRouter only when cloud-assisted drafting is configured and the user starts generation; otherwise the local deterministic engine creates the pattern.
