# Sandbox overlays

Third-party development sandboxes we are trying out. Each subdirectory holds one
provider's glue and nothing else.

**These are overlays, not the project's setup.** The way this repo runs is:

```bash
npm run dev --workspace docs            # http://localhost:3000, no Docker
docker compose -f compose.dev.yml up    # same thing, containerised
```

A sandbox layers on top of that:

```bash
docker compose -f compose.dev.yml -f sandboxes/<provider>/compose.override.yml up
```

The rule that keeps this honest: **a provider's name, env-var spelling, port
scheme or config format may appear in its own overlay, and nowhere else.** Not in
`apps/docs/next.config.mjs`, not in `compose.dev.yml`, not in the `Dockerfile`.
Where a sandbox needs something from the app, it goes through a generic hook the
repo would expose anyway — today that is `DEV_ALLOWED_ORIGINS`.

That boundary is what makes trying a provider cheap and leaving one free: adding
or dropping a sandbox is a change to one directory. It is enforced by
`scripts/__tests__/dev-preview-vendor-neutral.test.ts`, not by review.

| Provider | Overlay | Notes |
|---|---|---|
| Base44 | [`base44/`](./base44/) — [setup and verification](./base44/README.md) | Reads `.base44/environment.json` at the repo root; its platform requires that path. The overlay maps `BASE44_PUBLIC_HOST_SUFFIX` to `DEV_ALLOWED_ORIGINS`. |
