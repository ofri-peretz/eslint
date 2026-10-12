# FP/FN audit: eslint-plugin-mcp-sdk-security → 1.0.0 (2026-10-12)

An independent review of all 15 rules before 1.0. It did not rely on the rule
tests or on the 2026-10-10 audit note: every finding below was reproduced
against the published `eslint-plugin-mcp-sdk-security@0.6.0` (installed in a
scratch directory with `eslint@9` and `typescript-eslint`), then fixed
test-first.

**Result.** 5 false-positive classes and 12 false-negative classes fixed. On
the published 0.6.0 the five new Quint models disagree with the rules on 1,248
of 6,156 generated programs (353 FP, 895 FN); after the fixes they disagree on
none. The real-code scan of 15 repositories ends with 9 findings, all true
positives.

## Method

- **Synthetic.** 35 snippets in the shapes people write: SDK v1
  (`@modelcontextprotocol/sdk`) and v2 (`@modelcontextprotocol/server`,
  `/node`, `/express`), `registerTool`, the legacy `tool()`,
  `setRequestHandler(CallToolRequestSchema | 'tools/call')`, `ResourceTemplate`
  resources, prompts, Streamable HTTP / SSE / stdio, `createMcpExpressApp`,
  `mcp-handler`, Cloudflare `McpAgent`, and the client side (`Client`,
  `StdioClientTransport`, `listTools`). Each variable renamed to `foo`/`bar`.
- **Quint oracle models** (`benchmarks/quint/`), new for this plugin, one per
  rule the coordinator named, plus a plumbing split for the command rule.
- **Real code**, every file that imports an MCP package, all 15 rules at
  `error`.
- **Test-first.** Every new case was run against the 0.6.0 sources (a copy of
  `HEAD:src` with the new test files) and failed there; 32 named review cases
  failed, which is all of them except the `precision lock:` / `recall lock:`
  cases, which pin behaviour the new code must keep. Coverage is 100/100/100/100
  over 1,074 tests.

## Repos scanned

716 files that import an MCP package, of 4,298 TS/JS files.

| Repository                               | MCP files | New this review |
| ---------------------------------------- | --------- | --------------- |
| modelcontextprotocol/servers             | 68        |                 |
| modelcontextprotocol/typescript-sdk (v2) | 407       |                 |
| vercel/mcp-handler                       | 14        |                 |
| cloudflare/mcp-server-cloudflare         | 13        |                 |
| modelcontextprotocol/servers-archived    | 11        | yes             |
| upstash/context7                         | 12        | yes             |
| supabase-community/supabase-mcp          | 27        | yes             |
| makenotion/notion-mcp-server             | 4         | yes             |
| stripe/agent-toolkit                     | 4         | yes             |
| microsoft/playwright-mcp                 | 2         | yes             |
| cloudflare/agents (McpAgent)             | 77        | yes             |
| wonderwhy-er/DesktopCommanderMCP         | 22        | yes             |
| Flux159/mcp-server-kubernetes            | 47        | yes             |
| executeautomation/mcp-database-server    | 2         | yes             |
| benborla/mcp-server-mysql                | 2         | yes             |

### Findings per rule

| Rule                               | 0.6.0          | 1.0.0    | Verdicts                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `no-sql-injection-in-tool`         | 1              | 1        | TP `servers-archived:src/postgres/index.ts:118`: the `query` tool runs `request.params.arguments.sql`; `BEGIN TRANSACTION READ ONLY` does not stop `COMMIT; DROP …`                                                                                                                                                                                                                              |
| `no-credential-leak-in-tool`       | 1              | 1        | TP `servers:src/everything/tools/get-env.ts:34` (returns `process.env`)                                                                                                                                                                                                                                                                                                                          |
| `no-ssrf-in-tool`                  | 0              | 1        | TP `servers:src/everything/tools/gzip-file-as-resource.ts:197`: the domain allowlist applies only when `GZIP_ALLOWED_DOMAINS` is set and is empty by default, so the tool fetches any URL (an FN in 0.6.0: the fetch sits in a helper)                                                                                                                                                           |
| `require-http-transport-hardening` | 4 (2 TP, 2 FP) | 6 (6 TP) | TP `servers:src/everything/transports/sse.ts:71`, `…/streamableHttp.ts:109`. FP fixed `context7:packages/mcp/src/index.ts:385` and `mcp-server-mysql:index.ts:496` (both serve the transport only behind a bearer check). New TP: `typescript-sdk:examples/{repl,standalone-get,legacy-routing,sse-polling}/server.ts` — `createMcpExpressApp()` then `app.listen(port)` binds `::` with no auth |
| every other rule                   | 0              | 0        | —                                                                                                                                                                                                                                                                                                                                                                                                |

Why the four SDK examples are true positives: `createMcpExpressApp()` only
installs `localhostHostValidation()`; it does not bind. `app.listen(port)`
binds every interface, and a network caller can send `Host: 127.0.0.1:port`
itself, so the localhost check does not stop it. The examples log
`listening on http://127.0.0.1…`, which is not what they do. The REPL example
exposes an evaluation tool this way.

Most sinks in the community servers (DesktopCommander, kubernetes, mysql,
database-server) live in modules that import no MCP package; the SDK-evidence
gate correctly keeps every rule off them. Where a sink sits in an MCP file it
is either fixed (`execFileSync('kubectl', args)`), validated in another module
(the filesystem server's `validatePath`), or reported above.

## Quint models

| Model                                                    | Cases | Disagreements on 0.6.0 | During this review           | Now |
| -------------------------------------------------------- | ----- | ---------------------- | ---------------------------- | --- |
| `mcp-sdk-security.no-command-injection-in-tool`          | 441   | 72 FN                  | 0                            | 0   |
| `mcp-sdk-security.no-command-injection-in-tool.plumbing` | 192   | 80 FN                  | 0                            | 0   |
| `mcp-sdk-security.no-path-traversal-in-tool`             | 1,720 | 254 FN                 | 165 FN (look-alike guards)   | 0   |
| `mcp-sdk-security.no-ssrf-in-tool`                       | 1,979 | 153 FP, 307 FN         | 190 FP (origin through hops) | 0   |
| `mcp-sdk-security.no-sql-injection-in-tool`              | 864   | 102 FN                 | 0                            | 0   |
| `mcp-sdk-security.require-http-transport-hardening`      | 960   | 200 FP, 80 FN          | 0                            | 0   |

Dimensions: SDK version and import style, registration API, how the argument
is read (destructure, member, `request.params.arguments`, Zod `parse` /
`safeParse`), the binding hop (inline, `const`, `let`, helper return, helper
sink, object field, array element), the sanitiser (real containment / host
allowlist against look-alikes), and the sink spelling (named, namespace,
`promisify`, `require`, `execa`, look-alike methods). Every disagreement was
read as a rendered program; all were rule defects, none model defects.

## Findings

| Finding                                                                                                                                                                  | FP/FN | Status | Test name                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1. Every taint rule: a sink inside a same-file helper the handler calls was never reported (pinned as a "recall boundary" in 0.6.0)                                     | FN    | fixed  | `FN: a sink in a same-file helper the setRequestHandler handler calls`, `FN: the SQL built in a same-file helper the tool handler calls`, `FN: eval in a helper given the whole arguments object`, `FN: a request helper, and a class method, given the tool URL`                                                                                                                                       |
| R2. Class-based servers: `this.method(args.x)` and handlers passed as `this.handle.bind(this)`                                                                           | FN    | fixed  | `FN: a class method reached through this, and a handler bound with .bind(this)`, `FN: a class method handler, passed bound, that reads arguments with no schema`                                                                                                                                                                                                                                        |
| R3. Arguments read through a Zod `parse` / `safeParse` (the reference servers' layout); closed-set keys stay the allowlist                                               | FN    | fixed  | `FN: arguments read through a Zod parse and safeParse`, `FN: a path read after a Zod parse of request.params.arguments`, `FN shapes: a zod/v4 schema, …`                                                                                                                                                                                                                                                |
| R4. Elements of an argument array (`for…of`, `map`, `forEach`) — moved from valid                                                                                        | FN    | fixed  | `FN: each element of an argument array (for…of, map and forEach callbacks)`, `FN: each path of an argument array, in a map callback and a for…of`                                                                                                                                                                                                                                                       |
| R5. Object literals given to a helper or held in a `const` (`run({ command: cmd })`) — moved from valid                                                                  | FN    | fixed  | `FN: an object literal handed to a helper, or held in a const`, `FN shapes: destructured helper parameters …`                                                                                                                                                                                                                                                                                           |
| R6. Token forwarded, and a stdio command launched, through a same-file helper                                                                                            | FN    | fixed  | `FN: the caller token forwarded through a same-file request helper`, `FN: a tool argument reaches the command through a launch helper`                                                                                                                                                                                                                                                                  |
| S1. SQL: Prisma `$queryRawUnsafe` / `$executeRawUnsafe`, knex `raw`, Sequelize `query` were not sinks                                                                    | FN    | fixed  | `FN: Prisma $queryRawUnsafe / $executeRawUnsafe, knex raw and Sequelize query with the argument as SQL`                                                                                                                                                                                                                                                                                                 |
| F1. SSRF: a scheme-only `startsWith('https://')` counted as a host check                                                                                                 | FN    | fixed  | `FN: a scheme-only startsWith check`, `FN: a scheme-only check on a converted URL, …`                                                                                                                                                                                                                                                                                                                   |
| F2. SSRF: a same-file predicate that never reads a host (`isValidUrl`) counted as a check                                                                                | FN    | fixed  | `FN: a same-file predicate that only parses the URL`, `FN: a destructured helper parameter, and a predicate that reads no host`                                                                                                                                                                                                                                                                         |
| F3. SSRF/path: a check nested inside another `if` counted as sanitising a helper                                                                                         | FN    | fixed  | `real code: the allowlist applies only when configured, and the default is empty`, `FN: a check nested in a condition does not sanitise the helper`                                                                                                                                                                                                                                                     |
| F4. SSRF: an allowlist written as `ALLOWED.some((h) => host === h)` was not a check                                                                                      | FP    | fixed  | `FP: the hostname checked against an allowlist inside a .some callback`                                                                                                                                                                                                                                                                                                                                 |
| F5. SSRF: a fixed-origin URL reported once it went through a `let`, a helper return, `String()`, `.href` or `.toString()` (Quint, 153 cases on 0.6.0)                    | FP    | fixed  | `FP: a fixed-origin URL bound through a let, returned by a helper, or wrapped in String() / .href`                                                                                                                                                                                                                                                                                                      |
| P1. Path: `String(p).endsWith('.md')` and `existsSync(pick(p))` counted as containment (Quint)                                                                           | FN    | fixed  | `FN: an extension check on a converted value, and an existence probe on a helper result`, `FN: a same-file function that only transforms or probes the path is no validator`                                                                                                                                                                                                                            |
| T1. Transport: `app.listen(port)` with no host on Express / `http.createServer` / `createMcpExpressApp()` binds `::`, but only an explicit `0.0.0.0` counted             | FN    | fixed  | `FN: an Express app listening with no host, and no auth`, `FN: a Node http server wrapping the app, listening with only a callback`, `real code: createMcpExpressApp() validates Host for localhost, but listen(port) still binds every interface`                                                                                                                                                      |
| T2. Transport: an inline bearer / API-key check before the transport (or `requireBearerAuth` on the route) was not authentication, and DNS-rebinding findings ignored it | FP    | fixed  | `FP: an inline bearer check before handleRequest is authentication`, `FP: an SDK v2 node handler behind a credential check computed from headers, through a callback`, `FP: a Hono route that checks c.req.header() …`, `FP: an SSE server whose GET and POST routes both sit behind requireBearerAuth`, `FP: createMcpExpressApp on every interface, serving the transport only behind a bearer check` |
| T3. Transport: the documented "auth in another module" false positive (`mountAuth(app)`)                                                                                 | FP    | fixed  | `FP: the app is handed to a setup function this file cannot see`                                                                                                                                                                                                                                                                                                                                        |
| D1. Description: a description file shipped beside the server (`__dirname`, `import.meta.url`) reported as untrusted                                                     | FP    | fixed  | `FP: a description read from a file beside the module (__dirname, import.meta.url)`, `FP: a description a relative module reads from beside itself`, `FP: __filename, a const path joined onto __dirname, and an as-cast path`                                                                                                                                                                          |

A working-directory-relative description file is still reported: a stdio
server's working directory is often the user's project (`FN kept: a
description read relative to the working directory, here or in another
module`).

### Existing tests changed

- `no-command-injection-in-tool`: `for (const item of cmd) execSync(item)` left
  "recall boundary: values that are not derived…" and `picked({ x: cmd })` left
  "recall boundary: helpers that …": both are R4/R5 false negatives, now
  invalid cases. Comments beside the old cases say so.
- `no-tool-description-injection`: the `FILE_DESCRIPTION` half of "…and a file
  read in another module" moved to valid (D1); that fixture module reads
  `new URL('./description.md', import.meta.url)`. The working-directory read
  that is untrusted is the new `CWD_DESCRIPTION` fixture export.
- `require-http-transport-hardening`: "a bind with no host argument is not an
  explicit all-interfaces bind" is unchanged and still valid — its `app` is not
  built in that file.

### Design constraint

No verdict reads a variable's name. Helpers are found by resolving the callee
(a declaration, a `const` function, or `this.m` within the same class body);
Zod schemas by resolving the receiver to a call into `zod`; HTTP apps and
servers by the export that built them. API vocabulary is matched as API, with
`@vocabulary` notes: WHATWG `href`/`toString`, request header reads
(`headers`/`header`/`get`). The SDK-evidence gate is unchanged
(`sdk-gate-coverage.lock` passes).

## Gates

- Package: `npx vitest run --coverage` 1,074 passed at 100/100/100/100;
  `npm run typecheck` clean; `npm run build` clean.
- `taxonomy` job, all 12 steps: pass.
- `check:corpus-coverage`, `recall-gate` (TP 88, FP 0, FN 9; no CWE lost a
  detection), `lint:severity-consistency`, `documented-options-exist`,
  `credential-fixture-shape`: pass.
- `vitest --root benchmarks`: every test touching this plugin passes,
  including all six mcp-sdk-security Quint models, `sdk-gate-coverage.lock`
  and `sealed-vs-open-lock`. The only failures at the time of writing are
  other agents' in-progress Quint models (`anthropic-security`,
  `gemini-security`, `openai-security`, `supabase-security`).
- Corpus: a new CWE-078 pair, `mcp-tool-helper-shell.js` (vulnerable: Zod-parsed
  argument reaches a shell in a helper) and `mcp-tool-helper-enum.js` (safe).

## Deferred

None.
