# FP/FN audit: eslint-plugin-mcp-sdk-security (2026-10-10)

The source review ran against the published 0.4.3, and main was logically identical. Its findings are 6 false positives, 12 false negatives and 1 packaging defect. This PR fixes **all 6 FPs, 10 of the 12 FNs, and the packaging defect**. 2 FNs are deferred, and a small residual of CMD-FN-7 is deferred under its fixed row.

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

**Design constraint (binding).** Every fix is AST-structural.

- **Followed:**
  - the SDK's own contract (handler parameters, and `request.params.arguments` in a call-tool handler, are client-controlled);
  - the module a callee is imported from (`resolveModuleBinding`);
  - a same-file `const` binding or function declaration;
  - a body declaration that destructures, or reads a property, straight off a parameter-bound name.
- **Not followed:** a value computed by a call (`cmd.trim()`), an import's contents, `let`/`var`, or anything across files.

The rename litmus holds. `import { execSync as foo }` + `foo(bar)` still reports, and `/re/.exec(x)` stays silent whatever it is named. No verdict depends on a variable's name. Two names are part of a public API and are deliberately recognised: the SDK export `CallToolRequestSchema`, which is resolved through its import, and the `String(x)` builtin.

Shared parsing now lives in `src/utils/tool-registration.ts`. It reads the legacy `tool()` overloads positionally, as the SDK does, and does not treat `arguments[1]` as a config.

## Findings

| Finding                                                                                                                                         | FP/FN     | Status       | Test name (rule test file)                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GATE-FN-1: every rule is silent on SDK v2 (`@modelcontextprotocol/server` …) and `mcp-handler`                                                  | FN        | fixed        | `the gate opens on %s` × 9 packages, `including a subpath of it`, `a look-alike package outside the SDK family does not open the gate` (module-gate.lock)                                                                                                      |
| RIS-FP-1: a zero-argument tool with no `inputSchema` reported as "receives unvalidated client-supplied arguments" (the SDK passes only `extra`) | FP        | fixed        | `a zero-argument tool registered with no schema`, `a legacy zero-argument tool`, `… with a description`, `… with annotations`, `reading the request context the SDK actually passes` (require-tool-input-schema)                                               |
| TDI-FP-1: `description: SOME_CONST` reported (the docs claimed it was silent)                                                                   | FP        | fixed        | `a const initialised from a literal`, ``a const chain and an `as const` literal``, `a property of a const object of literals` (no-tool-description-injection)                                                                                                  |
| TDI-FP-2: `[...].join('\n')` and `` dedent`…` `` descriptions reported                                                                          | FP        | fixed        | `lines joined from an array of literals`, `a tagged template with nothing interpolated (dedent)`                                                                                                                                                               |
| TDI-FP-3: legacy `tool(name, { title: z.string(), description: z.string() }, cb)` — tool _parameters_ reported as a dynamic title/description   | FP        | fixed        | `legacy tool(name, shape, cb) whose PARAMETERS are named title and description`                                                                                                                                                                                |
| TDI-FN-1: dynamic positional description in legacy `tool(name, desc, shape, cb)` missed                                                         | FN        | fixed        | `the legacy positional description, interpolated`, `… with no schema`, `… held in a value this file does not fix`                                                                                                                                              |
| TDI-FN-2: `registerPrompt` / `registerResource` descriptions not covered                                                                        | FN        | fixed        | `a dynamic prompt description`, `a dynamic resource description (config is the third argument)`                                                                                                                                                                |
| CMD-FP-1: `ISSUE_KEY.exec(key)` (RegExp) reported as CRITICAL CWE-78; `db.exec(sql)` mislabelled CWE-78                                         | FP        | fixed        | `RegExp.prototype.exec on a tool argument is not a process sink`, `a database exec is not a process sink`, `an unbound callee is not proven to be child_process` (no-command-injection-in-tool)                                                                |
| CMD-FP-2: binary constrained by `z.enum([...])` reported                                                                                        | FP        | fixed        | `a binary constrained by z.enum is the allowlist`, `z.literal and z.nativeEnum through a renamed destructure and the whole-args form`                                                                                                                          |
| CMD-FN-1: `spawn('sh', ['-c', cmd])` missed                                                                                                     | FN        | fixed        | `spawn('sh', ['-c', cmd]) is a full shell`, `cmd.exe /c and powershell -Command`                                                                                                                                                                               |
| CMD-FN-2: `const execAsync = promisify(exec)` missed                                                                                            | FN        | fixed        | `promisify(exec) — the usual async form`, `util.promisify of a namespaced sink`, `a renamed import is still the sink`                                                                                                                                          |
| CMD-FN-3: handler passed by reference not analysed                                                                                              | FN        | fixed        | `a same-file function declaration passed by reference`, `a same-file const arrow passed by reference, registered below`, `an inline registration inside a by-reference handler uses the innermost`                                                             |
| CMD-FN-4: low-level `Server.setRequestHandler(CallToolRequestSchema, …)` not covered                                                            | FN        | fixed        | `the low-level Server: setRequestHandler(CallToolRequestSchema, …)`, `a destructured request parameter and a renamed schema import`, `SDK v2: setRequestHandler('tools/call', …)`                                                                              |
| CMD-FN-5: one-hop alias `const cmd = command.trim(); exec(cmd)` missed                                                                          | FN        | **deferred** | pinned silent by `a body declaration that does not come from the arguments`. The structural half (`const { cmd } = args`, `const c = args.cmd`) is fixed: `arguments destructured in the body of a tool handler`                                               |
| CMD-FN-6: interpolated ``execSync(`git log ${ref}`)`` skipped                                                                                   | FN        | **deferred** | pinned silent by `an interpolated command belongs to node-security` (unchanged)                                                                                                                                                                                |
| CMD-FN-7: `execa` / `execaCommand` not sinks                                                                                                    | FN        | fixed        | `execa and execaCommand` (named, default import and `-c` form)                                                                                                                                                                                                 |
| UTA-FN-1: `inputSchema: z.object({...})` never checked, including the loose `.passthrough()` case                                               | FN        | fixed        | `a z.object schema (the canonical SDK v2 form)`, `a z.strictObject schema with chained modifiers`, `a passthrough schema lets the undeclared key through unvalidated`, `a zod 4 .loose() schema`, `a z.looseObject schema` (no-unvalidated-tool-args)          |
| UTA-FN-2: legacy `server.tool(name, [desc,] shape, cb)` never checked                                                                           | FN        | fixed        | `the legacy tool(name, shape, cb) form`, `the legacy tool(name, description, shape, cb) form`, `the legacy form with annotations after the shape`, `a legacy empty shape declares nothing`                                                                     |
| CFG-1: presets ship only the FP-prone rule; README says `recommended` "Enables every rule"                                                      | packaging | fixed        | `pins the exact rule set of every preset`, `README agrees with the shipped presets` (`the preset table lists exactly the %s rules`, `the rules table marks 💼 on exactly the recommended rules`, `does not claim recommended enables every rule`) (index.test) |

**Recall locks.** Each FP fix has an invalid-side counterpart that proves the vulnerable shape still reports:

- `require-tool-input-schema`: `a handler destructuring an argument with no schema declared`, `a handler declaring (args, extra) …`, `a same-file const arrow passed by reference`.
- `no-tool-description-injection`:
  - `a let binding can be reassigned`, `an imported value is decided in another file`, `a const initialised from a call`;
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

| Item                                                                                       | Reason                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMD-FN-5: `const c = command.trim(); exec(c)` (or `String(cmd).split(' ')[0]` and similar) | The value reaching the sink is a **new value computed by a call**. Proving it still carries the argument is data-flow analysis, which the design constraint excludes. The structural half is fixed and locked: a plain destructure or property read off the arguments in the handler body (`const { cmd } = args`, `const c = args.cmd`, `const { arguments: a } = request.params`).          |
| CMD-FN-6: interpolated / concatenated command (``execSync(`git log ${ref}`)``)             | This is the plugin's taxonomy contract, not a bug. `node-security/no-shell-injection` owns the built-string shape, and reporting it here too would put two plugins on one line. The README now says to install `eslint-plugin-node-security` alongside this plugin to cover both shapes. A rule option to report it when node-security is absent is a separate design decision for the owner. |
| CMD-FN-7 residual: zx / execa `$` tagged templates                                         | Both libraries quote each interpolation as a separate argv element. Only a tool argument as the _first_ token chooses the binary, which is rare. `execa`, `execaSync`, `execaCommand`, `execaCommandSync` and `execaNode` are fixed.                                                                                                                                                          |

Known residuals of the fixes (not separate findings):

- **`no-tool-description-injection` still reports a description imported from another module.** This file cannot see its text, so the rule stays in `strict` only.
- **A legacy `tool()` object that is neither all-call values (a params shape) nor all-literal values (annotations)**, for example `{ path: PathSchema }`, is classified `unknown`. All rules abstain on it. That is a precision-first choice.
- **`db.exec(sql)` with a tool argument is no longer reported.** It was SQL injection mislabelled as CWE-78, and belongs to the SQL-injection rule in the backlog below.

## Preset changes

| Preset        | Before                      | After                                                                                   |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| `minimal`     | `require-tool-input-schema` | `no-command-injection-in-tool`, `require-tool-input-schema`                             |
| `recommended` | `require-tool-input-schema` | `no-command-injection-in-tool`, `no-unvalidated-tool-args`, `require-tool-input-schema` |
| `strict`      | all 4                       | all 4 (unchanged)                                                                       |

Why each rule sits where it does:

- **`require-tool-input-schema`** stays in `minimal`. It now reports only a handler that reads arguments while no schema is declared. Those arguments never arrive, so every finding is a bug. Its severity drops from HIGH (CVSS 7.5) to MEDIUM (CVSS 5.3), because the old message overclaimed.
- **`no-command-injection-in-tool`** is promoted to `minimal`. After CMD-FP-1 its sinks are module-resolved, and a finding means a tool argument names the process that runs.
- **`no-unvalidated-tool-args`** is promoted to `recommended`. The review found no FP. A reported key is stripped by the schema, so it is always `undefined`, or, on a loose schema, it arrives unvalidated.
- **`no-tool-description-injection`** stays `strict`-only, because of the imported-description residual above.

`src/index.ts` now writes `recommended: { … rules: recommendedRules }` inline. That lets `scripts/sync-readme-rules.ts` fill the README 💼 column, which was previously empty for every rule. `src/index.test.ts` locks the README preset table and the 💼 column to `configs`. Against the old README the lock fails 5 of 5.

## Follow-up backlog: missing detections (new rules, out of scope here)

These were carried over from the review and are ranked by value. None is covered by the 4 existing rules.

1. **Path traversal in tool handlers and `ResourceTemplate` callbacks (CWE-22).** `readFile(path)` / `writeFile(...)` with a tool argument or a template variable. This is the EscapeRoute class (CVE-2025-53109/53110) and the mcp-server-git path CVEs. It can reuse this PR's handler/argument binding and the module-resolved sinks, with `fs` in place of `child_process`.
2. **SSRF from tool arguments (CWE-918).** `fetch(url)`, `axios`, `got`, `undici` with a tool argument as the URL.
3. **HTTP transport hardening (CWE-346/306).** `StreamableHTTPServerTransport` / `SSEServerTransport` without `enableDnsRebindingProtection` + `allowedHosts`, which defaults to `false` in SDK 1.27. Also `createMcpExpressApp({ host: '0.0.0.0' })` without `allowedHosts`, and no bearer-auth middleware on the route.
4. **SQL injection from tool arguments (CWE-89).** ``pool.query(`…${name}`)``, `db.exec(query)`, `db.prepare(sql)`.
5. **A shared `McpServer` / transport reused across requests in stateless HTTP mode.** This is the cross-client response leak, CVE-2026-25536.
6. **Predictable session IDs.** `sessionIdGenerator: () => String(n++)`, `Date.now()` or `Math.random()`.
7. **`eval` / `new Function` / `vm.runIn*` reachable from tool arguments (CWE-95).**
8. **Secrets in tool results, and token passthrough.** `process.env` returned in `content`, and `extra.authInfo.token` forwarded upstream.
9. **Client side.** Untrusted `listTools()` descriptions forwarded to an LLM, and `StdioClientTransport({ command })` built from untrusted config (the CVE-2025-6514 class).
10. **Duplicate tool names in one file.**
