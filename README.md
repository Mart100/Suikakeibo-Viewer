# Suikakeibo Viewer

Privacy-first web app that analyzes [Suikakeibo](https://suikakeibo.jp/) `.skb` backups in your browser: MapLibre timeline, spend stats, and trip tables. Nothing is uploaded to a server.

## Stack

- SvelteKit + Svelte 5 + TypeScript
- Bun
- MapLibre GL + OpenStreetMap tiles
- Static deploy via `@sveltejs/adapter-static` (GitHub Pages)

## Local development

```bash
bun install
bun run stations   # rebuild static/data/stations.json (optional; already committed)
bun run dev
```

Open the site, then drop a Suikakeibo `.skb` export. The last file is remembered in IndexedDB for convenience (still only on your device).

## Exporting from Suikakeibo

1. Open Suikakeibo on your phone.
2. Use **Settings → Backup / Restore** (or the equivalent export) to create an `.skb` file.
3. Transfer the file to your computer and upload it here.

## What the backup contains

`.skb` files are ZIP archives with `db.json`. Train gate history is typically **date-only** (no clock time). Bus-like records (process code 70) often include times. Station names/coordinates are resolved from a community Saibane code table joined to open Japanese railway coordinates.

Map paths are **straight lines between stations** (approximate), not actual railway geometry.

## GitHub Pages

1. Push this repo to GitHub.
2. Enable **Settings → Pages → GitHub Actions**.
3. The included workflow builds with `BASE_PATH=/<repo-name>` and deploys `build/`.

For a custom domain or `username.github.io` root site, set `BASE_PATH` to empty in the workflow.

```bash
# Local production build for project pages (repo name Suikakeibo-Viewer):
bun run build:pages
```

## Scripts

| Script | Purpose |
|--------|---------|
| `bun run dev` | Dev server |
| `bun run build` | Production build (`BASE_PATH` from env, default empty) |
| `bun run build:pages` | Build with `/Suikakeibo-Viewer` base path |
| `bun run stations` | Rebuild station index from upstream CSVs |
| `bun run check` | Typecheck |

## License notes

Station name data comes from community Saibane dumps; coordinates from [open-data-jp-railway-stations](https://github.com/piuccio/open-data-jp-railway-stations) (ekidata-derived). Map tiles © OpenStreetMap contributors.
