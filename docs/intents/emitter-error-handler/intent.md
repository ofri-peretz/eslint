---
slug: emitter-error-handler
opened: 2026-11-24
packages:
  - eslint-plugin-node-security
  - oxlint-plugin-node-security
cases: [ILB-0185, ILB-0186, ILB-0187]
---

# Intent — an emitter with no error listener is a crash the plugin can name

> Stage 1 artifact. Opened after two production crashes found by linting
> open-source Node apps on 2026-11-24.

**Status:** draft · **Opened:** 2026-11-24 · **Owner:** @ofri-peretz

---

## What is wanted

A ClientRequest or ChildProcess created by `http.request`/`get`, `https.request`/`get`,
`child_process.spawn` or `fork`, and never given an `'error'` listener, is reported. Both
real crashes (parse-server's `createFile`, Eleventy's `spawnAsync`) are reported, and
`Readable.fromWeb(x).pipe(dest)` reports the source in `require-stream-error-handler`.

## Why now

An emitter that emits `'error'` with no listener throws from the event loop, and a
`try/catch` cannot catch it. `require-stream-error-handler` only looks at `.pipe()` and
matches constructors by name, so neither crash was reachable by it.

## Affected users and systems

Everyone on the `strict` preset of `eslint-plugin-node-security`. `recommended` is
unchanged. The rule's docs page, the generated docs site pages and the oxlint alias.

## Constraints

- Callee resolved by import provenance, never by spelling.
- Silent when the emitter escapes; that ceiling is named in the docs.
- `exec` and `execFile` are not reported: Node listens for `'error'` inside both.
- Type-unaware, no option.

## Success criteria

- Cases ILB-0185 and ILB-0186 report, ILB-0187 stays silent.
- Fidelity model `node-security/require_emitter_error_handler`: 216 of 216 inputs, 0 divergences.
- Mutation score for the new rule and corpus hit count recorded in the PR.

## Open questions

- Promotion to `recommended` waits for a corpus run with no false positive read in code.
