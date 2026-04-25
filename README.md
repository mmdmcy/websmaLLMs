# websmaLLMs

Production notes for SEO and LLM discoverability:

- Public assets: `robots.txt`, `sitemap.xml`, `sitemap_index.xml`, `llms.txt`, social images.
- Headers via `vercel.json`: global `X-Robots-Tag: index, follow`, CSP, and `noindex` for auth-like routes.
- Only submit `https://smallms.com/sitemap_index.xml` in GSC.
- Update `<lastmod>` in sitemaps when content changes.
- Keep canonical URLs at apex domain without trailing slash.

## Session workflow

This site now consumes the exported benchmark session bundle from `smaLLMs`.

Primary file:

- `public/data/latest-session.json`

The benchmark repo can mirror that file automatically when it exports a run:

- `../smaLLMs/website_exports/latest/session.json`
- mirrored to `public/data/latest-session.json`

From the sibling `smaLLMs` repository, this is the direct sync path:

```powershell
.\.venv\Scripts\python.exe smaLLMs.py export --run-id <run_id> --sync-dir ..\websmaLLMs\public\data
```

The site intentionally stays static: no API server is required, and the synced JSON is the contract between the benchmark engine and this display.

The UI supports two data paths:

- auto-load the mirrored `public/data/latest-session.json`
- manually import any exported `session.json` from the toolbar

## What the site renders

The session bundle is intentionally dense. The site reads and displays:

- run metadata and reproducibility info
- accuracy confidence intervals and invalid prediction rates
- offline execution policy, dataset cache hashes, and local model digests
- leaderboard rows across all models
- per-benchmark coverage and metric matrix
- per-evaluation metrics and artifact paths
- sample-level prompt, response, parsed answer, correctness, latency, tokens, prompt hashes, stable sample ids, and raw provider metadata

## Stack

- React 18 + TypeScript
- Vite
- Recharts for charts
- Lucide React for icons
- CSS-first terminal styling with a static JSON data source
