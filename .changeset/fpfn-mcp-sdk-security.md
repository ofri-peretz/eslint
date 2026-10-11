---
'eslint-plugin-mcp-sdk-security': minor
---

fix(mcp-sdk-security): support SDK v2 and mcp-handler, resolve sinks by module, fix schema-less tool FPs, reset presets

Fixes 16 of the 18 false-positive and false-negative items, plus the preset/README mismatch, found in the 2026-10 audit. The other 2 are deferred with reasons in benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md.

**New package support.** The rules used to run only in files that import `@modelcontextprotocol/sdk`. They now also run in files that import the SDK v2 packages (`@modelcontextprotocol/server`, `client`, `core`, `node`, `express`, `hono`, `fastify`) or `mcp-handler` / `@vercel/mcp-adapter`. Before this, every rule was silent on v2 and `mcp-handler` servers.

**Presets.** The README said `recommended` "enables every rule". In fact it shipped only `require-tool-input-schema`, the rule whose findings were all false positives. A test now locks the README preset table and its 💼 column to the shipped configs.

- `minimal`: `no-command-injection-in-tool`, `require-tool-input-schema`.
- `recommended`: adds `no-unvalidated-tool-args`.
- `strict`: all four rules. It is the only preset with `no-tool-description-injection`.

**Per rule.**

- `require-tool-input-schema`: the SDK calls a tool that has no `inputSchema` as `handler(extra)`, so a zero-argument tool is correct and is no longer reported. The rule now reports a schema-less handler only when it reads arguments: it destructures or reads a non-context key, or it declares a second parameter. Severity is now MEDIUM (CVSS 5.3).
- `no-command-injection-in-tool`:
  - Sinks are now resolved to `child_process` or `execa`, not matched by name. `REGEX.exec(arg)` and `db.exec(sql)` are no longer reported as CWE-78.
  - It now catches `promisify(exec)`, `spawn('sh', ['-c', cmd])`, `execa` / `execaCommand`, handlers passed by reference within the same file, and `setRequestHandler(CallToolRequestSchema | 'tools/call', …)`.
  - An argument that the schema restricts to `z.enum` / `z.literal` / `z.nativeEnum` is not reported.
- `no-unvalidated-tool-args` now reads `z.object({…})` schemas, which are the canonical v2 form. A `.passthrough()` / `.loose()` / `z.looseObject` schema is reported under a new message ID, `undeclaredArgPassthrough`. The rule now also checks the legacy `server.tool(name, [description,] shape, cb)` form.
- `no-tool-description-injection`:
  - These forms now count as static and are no longer reported: a description in a `const`, a property of a `const` object, an array of strings joined with `.join()`, and a `dedent` template with nothing interpolated.
  - Legacy `tool(name, { title: z.string() }, cb)` is no longer reported, because there `title` is a tool parameter, not the tool's title.
  - It now reports a dynamic positional legacy description, and dynamic `registerPrompt` / `registerResource` descriptions, under the new `dynamicMetadata` message.

**Upgrade notes.**

- A bare `execSync(cmd)` with no `child_process` binding is no longer reported. Real code always imports the sink.
- Expect new findings from `recommended` (command injection and undeclared args), and from v2 or `mcp-handler` files that were previously skipped.
