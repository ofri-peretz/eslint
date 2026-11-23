# AGENTS.md

eslint.interlace.tools: Next.js + Fumadocs. The tree, `package.json` scripts and the locks in
`src/__tests__/` are the map; this file holds only what they cannot say.

- Read [DOCS_PHILOSOPHY.md](../../DOCS_PHILOSOPHY.md) before a non-trivial change: it decides
  use-as-is, extend or build-our-own for each docs concept.
- `src/data/*.json` is written by `.github/workflows/docs-data.yml` and served cached in prod;
  [docs/DATA_SYNC_ARCHITECTURE.md](./docs/DATA_SYNC_ARCHITECTURE.md) has the schemas and fallbacks.
- Rule pages come from package sources via `npm run sync:rules`; edit the source, not the copy.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
