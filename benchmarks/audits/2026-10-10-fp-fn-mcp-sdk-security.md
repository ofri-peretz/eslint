# FP/FN audit: eslint-plugin-mcp-sdk-security (2026-10-10)

The source review ran against the published 0.4.3, and main was logically identical. Its findings are 6 false positives, 12 false negatives and 1 packaging defect. PR #1188 fixed all 6 FPs, 10 of the 12 FNs and the packaging defect, and deferred 2 FNs and the CMD-FN-7 residual. **The zero-deferral pass (2026-10-11) fixed those 3 and resolved all 3 known residuals, and the missing-detections pass (same day) turned the 10-item backlog into 11 rules. Nothing is deferred or open.**

**How the fixes were made: test-first.** Every new case went into the rule's existing test file. Each batch was run against the unchanged rule first, and failed as expected:

| Suite                                           | Failures before the fix |
| ----------------------------------------------- | ----------------------- |
| module gate                                     | 18                      |
| `require-tool-input-schema`                     | 17                      |
| `no-unvalidated-tool-args`                      | 12                      |
| `no-tool-description-injection`                 | 13                      |
| `no-command-injection-in-tool`                  | 17                      |
| README/preset lock (run against the old README) | 5                       |

After the fixes: `Tests 333 passed (333)`, coverage 100/100/100/100, and `npm run typecheck` is clean.

**Design constraint.** The first pass was AST-structural only. For the second pass the owner relaxed it to three tools, and the rename litmus still applies — no verdict depends on a variable's name:

- **(a) Intra-file value following** (`src/utils/value-flow.ts`). Every reference is resolved through the ESLint scope manager. From there it follows `const`/`let` bindings and reassignments, destructuring declarations and assignments, member and element reads, `await`, string derivations (`.trim/.split/.slice/.toLowerCase/.join/.concat`, `String()`, templates, `+`) and the returns of same-file helpers. It is bounded at 16 hops and cycle-guarded.
- **(b) Cross-file resolution of relative imports** (`src/utils/module-resolver.ts`). It resolves `./x` against `context.filename`, including `.js`→`.ts` and directory `index` files. The file is parsed with `context.languageOptions.parser`, and the parse is cached per parser, path and mtime. Any failure is `unknown`, and callers abstain on it.
- **(c) Type information: not used.** It was optional, and (a)/(b) closed every item without it.

The rename litmus holds. `import { execSync as foo }` + `foo(bar)` still reports, and `/re/.exec(x)` stays silent whatever it is named. No verdict depends on a variable's name. Two names are part of a public API and are deliberately recognised: the SDK export `CallToolRequestSchema`, which is resolved through its import, and the `String(x)` builtin.

Shared parsing now lives in `src/utils/tool-registration.ts`. It reads the legacy `tool()` overloads positionally, as the SDK does, and does not treat `arguments[1]` as a config.

## Findings

| Finding                                                                                                                                         | FP/FN     | Status                       | Test name (rule test file)                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-FN-1: every rule is silent on SDK v2 (`@modelcontextprotocol/server` …) and `mcp-handler`                                                  | FN        | fixed                        | `the gate opens on %s` × 9 packages, `including a subpath of it`, `a look-alike package outside the SDK family does not open the gate` (module-gate.lock)                                                                                                                                                                                                                                          |
| RIS-FP-1: a zero-argument tool with no `inputSchema` reported as "receives unvalidated client-supplied arguments" (the SDK passes only `extra`) | FP        | fixed                        | `a zero-argument tool registered with no schema`, `a legacy zero-argument tool`, `… with a description`, `… with annotations`, `reading the request context the SDK actually passes` (require-tool-input-schema)                                                                                                                                                                                   |
| TDI-FP-1: `description: SOME_CONST` reported (the docs claimed it was silent)                                                                   | FP        | fixed                        | `a const initialised from a literal`, ``a const chain and an `as const` literal``, `a property of a const object of literals` (no-tool-description-injection)                                                                                                                                                                                                                                      |
| TDI-FP-2: `[...].join('\n')` and `` dedent`…` `` descriptions reported                                                                          | FP        | fixed                        | `lines joined from an array of literals`, `a tagged template with nothing interpolated (dedent)`                                                                                                                                                                                                                                                                                                   |
| TDI-FP-3: legacy `tool(name, { title: z.string(), description: z.string() }, cb)` — tool _parameters_ reported as a dynamic title/description   | FP        | fixed                        | `legacy tool(name, shape, cb) whose PARAMETERS are named title and description`                                                                                                                                                                                                                                                                                                                    |
| TDI-FN-1: dynamic positional description in legacy `tool(name, desc, shape, cb)` missed                                                         | FN        | fixed                        | `the legacy positional description, interpolated`, `… with no schema`, `… held in a value this file does not fix`                                                                                                                                                                                                                                                                                  |
| TDI-FN-2: `registerPrompt` / `registerResource` descriptions not covered                                                                        | FN        | fixed                        | `a dynamic prompt description`, `a dynamic resource description (config is the third argument)`                                                                                                                                                                                                                                                                                                    |
| CMD-FP-1: `ISSUE_KEY.exec(key)` (RegExp) reported as CRITICAL CWE-78; `db.exec(sql)` mislabelled CWE-78                                         | FP        | fixed                        | `RegExp.prototype.exec on a tool argument is not a process sink`, `a database exec is not a process sink`, `an unbound callee is not proven to be child_process` (no-command-injection-in-tool)                                                                                                                                                                                                    |
| CMD-FP-2: binary constrained by `z.enum([...])` reported                                                                                        | FP        | fixed                        | `a binary constrained by z.enum is the allowlist`, `z.literal and z.nativeEnum through a renamed destructure and the whole-args form`                                                                                                                                                                                                                                                              |
| CMD-FN-1: `spawn('sh', ['-c', cmd])` missed                                                                                                     | FN        | fixed                        | `spawn('sh', ['-c', cmd]) is a full shell`, `cmd.exe /c and powershell -Command`                                                                                                                                                                                                                                                                                                                   |
| CMD-FN-2: `const execAsync = promisify(exec)` missed                                                                                            | FN        | fixed                        | `promisify(exec) — the usual async form`, `util.promisify of a namespaced sink`, `a renamed import is still the sink`                                                                                                                                                                                                                                                                              |
| CMD-FN-3: handler passed by reference not analysed                                                                                              | FN        | fixed                        | `a same-file function declaration passed by reference`, `a same-file const arrow passed by reference, registered below`, `an inline registration inside a by-reference handler uses the innermost`                                                                                                                                                                                                 |
| CMD-FN-4: low-level `Server.setRequestHandler(CallToolRequestSchema, …)` not covered                                                            | FN        | fixed                        | `the low-level Server: setRequestHandler(CallToolRequestSchema, …)`, `a destructured request parameter and a renamed schema import`, `SDK v2: setRequestHandler('tools/call', …)`                                                                                                                                                                                                                  |
| CMD-FN-5: `const c = command.trim(); exec(c)` and other derived values missed                                                                   | FN        | fixed (2nd pass)             | `FN: a trimmed argument through a const`, `FN: string derivations, awaits and conditionals`, `FN: a let assigned later and a destructured element`, `FN: the return value of a same-file helper`, `FN: array destructuring, holes, rests, spreads and sequences`, `FN: an element destructured from an argument array`, `FN: a shadowing callback parameter is not the argument, the outer one is` |
| CMD-FN-6: interpolated / concatenated command (``execSync(`git log ${ref}`)``) skipped                                                          | FN        | fixed (2nd pass)             | `FN: an interpolated command carrying a tool argument`, `FN: a concatenated command carrying a tool argument`, `FN: an interpolated script after sh -c`, `FN: argv elements under shell: true are a command line`                                                                                                                                                                                  |
| CMD-FN-7: `execa` / `execaCommand` not sinks; zx / execa `$` templates (residual)                                                               | FN        | fixed (residual in 2nd pass) | `execa and execaCommand`, `FN: a tool argument as the first token of a zx or execa $ template`, `FN: the default execa export as a template tag`                                                                                                                                                                                                                                                   |
| UTA-FN-1: `inputSchema: z.object({...})` never checked, including the loose `.passthrough()` case                                               | FN        | fixed                        | `a z.object schema (the canonical SDK v2 form)`, `a z.strictObject schema with chained modifiers`, `a passthrough schema lets the undeclared key through unvalidated`, `a zod 4 .loose() schema`, `a z.looseObject schema` (no-unvalidated-tool-args)                                                                                                                                              |
| UTA-FN-2: legacy `server.tool(name, [desc,] shape, cb)` never checked                                                                           | FN        | fixed                        | `the legacy tool(name, shape, cb) form`, `the legacy tool(name, description, shape, cb) form`, `the legacy form with annotations after the shape`, `a legacy empty shape declares nothing`                                                                                                                                                                                                         |
| CFG-1: presets ship only the FP-prone rule; README says `recommended` "Enables every rule"                                                      | packaging | fixed                        | `pins the exact rule set of every preset`, `README agrees with the shipped presets` (`the preset table lists exactly the %s rules`, `the rules table marks 💼 on exactly the recommended rules`, `does not claim recommended enables every rule`) (index.test)                                                                                                                                     |

**Recall locks.** Each FP fix has an invalid-side counterpart that proves the vulnerable shape still reports:

- `require-tool-input-schema`: `a handler destructuring an argument with no schema declared`, `a handler declaring (args, extra) …`, `a same-file const arrow passed by reference`.
- `no-tool-description-injection`:
  - `a let binding can be reassigned`, `FN: a dynamic description imported from another file` (2nd pass), `a const initialised from a call`;
  - `a const object key a later spread may override`, `a joined array with a dynamic element`, `a tagged template that interpolates`.
- `no-command-injection-in-tool`: `a free-form string schema is not a closed set`, `a renamed import is still the sink`.

**Existing tests changed** (each is justified in a comment beside the test):

- **require-tool-input-schema:** all 10 old invalid cases relied on the FP premise.
  - 2 used inline handlers that never read their parameter (`async (args) => ({ content: [] })`, `function (args) { return {}; }`). They moved to valid (the first is marked `(was: …)`).
  - 8 used an unresolved `handler` identifier, which the rule now cannot judge. The legacy `tool('read_file', handler)` case moved to valid as `(was: legacy arity, handler by identifier)`.
  - The other 7 (subscripted, core, `require()` gate, computed key, literal key, import order, unknown tool name) stay invalid, with an inline handler that reads `{ path }`.
- **no-unvalidated-tool-args:**
  - `a schema built by a call` (`z.object({ path })`) moved from valid to invalid, because it was the FN. The valid slot now holds `buildSchema()`, whose keys really are invisible.
  - `the legacy tool() arity` (`tool("read", { inputSchema: {...} }, …)`) moved to valid. The legacy API has no config object, and `{ inputSchema: {…} }` is neither a params shape nor readable as one.
  - The `declaredSchemaKeys` unit test's `z.object({})` "gives up" expectation became `buildSchema()`. A new unit test pins that `z.object` is read.
- **no-command-injection-in-tool and the module-gate lock:** the fixtures called a bare, unbound `execSync(...)`. Sinks are now resolved to `child_process`, so the shared `SDK` prefix imports them, and `child_process.execSync` / the `require()` gate case gained their binding. No assertion was weakened. An unbound callee now has its own valid case.
- **index.test:** `keeps the new rule out of minimal and recommended` now covers only `no-tool-description-injection`. `no-unvalidated-tool-args` was promoted; see below.

## Deferred items

None.

## Second pass (2026-10-11): former deferrals and known residuals

The second pass was test-first: every case below was added and run against the PR #1188 rules before the fix.

| Suite                                         | Failures before the fix |
| --------------------------------------------- | ----------------------- |
| `no-command-injection-in-tool` (CMD-FN-5/6/7) | 11                      |
| `no-tool-description-injection` (residual 1)  | 4                       |
| residual 2, across 3 rules                    | 4                       |
| preset lock (residual 1 promotion)            | 1                       |

After the fixes: `Tests 375 passed (375)`, coverage 100/100/100/100, `npm run typecheck` clean.

| Item                                                                                                                                                                                                                                               | Status                                           | Test name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMD-FN-5: argument derived through a call, binding or helper before the sink                                                                                                                                                                       | fixed                                            | see the Findings table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CMD-FN-6: interpolated / concatenated command inside a tool handler. Owner decision: reported here too, and README updated                                                                                                                         | fixed                                            | see the Findings table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CMD-FN-7 residual: zx / execa `$` templates. Reported when the argument is the first token (the binary), after `sh -c`, or under `$({ shell: true })`. A quoted interpolation after the binary stays silent                                        | fixed                                            | `FN: a tool argument as the first token of a zx or execa $ template`; boundary `recall boundary: a zx template quotes an interpolated argument after the binary`                                                                                                                                                                                                                                                                                                                                                       |
| Residual 1: a description imported from another module was reported unread. It is now read through relative imports (named, default, namespace, `export … from`, `export *`, `export * as`, quoted names), and reported only when provably dynamic | fixed                                            | `FP: static descriptions imported from another file`, `FP: an import that does not resolve is not reported`, `FP: an imported value that cannot be read stays unknown, not dynamic`, `FN: a dynamic description imported from another file`, `FN: a namespace import used as text is not text` (no-tool-description-injection); module-resolver unit tests                                                                                                                                                             |
| Residual 2: legacy `tool()` object `{ path: PathSchema }` classified `unknown`. Values are now resolved through consts and relative imports: schema calls make it a params shape, literals make it annotations                                     | fixed                                            | `FN: a legacy shape whose schemas are same-file consts`, `FN: a legacy shape whose schemas are imported from a relative module`, `FP: a legacy object whose values resolve to literals is annotations, not a shape` (no-unvalidated-tool-args); `FN: a legacy annotations object whose values are consts declares no schema`, `FP: a legacy shape whose schemas are imported is a schema` (require-tool-input-schema); `FP: a closed-set schema held in a const is still the allowlist` (no-command-injection-in-tool) |
| Residual 3: `db.exec(sql)` with a tool argument                                                                                                                                                                                                    | **not a defect of this rule (wrong CWE before)** | `FP: a database exec is not a process sink (SQL injection, wrong CWE before)`. Stays silent here: it is SQL injection, and `no-sql-injection-in-tool` now reports it (`FN: db.exec(sql) on better-sqlite3 with the argument as the SQL`)                                                                                                                                                                                                                                                                               |

What remains unreported is unreported **by design**, and is pinned by `recall boundary:` cases:

- an argument only _selects_ a value (`lookup(cmd)`, `ALLOWED[cmd]`, a comparison);
- an argument reaches a sink inside a helper the handler calls;
- a description is unreadable (a package import, a missing module, a cycle).

**Existing tests changed in the second pass** (each is justified beside the test):

- **no-command-injection-in-tool:**
  - `an interpolated command belongs to node-security` and `a concatenated command likewise` moved from valid to invalid (owner decision, CMD-FN-6).
  - `a shell invoked with a fixed script` lost its `` `ls ${cmd}` `` element; it now interpolates a non-argument, and the argument form is the new `FN: an interpolated script after sh -c`.
  - `a body declaration that does not come from the arguments` lost its `args.cmd.trim()` / `args.list` reads, which are now the CMD-FN-5 invalid cases.
  - `an array-pattern property binds nothing this rule tracks` moved to invalid: an element of an argument is the argument.
  - The `isBuiltString` unit tests were removed with the helper, which no longer exists.
- **no-tool-description-injection:**
  - `an imported value is decided in another file` (an import of a module that does not exist) moved to valid: the rule now reads imports, and abstains on one it cannot read.
  - `a const that refers to itself through a cycle stays unresolved` moved to valid, because the bounded resolver abstains on it. A const cycle is a TDZ ReferenceError, not text.
- **index.test:** `keeps no-tool-description-injection out of minimal and recommended` became `… out of minimal`, and the pinned `recommended` set gained the rule.

## Preset changes

| Preset        | Before #1188                | After #1188                                                                             | After the second pass                        |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| `minimal`     | `require-tool-input-schema` | `no-command-injection-in-tool`, `require-tool-input-schema`                             | unchanged                                    |
| `recommended` | `require-tool-input-schema` | `no-command-injection-in-tool`, `no-unvalidated-tool-args`, `require-tool-input-schema` | adds `no-tool-description-injection` (all 4) |
| `strict`      | all 4                       | all 4                                                                                   | all 4                                        |

Why each rule sits where it does:

- **`require-tool-input-schema`** stays in `minimal`. It now reports only a handler that reads arguments while no schema is declared. Those arguments never arrive, so every finding is a bug. Its severity drops from HIGH (CVSS 7.5) to MEDIUM (CVSS 5.3), because the old message overclaimed.
- **`no-command-injection-in-tool`** is promoted to `minimal`. After CMD-FP-1 its sinks are module-resolved, and a finding means a tool argument names the process that runs.
- **`no-unvalidated-tool-args`** is promoted to `recommended`. The review found no FP. A reported key is stripped by the schema, so it is always `undefined`, or, on a loose schema, it arrives unvalidated.
- **`no-tool-description-injection`** was `strict`-only after #1188, because it reported every imported description. **Decision (2026-10-11): promoted to `recommended`.** It now reads relative imports and reports only text it can show is dynamic, and no FP remains in the review set. It stays out of `minimal`, because a description returned by a call (`t('key')`) is still reported.

`src/index.ts` now writes `recommended: { … rules: recommendedRules }` inline. That lets `scripts/sync-readme-rules.ts` fill the README 💼 column, which was previously empty for every rule. `src/index.test.ts` locks the README preset table and the 💼 column to `configs`. Against the old README the lock fails 5 of 5.

## Missing detections (2026-10-11): backlog closed

The review carried 10 vulnerability classes that none of the 4 rules could see. All 10 are now rules: 11 in total, because item 9 is two distinct client-side classes. Nothing is left open.

**Test-first.** Each rule's test file was written first and run against a stub rule (`create` returns `{}`). Every invalid case failed:

| Rule                                   | Failures against the stub |
| -------------------------------------- | ------------------------- |
| `no-path-traversal-in-tool`            | 60 of 89                  |
| `no-ssrf-in-tool`                      | 17 of 41                  |
| `require-http-transport-hardening`     | 23 of 61                  |
| `no-sql-injection-in-tool`             | 10 of 25                  |
| `no-shared-stateless-transport`        | 11 of 31                  |
| `no-predictable-session-id`            | 43 of 77                  |
| `no-code-injection-in-tool`            | 7 of 17                   |
| `no-credential-leak-in-tool`           | 12 of 26                  |
| `no-untrusted-tool-metadata-in-prompt` | 8 of 20                   |
| `no-untrusted-stdio-command`           | 75 of 105                 |
| `no-duplicate-tool-name`               | 11 of 26                  |

**The design constraint held.** Evidence comes from AST structure, bounded intra-file value following, relative imports, and the module a binding resolves to. No verdict depends on a variable's name. Library and SDK vocabulary (`sessionIdGenerator`, `allowedHosts`, `AuthInfo.token`, WHATWG `url.hostname`) is matched as API, with a `@vocabulary` note where it is an inline list. Every rule gates on `fileUsesMcpSdk`, and `src/module-gate.lock.test.ts` sweeps all 15 rules.

**Shared infrastructure**, used by the new rules and by `no-command-injection-in-tool`:

- `utils/tool-handlers.ts`: one collector for handler roots. It covers tool arguments, `request.params.arguments`, `ResourceTemplate` variables (newly a source for `no-command-injection-in-tool` too) and the request context's `authInfo`.
- `utils/instances.ts`: "which export constructed this value", through `const`, `await`, instance methods (`pool.connect()`) and relative imports.
- `utils/guards.ts`: "was this value checked by an `if` that exits, or wraps the sink", plus same-file sanitising helpers.
- `utils/http-clients.ts`: outbound requests, resolved by module.
- `utils/value-flow.ts`: a parameter index on `HandlerRoot`, and an `intercept` hook for rule-specific sources and pass-throughs. A same-file helper that returns the arguments object now carries it (`FN: a same-file helper that returns the arguments object`, no-command-injection-in-tool).

**One existing-rule defect found on the way.** `no-tool-description-injection` looked up `METADATA_CONFIG_INDEX[method]` on a plain object. A `.toString()` call therefore read `Object.prototype.toString`, and the rule crashed with "slot is not iterable" on any MCP file that calls it. It is now a `Map`, and `FP: a method named after an Object.prototype member does not crash the rule` locks it. That case fails on the old code.

| #   | Backlog item                                                                                    | Rule                                   | Preset level | Status | Test names (`FN:` cases, rule test file)                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------- | ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Path traversal: `fs` sinks and `ResourceTemplate` variables (CWE-22)                            | `no-path-traversal-in-tool`            | error (7.5)  | fixed  | `FN: a tool argument joined onto a root and read`, `FN: a resource template variable read from disk`, `FN: the legacy resource() form with a template held in a const`                                                                                                                                                                                                                                    |
| 2   | SSRF from tool arguments (CWE-918)                                                              | `no-ssrf-in-tool`                      | error (8.6)  | fixed  | `FN: fetch(url) with the URL taken from the tool arguments`, `FN: the argument is the host of an interpolated URL`, `FN: got, undici, node-fetch and https with a tool-argument URL`                                                                                                                                                                                                                      |
| 3   | HTTP transport hardening: DNS rebinding, `allowedHosts`, host binding, auth (CWE-346 / CWE-306) | `require-http-transport-hardening`     | error (8.1)  | fixed  | `FN: a StreamableHTTPServerTransport without enableDnsRebindingProtection`, `FN: an SSEServerTransport with no options`, `FN: createMcpExpressApp on 0.0.0.0 without allowedHosts`, `FN: an MCP HTTP server bound to all interfaces with no auth middleware`                                                                                                                                              |
| 4   | SQL injection from tool arguments (CWE-89), including residual 3 (`db.exec(sql)`)               | `no-sql-injection-in-tool`             | error (9.8)  | fixed  | `FN: a pg pool query with the argument interpolated`, `FN: db.exec(sql) on better-sqlite3 with the argument as the SQL`, `FN: a client from pool.connect() and a concatenated ORDER BY`                                                                                                                                                                                                                   |
| 5   | Shared `McpServer` / transport in stateless mode, CVE-2026-25536 (CWE-488)                      | `no-shared-stateless-transport`        | error (7.5)  | fixed  | `FN: a stateless transport created once at module level`, `FN: a module-level McpServer connected to a per-request stateless transport`                                                                                                                                                                                                                                                                   |
| 6   | Predictable session IDs (CWE-330)                                                               | `no-predictable-session-id`            | error (7.5)  | fixed  | `FN: a counter as the session id`, `FN: Date.now() as the session id`, `FN: Math.random() as the session id`, `FN: a constant session id shared by every client`                                                                                                                                                                                                                                          |
| 7   | `eval` / `new Function` / `vm` from tool arguments (CWE-95)                                     | `no-code-injection-in-tool`            | error (9.8)  | fixed  | `FN: a calculator tool that evals the expression`, `FN: new Function and Function() with the argument as the body`, `FN: node:vm run functions, Script and SourceTextModule`                                                                                                                                                                                                                              |
| 8   | Secrets in tool results, and token passthrough (CWE-200 / CWE-526 / CWE-441)                    | `no-credential-leak-in-tool`           | error (7.5)  | fixed  | `FN: the whole environment returned as text`, `FN: the caller’s token returned to the model`, `FN: the caller’s bearer token forwarded upstream`                                                                                                                                                                                                                                                          |
| 9a  | Client: untrusted `listTools()` descriptions sent to an LLM (CWE-1427)                          | `no-untrusted-tool-metadata-in-prompt` | error (8.6)  | fixed  | `FN: tool descriptions joined into the system prompt`, `FN: a prompt built in a for…of loop and sent as a user message`                                                                                                                                                                                                                                                                                   |
| 9b  | Client: `StdioClientTransport` command from untrusted config, the CVE-2025-6514 class (CWE-78)  | `no-untrusted-stdio-command`           | error (8.8)  | fixed  | `FN: a tool argument names the server command a hub tool spawns`, `FN: a project .mcp.json entry chooses the command (Object.entries for-of)`, `FN: a config under process.cwd() read with fs/promises (Object.values for-of)`, `FN: a registry fetched over the network chooses the command`, `FN: a shell -c script taken from project config`, `FN: npx runs whatever package the tool argument names` |
| 10  | Duplicate tool names in a file (CWE-694)                                                        | `no-duplicate-tool-name`               | warn (5.3)   | fixed  | `FN: two registerTool calls give one server the same name`, `FN: a legacy tool() and a registerTool() with the same name`, `FN: a duplicate behind a try/catch is silently dropped at startup`, `FN: a low-level Server lists two tools with one name`                                                                                                                                                    |

Each rule's doc states its overlap with `node-security` / `secure-coding`, which do not know the MCP handler is the taint source. It also lists, under "What this rule deliberately does not report", the boundaries its valid cases pin. Corpus fixture pairs were added under `benchmarks/corpus/` for CWE-022, CWE-078, CWE-089, CWE-094, CWE-200, CWE-330, CWE-346, CWE-488, CWE-694, CWE-918 and CWE-1427.

### Preset changes (missing detections)

All 11 rules join `recommended` and `strict`, at `error` from CVSS 7.0 up and `warn` below. `strict` now keeps each rule's `recommended` level instead of forcing `error`. `minimal` is unchanged. The new locks are `sets each rule to error at CVSS 7.0 and above, warn below (new rules)` and `the rules table marks ⚠️ on exactly the rules recommended at warn` (index.test).

## Real-world scan (2026-10-11)

All 15 rules, each at `error`, were run with ESLint 9's `Linter` over four public MCP codebases:

- `modelcontextprotocol/servers`
- `modelcontextprotocol/typescript-sdk`, the v2 monorepo
- `vercel/mcp-handler`
- `cloudflare/mcp-server-cloudflare`

The list held 1,114 TypeScript/JavaScript files. 567 of them import an MCP package and were linted: 77 in servers, 465 in typescript-sdk, 15 in mcp-handler and 10 in mcp-server-cloudflare. Findings from other rules, parse errors and unused-disable noise are excluded.

| Rule                               | Findings before | FP  | TP  | Findings after |
| ---------------------------------- | --------------- | --- | --- | -------------- |
| `require-http-transport-hardening` | 36              | 34  | 2   | 2              |
| `no-tool-description-injection`    | 4               | 4   | 0   | 0              |
| `no-credential-leak-in-tool`       | 2               | 1   | 1   | 1              |
| every other rule                   | 0               | 0   | 0   | 0              |

The second run (after the fixes below) has exactly the 3 true positives, zero false positives and zero crashes.

**The 3 true positives, kept and locked as invalid cases:**

- `servers:src/everything/transports/sse.ts:71`: correct. An SDK v1 `SSEServerTransport` with no `enableDnsRebindingProtection`/`allowedHosts`, served from a raw `express()` app that listens on `PORT` (every interface) with no Host validation. Lock: `real code: a v1 SSE transport on a raw express app, listening on PORT`.
- `servers:src/everything/transports/streamableHttp.ts:109`: correct, the same shape for `StreamableHTTPServerTransport`. Lock: `real code: a v1 Streamable HTTP transport on a raw express app, listening on PORT`.
- `servers:src/everything/tools/get-env.ts:34`: correct. A `get-env` tool returns `JSON.stringify(process.env)` to the model, which is every credential the server process holds. It is a demo server, but the shape is the defect. Lock: `real code: the everything server get-env tool returns the whole environment`.

**The 39 false positives, fixed test-first.** Each case below failed against the rules before the change.

- **`require-http-transport-hardening`, 31 in the SDK's own `test/` and `e2e/` suites.** The rule now sets `skipTestFiles` (the devkit's `isTestFilePath`, the same predicate jwt-security's secret rules use). Locks: `FP: an SDK v2 transport in a test helper`, `FP: createMcpExpressApp on 0.0.0.0 inside a test file`, `FP: a v1 transport in a *.test.ts file`.
- **`require-http-transport-hardening`, the wrong model for SDK v2.** It made 3 findings in `typescript-sdk/examples/guides/serving/sessions-state-scaling.examples.ts`, and the v2 transports in the test suites hit the same defect. v2 transports have no `enableDnsRebindingProtection` option, because the app validates Host. The rule now:
  - checks transport options only for v1 (`@modelcontextprotocol/sdk`) and v2's `@modelcontextprotocol/server-legacy` SSE;
  - reports a v2 setup on the app instead: a hand-built `express()`/`new Hono()`/`fastify()` app that serves the transport with no validator (new messageId `appWithoutHostValidation`), or `createMcpExpressApp`/`createMcpHonoApp`/`createMcpFastifyApp` on every interface with no `allowedHosts`;
  - abstains when the app is not built in the file.

  Locks: `FP: an SDK v2 transport wired into an Express app passed in as a parameter`, `FP: an SDK v2 transport built at module level with no app in the file`, and the new invalid `SDK v2: a raw express() app …` / `… new Hono() app …` cases. `@modelcontextprotocol/server-legacy` joins the SDK gate.

- **`no-tool-description-injection`, 4.** The rule reported any description it could not prove static.
  - `servers:src/everything/resources/files.ts:49` built one from a `docs/` directory filename.
  - `typescript-sdk:examples/stickynotes/server.ts:40` built one from a counter id.
  - `servers:src/everything/resources/session.ts:80` (description and title) took them from a helper's destructured parameter.

  "Dynamic" is not the defect. The rule now reports only text followed (via `utils/value-flow`) to one of three sources:
  - a client: tool arguments, `ResourceTemplate` variables, `setRequestHandler` request params, or an express/hono/fastify route's request;
  - a remote service: an HTTP response and its `.json()`/`.text()`;
  - a file's contents: `readFile`/`readFileSync` here or in a relative module, plus `JSON.parse` of any of these.

  New call-site resolution covers helpers. When a same-file or relative-imported helper forwards a parameter into a registration's description or title, the argument (or the destructured field of an object argument) is checked where the helper is called. On the real `gzip-file-as-resource.ts` → `registerSessionResource` path the client-chosen value is the `name`, so nothing is reported.

  Locks: `FP: a description built from a server-side directory listing`, `FP: a description built from a server counter id, through a helper a tool calls`, `FP: a helper forwarding its own parameter, with no caller in the file`, `FP: a tool passes a client-chosen NAME to a relative helper that forwards only description and title`, and `FN: a tool argument forwarded through a relative helper (object field, positional, default export)`. The 38 cases that asserted "dynamic ⇒ report" moved to valid under `Valid — server-local text assembled at runtime (was: invalid)`. That includes the two former `FN:` cases for imported descriptions; the untrusted-source cases replace them.

- **`no-credential-leak-in-tool`, 1.** `typescript-sdk:test/e2e/fixtures/stdio-server.ts:37` is a test fixture: the rule now skips test files. It also only listed names with `Object.keys(process.env)`, which is no longer reported anywhere. Locks: `FP: a test fixture server that reports its environment`, `FP: the NAMES of the environment variables are not their values`.

**A crash the scan exposed.** The new call-site resolution followed `declare function onRedirect(…)`, a bodiless `TSDeclareFunction` in `typescript-sdk:examples/guides/clients/oauth.examples.ts:34`, and crashed. The shared `resolveFunction` had the same hole: any taint rule following a `declare function` helper crashed. Both now resolve only to an implementation with a body, which also handles overload signatures. Locks: `FP: a declare-only function is not a helper with a body to read` (no-tool-description-injection), `FP: a declare-only helper has no body to follow` (no-command-injection-in-tool), and `an overloaded helper is read through its implementation`.
