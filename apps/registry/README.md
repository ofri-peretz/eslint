# @interlace/registry — shadcn-compatible component registry

Serves `@interlace/ui` primitives as shadcn-compatible JSON entries. Production URL: **`ds.interlace.tools`**.

Consumers install components with the standard shadcn CLI:

```bash
npx shadcn@latest add https://ds.interlace.tools/r/button.json
npx shadcn@latest add https://ds.interlace.tools/r/dialog.json
```

## How it works

```text
packages/ui/src/primitives/*.tsx
              │
              ▼
   scripts/build-registry.mjs
              │
              ▼
       public/r/<name>.json   ← what Vercel serves
       public/r/index.json    ← list of all items
```

Each `public/r/<name>.json` follows the [shadcn registry-item schema](https://ui.shadcn.com/schema/registry-item.json):

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "button",
  "type": "registry:ui",
  "title": "Button",
  "description": "@interlace/ui — button primitive (shadcn-compatible).",
  "dependencies": ["@base-ui-components/react", "class-variance-authority"],
  "registryDependencies": [],
  "files": [
    {
      "path": "registry/interlace-ui/button.tsx",
      "target": "components/ui/button.tsx",
      "type": "registry:ui",
      "content": "…"
    }
  ]
}
```

`dependencies` (npm packages) and `registryDependencies` (other primitives in this registry) are auto-extracted from `import` statements in the source `.tsx` file.

## Adding a new primitive

1. Drop the file in `packages/ui/src/primitives/<name>.tsx`. Annotate the header with the interlace-component skill rule citations (use `dialog.tsx` or `button.tsx` as the template).
2. Run `npm run build` from this workspace:

   ```bash
   npm run build --workspace=registry
   ```

3. Verify the new `public/r/<name>.json` appears and conforms to the schema.
4. Commit `public/r/<name>.json` + `public/r/index.json`.

CI runs `npm run build:check` on every PR — fails if the on-disk JSON is out of sync with the primitive sources.

## Local preview

```bash
npm run build --workspace=registry
npm run preview --workspace=registry
# → serves on http://localhost:4178
```

Open `http://localhost:4178/` for the landing page and `http://localhost:4178/r/button.json` for a sample entry.

## Vercel deployment

`vercel.json` declares:

- **`Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`** on `/r/*.json` — short browser cache, long edge cache, with stale-revalidate so consumers see fresh content within minutes of a deploy.
- **`Access-Control-Allow-Origin: *`** — so the shadcn CLI can fetch cross-origin from any project.
- **Security headers** on everything else (X-Content-Type-Options, Referrer-Policy).

Hookup:

1. Create a new Vercel project, **Root Directory** = `apps/registry`.
2. **Domain** → `ds.interlace.tools`.
3. **DNS** → CNAME `ds` to `cname.vercel-dns.com`.
4. Trigger first deploy via push to `main`.

## What gets included

By design, only `packages/ui/src/primitives/*.tsx` ships through the registry. **`blocks/`, `patterns/`, `aceternity/`, `magicui/`, `fumadocs/`, and `mdx/` are excluded** — those are domain-coupled or framework-coupled, and they fail the "would this travel?" test from `UX_PHILOSOPHY.md` §10.

If a primitive should be expanded into a block-shaped variant, that's a follow-up: keep the primitive in the registry, ship the block as opt-in via a separate channel.

## See also

- [`scripts/build-registry.mjs`](scripts/build-registry.mjs) — the build pipeline.
- [`packages/ui/CONVENTIONS.md`](../../packages/ui/CONVENTIONS.md) — the conventions every primitive must follow.
- [`INTERLACE.md`](../../../agents/INTERLACE.md) — top-level index of the design-system stack.
- [`SKILL.md` for interlace-component](../../../agents/skills/interlace-component/SKILL.md) — the 26-rule floor every primitive must clear.
