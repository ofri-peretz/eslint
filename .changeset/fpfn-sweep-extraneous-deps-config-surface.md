---
'eslint-plugin-import-next': patch
---

fix: `no-extraneous-dependencies` published three config options it did not honour

`ignore` was in the schema and in the generated docs — "Specific package names to ignore (don't report as missing)" — but was never destructured in `create()`, so setting it did nothing at all. It is now an exact-name allowlist, the blunt sibling of `allowPatterns`. Surfaced by the burgee corpus, where seven workspace-root devDependencies are reported as missing and `ignore` is the documented escape hatch a consumer would reach for first.

`customPackageJsonDetection` was declared on the exported `Options` interface but absent from the schema, which sets `additionalProperties: false`. A consumer typing against the exported interface and setting it got a fatal config error that aborts the entire lint run — the precise breaking direction the options audit exists to prevent. Removed from the type; nothing read it.

`resolutionStrategy` keeps its behaviour and its enum, but the schema description now states what the values actually do. `workspace` and `monorepo` were byte-identical branches delegating to a predicate that recognises only the literal `@workspace/` and `@company/` scopes — no workspace-root manifest is read, no `workspaces` glob expanded, no sibling package consulted. The description promised "allow workspace packages" and "cross-package resolution" and delivered neither, which is worse than silence because the option accepts the value without error. Removing the enum members would have been a fatal config error for every existing opt-in user, so the honest repair is to describe the limitation and point at `allowPatterns`. Implementing real workspace resolution remains open.
