# Local preview of the docs site

> Moved out of AGENTS.md on 2026-11-23.

The plain path, and the one to use by default:

```bash
npm run dev --workspace docs   # http://localhost:3000
```

A container is available for sandboxes and clean-machine checks:

```bash
docker compose -f compose.dev.yml up
```

Non-obvious facts both paths depend on:

- **One install at the root.** npm workspaces hoist every workspace's deps.
  `tsx` is a devDependency of `@interlace/benchmarks` only, and the docs `dev`
  script relies on it resolving from the hoisted root.
- **`@interlace/ui` must be built first.** It exports from `dist/`, so
  `npm run build --workspace @interlace/ui` has to run before `next dev`.
  `@interlace/benchmarks` exports its `.ts` sources directly and needs no build.
- **`LEFTHOOK=0` in containers.** The root `prepare` installs git hooks, which
  are meaningless in a container and fail without a git identity.
- **`sync-plugin-stats.ts` is local-only.** It reads each plugin's
  `src/index.ts` and writes `apps/docs/src/data/plugin-stats.json`. No network.
  The docs `dev` script runs it for you.

## Remote sandboxes

Next blocks unknown hostnames in dev, so a sandbox that serves the preview
through its own hostname must declare it:

```bash
DEV_ALLOWED_ORIGINS=3000-my-sandbox.example docker compose -f compose.dev.yml up
```

`DEV_ALLOWED_ORIGINS` is comma-separated, dev-only, and empty by default —
unset, the dev server behaves exactly as stock.

Providers get an **overlay**, layered on the repo's own compose file rather than
replacing it:

```bash
docker compose -f compose.dev.yml -f sandboxes/<provider>/compose.override.yml up
```

See [`sandboxes/`](../sandboxes/) for the set we support and how each is run —
today that is [Base44](../sandboxes/base44/README.md). The rule is a location, not
a prohibition: a
provider's name, env-var spelling and port scheme may appear **in its own
overlay** and nowhere else — not in `apps/docs/next.config.mjs`, not in
`compose.dev.yml`, not in the `Dockerfile`. Anything a sandbox needs from the app
goes through a generic hook the repo would expose anyway.

That is what keeps trying a provider cheap and leaving one free: adding or
dropping a sandbox is a change to one directory.
`scripts/__tests__/dev-preview-vendor-neutral.test.ts` enforces it.
