# ADR 0005 — `test.dependsOn` stays `[]`; upstream coupling is a global dependency

- **Status:** accepted
- **Date:** 2026-08-31
- **Deciders:** @ofri-peretz

## Context

Turbo replays a cached task when its hash is unchanged. That is correct only if
the hash covers everything that can change the result — and it did not.

`turbo.json` declared `test.dependsOn: []`, so a plugin's test hash covered only
that plugin's own files:

```
$ npx turbo run test --filter=eslint-plugin-jwt-security --dry=json
  hash=617b80a88f5b0023
$ echo '// probe' >> packages/eslint-devkit/src/index.ts
$ npx turbo run test --filter=eslint-plugin-jwt-security --dry=json
  hash=617b80a88f5b0023      # unchanged
```

Editing the devkit left every dependent plugin's tests a cache hit. Observed on
a real CI shard: **8 cache hits, 0 executions** — a job reporting success having
run no tests.

The obvious repair, `test.dependsOn: ["^build"]`, is wrong here. Vitest aliases
workspace dependencies to their **source**, not their build output, so `^build`
would serialise every shard behind a build the tests never read.
`turbo-cache-inputs-lock.test.ts` rejects it for that reason.

## Decision

`test.dependsOn` and `test:coverage.dependsOn` stay `[]`. The coupling is
declared as `globalDependencies`:

```jsonc
"globalDependencies": [
  "packages/eslint-devkit/src/**",
  "packages/ui/src/**",
  "tools/cwe-analytics-engine/src/**",
  // ... plus shared build and lint config
]
```

## Consequences

- Coarser than `dependsOn`: a devkit edit invalidates **every** package's test
  hash, not just its dependents'. Accepted — over-running tests is a cost,
  skipping them is a lie.
- No serialisation. Shards stay independent and cacheable.
- Locked behaviourally by `test-cache-sees-upstream-lock.test.ts`, which reads
  the task hash via `--dry=json`, perturbs an upstream source file, and requires
  the hash to move. Because it asserts the *behaviour*, it holds whichever
  mechanism provides it.

## Alternatives considered

**`dependsOn: ["^build"]`.** The textbook answer, rejected on the aliasing
above. `docs/ci/SKIP_PATHS.md` claimed for a while that this was what shipped;
it never was, and the doc has been corrected.

**Per-package `inputs` listing upstream paths.** Precise, and rejected as
unmaintainable: every new dependency edge would need a matching edit, and a
missed one fails silently in exactly the way this ADR exists to prevent.
