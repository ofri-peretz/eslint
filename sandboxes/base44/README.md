# Base44 sandbox

Runs this repo's docs site inside a [Base44](https://base44.com) preview environment.

This is **an** environment, not **the** environment. Everything about how the
project builds and runs lives in the repo's own `compose.dev.yml`; the files here
translate Base44's platform into it. See [`../README.md`](../README.md) for why
the boundary is drawn that way.

## Running it

Base44 starts the preview itself, using the command in
[`.base44/environment.json`](../../.base44/environment.json) at the repo root —
that path is fixed by their platform, which is why it is the one vendor-named
thing outside this directory.

To run the same thing by hand:

```bash
BASE44_PUBLIC_HOST_SUFFIX=<suffix> \
  docker compose -f compose.dev.yml -f sandboxes/base44/compose.override.yml up
```

Note the two `-f` flags. The overlay is layered **on top of** the repo's compose
file and does not replace it — it sets no `image` and no `command`, only the one
environment variable below.

## What the overlay does

Base44 serves the preview through a hostname derived from
`BASE44_PUBLIC_HOST_SUFFIX` (e.g. `3000-<suffix>`). Next.js blocks unknown
hostnames in dev, so the overlay passes that host to the repo's generic hook:

```yaml
environment:
  - DEV_ALLOWED_ORIGINS=3000-${BASE44_PUBLIC_HOST_SUFFIX}
```

`DEV_ALLOWED_ORIGINS` is read in [`apps/docs/next.config.mjs`](../../apps/docs/next.config.mjs).
It is comma-separated, dev-only, and empty unless something sets it — so nothing
about this sandbox changes how the app behaves anywhere else.

## Environment contract

| Key | Value | Why |
|---|---|---|
| `previewPort` | `3000` | The docs site's standard port. Same locally, same in CI, same here. |
| `healthPath` | `/` | The homepage renders without network access or secrets. |
| `secrets` | `[]` | Nothing here needs credentials. The PostHog and dev.to keys are optional; the site renders identically without them. |

## Verifying

```bash
docker compose -f compose.dev.yml -f sandboxes/base44/compose.override.yml ps
curl -sf -H "Host: 3000-$BASE44_PUBLIC_HOST_SUFFIX" http://localhost:3000/
```

The `web` service should report healthy and the curl should return the homepage
HTML. First boot is slow — a cold `npm install` across this monorepo plus a
`@interlace/ui` build — which is why the healthcheck allows a long start period.

## Gotchas this setup already handles

These are properties of the monorepo rather than of Base44, and the repo's
`compose.dev.yml` deals with all of them. They are listed here because they are
the things that break a first boot:

- **One install at the root.** npm workspaces hoist every workspace's
  dependencies. `tsx` is a devDependency of `@interlace/benchmarks` only, and the
  docs `dev` script relies on it resolving from the hoisted root.
- **`@interlace/ui` must be built first.** It exports from `dist/`, so it needs a
  `tsc` build before `next dev`. `@interlace/benchmarks` exports its `.ts` sources
  directly and needs none.
- **`LEFTHOOK=0`.** The root `prepare` script installs git hooks, which are
  meaningless in a container and fail without a git identity.
- **`sync-plugin-stats.ts` is local-only.** It reads each plugin's `src/index.ts`
  and writes `apps/docs/src/data/plugin-stats.json`. No network. The docs `dev`
  script runs it.

## If Base44 needs something this cannot express

Add it to the overlay, or ask for a generic hook in the app. What it should not
become is a Base44-shaped change to `next.config.mjs`, `compose.dev.yml` or the
`Dockerfile` — that is the difference between using a sandbox and being hosted by
one. `scripts/__tests__/dev-preview-vendor-neutral.test.ts` enforces it.
