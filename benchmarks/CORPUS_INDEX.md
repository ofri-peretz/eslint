# Corpus index

`corpus-index.json` is a generated index of the cloned open-source corpus at
`~/repos/ofriperetz.dev/oos` (161 repos, ~35 GB). It exists so benchmark suites
can **select repos by criteria** instead of hardcoding paths.

Regenerate:

```bash
npx tsx scripts/build-corpus-index.ts            # full run, ~5 min
npx tsx scripts/build-corpus-index.ts --no-github # skip the network pass
```

Override the corpus location with `CORPUS_ROOT=/path/to/corpus`.

The script never writes inside the corpus — it is strictly read-only there.

## Schema

Top level:

| Field        | Type          | Notes                                  |
| ------------ | ------------- | -------------------------------------- |
| `corpusRoot` | `string`      | Absolute path the index was built from |
| `repoCount`  | `number`      | Length of `repos`                      |
| `repos`      | `RepoEntry[]` | Sorted by `name`                       |

`RepoEntry`:

| Field               | Type                        | Notes                                              |
| ------------------- | --------------------------- | -------------------------------------------------- |
| `name`              | `string`                    | Directory name under `corpusRoot`                  |
| `path`              | `string`                    | Absolute path                                      |
| `remote`            | `string \| null`            | `origin` URL                                       |
| `defaultBranch`     | `string \| null`            | From `origin/HEAD`, falling back to current branch |
| `lastCommit`        | `string \| null`            | ISO 8601                                           |
| `totalFiles`        | `number`                    | Git-tracked files                                  |
| `totalLoc`          | `number`                    | Sum of `languages[*].loc`                          |
| `languages`         | `Record<ext, {files, loc}>` | Keyed by extension, e.g. `.ts`                     |
| `packageManager`    | `string \| null`            | Inferred from lockfile                             |
| `hasTypeScript`     | `boolean`                   | Root `tsconfig.json` present                       |
| `isMonorepo`        | `boolean`                   | npm `workspaces` or `pnpm-workspace.yaml`          |
| `frameworks`        | `string[]`                  | Ecosystems detected from dependencies              |
| `applicablePlugins` | `string[]`                  | Plugins worth running here                         |
| `githubSlug`        | `string \| null`            | `owner/repo` when the remote is GitHub             |
| `stars`             | `number \| null`            | `null` if unfetched, non-GitHub, or lookup failed  |
| `archived`          | `boolean \| null`           | Same nullability as `stars`                        |
| `warnings`          | `string[]`                  | Non-fatal problems hit while indexing              |

## What counts

**Files and LOC come from `git ls-files`**, so `node_modules/`, `dist/`, and
build output are excluded for free — only tracked source is measured. LOC is
counted for source and text extensions only; binaries and files over 8 MB
count as 0.

**Frameworks are unioned across every tracked `package.json`**, not just the
root, because in a monorepo the root manifest often declares only tooling. A
repo therefore legitimately reports frameworks its top-level app never imports
— `next.js` reports `express` and `pg` because its test fixtures use them.
Capped at 200 manifests per repo.

**`applicablePlugins` is universal plugins plus framework-specific ones**, and
is empty for repos with no JS/TS (documentation repos, awesome-lists). Every
emitted name is validated against `packages/*/package.json` at build time; the
run fails rather than emitting a plugin that does not exist.

## Querying

```bash
# NestJS repos, largest first
jq -r '.repos[] | select(.frameworks[]? == "nest") | "\(.totalLoc)\t\(.name)"' \
  benchmarks/corpus-index.json | sort -rn

# Repos to run a given plugin against
jq -r '.repos[] | select(.applicablePlugins[]? == "eslint-plugin-jwt-security") | .path' \
  benchmarks/corpus-index.json

# Substantial, actively maintained TypeScript repos
jq -r '.repos[] | select(.hasTypeScript and .totalLoc > 50000 and .archived == false) | .name' \
  benchmarks/corpus-index.json

# Anything that had trouble indexing
jq -r '.repos[] | select(.warnings | length > 0) | "\(.name): \(.warnings|join("; "))"' \
  benchmarks/corpus-index.json
```

## Caching

GitHub lookups are cached in `benchmarks/.corpus-gh-cache.json` (gitignored),
keyed by slug. Re-runs cost zero API calls. Delete it to refresh star counts.

A failed lookup — renamed repo, 404, rate limit — degrades that entry's
`stars`/`archived` to `null` and records a `warnings` entry. It never fails the
run: 161 repos is too many to lose to one bad remote. On the first rate-limit
response the network pass stops trying and lets the rest fall through to
`null`, rather than hammering a limited endpoint.
