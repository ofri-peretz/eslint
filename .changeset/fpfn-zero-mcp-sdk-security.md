---
'eslint-plugin-mcp-sdk-security': minor
---

fix(mcp-sdk-security): follow tool arguments into built commands and $ templates, read imported descriptions and schemas

This clears every item the 2026-10 audit had deferred. Nothing is deferred now (benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).

**`no-command-injection-in-tool` follows the argument.** A tool argument is now followed within the file to the sink:

- through `const`/`let` bindings and reassignments, destructuring, member and element reads, and `await`;
- through string derivations (`.trim()`, `.split()`, `.slice()`, `.join()`, `String()`, templates, `+`);
- through the return value of a same-file helper.

Every reference is resolved through the scope manager, so a callback parameter that shadows an argument is not mistaken for it. These cases are now reported:

- **Interpolated and concatenated commands** (``execSync(`git log ${ref}`)``) inside a tool handler. On that line it may report alongside `node-security/no-shell-injection`.
- **Argv elements under `{ shell: true }`.**
- **zx / execa `$` templates**, when the argument is the first token, follows `sh -c`, or sits under `$({ shell: true })`.

**`no-tool-description-injection` reads imported descriptions.** A description imported from a relative module is now read: the file is parsed with the active parser and cached. The rule reports it only when its text is provably dynamic, and an import it cannot read is not reported. The rule now ships in `recommended`.

**Legacy `tool()` shapes resolve their schemas.** In `server.tool(name, { path: PathSchema }, cb)`, a schema held in a const or imported from a relative module now counts as a params shape. The change applies to `no-unvalidated-tool-args`, `require-tool-input-schema` and the closed-set (`z.enum`) check of `no-command-injection-in-tool`.

**Presets.** `recommended` now enables all four rules. `minimal` is unchanged: `no-command-injection-in-tool` and `require-tool-input-schema`.
