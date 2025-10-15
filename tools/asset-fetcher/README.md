# Asset Fetcher (OpenGameArt Automation)

Isolated tool to programmatically download and preprocess third-party art assets (initially OpenGameArt LPC base set) for the MMO project without polluting the main dependency tree.

## Structure
```
tools/asset-fetcher/
  package.json          # standalone dependencies (got, commander, etc.)
  tsconfig.json
  assets.config.json    # declarative asset list
  src/
    types.ts            # zod schemas for config validation
    fetchAssets.ts      # main CLI tool
  dist/                 # build output
```

## Usage
Install deps (inside this directory):
```
npm install
```
Build (optional, start script now builds automatically):
```
npm run build
```
Run (downloads & processes – will auto build first time):
```
npm start
```
Dry-run (no network writes):
```
npx tsx src/fetchAssets.ts --config assets.config.json --dry-run
```

## Config (assets.config.json)
- outputDir: Relative path to where processed assets will be placed (create if missing)
- concurrency: Future enhancement (currently sequential)
- assets: Array of asset entries
  - id: Identifier
  - type: zip | image | file
  - source: opengameart | direct
  - url: Download URL
  - pathFilters: Every string must be contained in entry name to include (zip only)
  - post: Post processing actions: extractFrames (stub), rename (rename file)

## Roadmap
- Implement real image slicing using sharp (optional dependency) guarded by feature flag
- Add checksum / ETag caching to skip unchanged downloads
- Parallel downloads with progress bar
- Automatic update of top-level ATTRIBUTIONS.md with newly fetched assets & license metadata
- Support Kenney (direct) packs with zip structure mapping

### Notes on Filenames
Some OpenGameArt ZIPs contain nested paths or characters problematic on Windows. We sanitize extracted filenames (replace spaces & reserved chars) to avoid ADM-ZIP "Invalid filename" errors.

## Licensing
This tool merely automates download; you must still comply with each asset's license. See root ATTRIBUTIONS.md.
