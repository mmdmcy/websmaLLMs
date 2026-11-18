# websmaLLMs

Production notes for SEO and LLM discoverability:

- Public assets: `robots.txt`, `sitemap.xml`, `sitemap_index.xml`, `llms.txt`, social images.
- Headers via `public/_headers` for Cloudflare Pages and `vercel.json` for Vercel: global `X-Robots-Tag: index, follow`, CSP, HSTS, frame protection, and `noindex` for auth-like routes.
- Only submit `https://smallms.com/sitemap_index.xml` in GSC.
- Update `<lastmod>` in sitemaps when content changes.
- Keep canonical URLs at apex domain without trailing slash.

## Session workflow

This site now consumes the exported benchmark session bundle from `smaLLMs`.

Primary file:

- `public/data/latest-session.json`

Agent harness file:

- `public/data/agent-harness/latest.json`

Codex reasoning-effort file:

- `public/data/reasoning-efforts/latest.json`

The benchmark repo can mirror that file automatically when it exports a run:

- `../smaLLMs/website_exports/latest/session.json`
- mirrored to `public/data/latest-session.json`
- mirrored agent-harness summaries to `public/data/agent-harness/latest.json`
- mirrored Codex reasoning-effort sweeps to `public/data/reasoning-efforts/latest.json`

The UI supports two data paths:

- auto-load the mirrored `public/data/latest-session.json`
- manually import any exported `session.json` from the toolbar

## What the site renders

The session bundle is intentionally dense. The site reads and displays:

- run metadata and reproducibility info
- leaderboard rows across all models
- per-benchmark coverage and metric matrix
- per-evaluation metrics and artifact paths
- sample-level prompt, response, parsed answer, correctness, latency, tokens, and raw provider metadata
- coding-agent harness summaries with findings, pass/fail, duration, reported token usage, peak RSS, changed files, and quality signals
- Codex model/effort sweeps with per-variant pass rate, duration, reported tokens, file-scope signals, and explicit temperature metadata

## Stack

Plain HTML, CSS and JavaScript (native ES modules), with no dependencies, no npm packages and no build tool.
The whole site is the `public/` folder:

- `public/index.html`: the page, its SEO meta and the static header
- `public/css/style.css`: all styles
- `public/js/`: `main.js` (state, loading, controls), `data.js` (loading and checking the three JSON feeds),
  `feeds.js` (agent harness and reasoning-effort panels), `session.js` (summary, charts, leaderboard, matrix,
  environment, archive), `explorers.js` (evaluation and sample explorers), `charts.js` (the two SVG charts),
  `parts.js` (shared blocks), `format.js` (formatting), `html.js` (HTML building that escapes every value),
  `icons.js` (inline Lucide icons, ISC licence)
- `public/fonts/`: IBM Plex Mono, served from this site (SIL Open Font License, `OFL.txt`)

The Content-Security-Policy allows scripts only from this site, so the page has no inline scripts or inline event handlers.

## Local preview

No Node needed:

```sh
python3 -m http.server --bind 127.0.0.1 --directory public 8000
```

Then open http://127.0.0.1:8000.

## Deploy

Cloudflare Pages runs `npm run build`, which only copies `public/` into `dist/` (`rm`, `mkdir`, `cp`), and publishes `dist/`.
`package.json` has no dependencies; it exists only to carry that build script.
