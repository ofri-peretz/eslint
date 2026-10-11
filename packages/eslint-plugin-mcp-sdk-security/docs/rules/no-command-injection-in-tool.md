---
title: no-command-injection-in-tool
description: Disallow an MCP tool argument choosing the command a child_process call runs.
tags: ['security', 'mcp']
category: security
severity: critical
cwe: CWE-78
autofix: false
---

> **Keywords:** command injection, CWE-78, MCP, Model Context Protocol, tool handler, child_process, execSync, spawn, agent security, RCE

<!-- @rule-summary -->
Disallow an MCP tool argument choosing the command a child_process call runs.
<!-- @/rule-summary -->

**CWE:** [CWE-78](https://cwe.mitre.org/data/definitions/78.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects a tool handler's own parameter — used as, built into, or derived into the command — reaching `exec`, `spawn`, `execFile`, `fork`, `execa` or a zx / execa `$` template. This rule is part of [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security).

💼 This rule is set to **error** in the `minimal`, `recommended` and `strict` configs.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-78](https://cwe.mitre.org/data/definitions/78.html) (OS Command Injection)   |
| **Severity**      | Critical (CVSS 9.8)                                                              |
| **Auto-Fix**      | ❌ No auto-fix available                                                         |
| **Category**      | Security                                                                         |

## Why this matters

A tool handler's parameter is attacker-influenced by construction. It is filled
from the model's tool call, and the model can be steered by any content it has
read — a web page it fetched, a file it opened, another tool's output. Treating
it as trusted is the MCP equivalent of trusting `req.body`, except the caller
is a language model that an attacker may be writing the inputs for.

When that value names the command, whoever steers the model chooses what runs
on the host.

## Relationship to `node-security/no-shell-injection`

`no-shell-injection` is shape-based: it reports `` exec(`git ${cmd}`) `` because
the interpolation is visible, and declines `exec(cmd)` because proving what
`cmd` holds needs value following. Inside an MCP tool handler the source is
known — the handler's own parameter — so this rule follows it and reports every
shape that lets it choose what runs:

```ts
server.registerTool('run', { inputSchema: { cmd: z.string() } },
  async ({ cmd }) => {
    execSync(cmd);                      // the argument IS the command
    execSync(`ls ${cmd}`);              // built from it
    const c = cmd.trim(); execSync(c);  // derived from it
  });
```

| Shape | This rule | `node-security/no-shell-injection` |
|---|---|---|
| `execSync(cmd)` — argument is the command | ✅ | — |
| `` execSync(`ls ${cmd}`) `` — built from the argument | ✅ | ✅ |
| `const c = cmd.trim(); execSync(c)` — derived from it | ✅ | — |
| `execSync('ls -la')` — static | — | — |

On the interpolated line both plugins may report. Tool handlers are this
plugin's own scope, so it reports them rather than leave a gap for servers that
do not install `node-security` (owner decision, 2026-10).

## ❌ Incorrect

```ts
// ❌ destructured argument names the command
server.registerTool('run', cfg, async ({ cmd }) => { execSync(cmd); });

// ❌ same thing through the whole-args object
server.registerTool('run', cfg, async (args) => { execSync(args.cmd); });

// ❌ spawn picks the binary too — the argv array does not help here
server.registerTool('run', cfg, async ({ bin }) => { spawn(bin, argv); });

// ❌ a shell's `-c` script is a command line
server.registerTool('run', cfg, async ({ command }) => { spawn('sh', ['-c', command]); });

// ❌ promisified, renamed, from execa, or behind a named handler — same sink
const execAsync = promisify(exec);
async function runHandler({ cmd }) { await execAsync(cmd); await execaCommand(cmd); }
server.registerTool('run', cfg, runHandler);

// ❌ the low-level Server: the arguments are request.params.arguments
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { arguments: args } = request.params;
  execSync(String(args?.cmd));
});
```

## How sinks and arguments are recognised

- **Sinks are resolved to their module**, never matched by name: an
  `exec`/`execSync`/`execFile`/`execFileSync`/`spawn`/`spawnSync`/`fork` bound
  to `child_process` (named, default, namespace, `require`, or
  `require('child_process').exec`), the same wrapped in `util.promisify`, and
  `execa`/`execaSync`/`execaCommand`/`execaCommandSync`/`execaNode`.
  `ISSUE_KEY.exec(key)` is a RegExp and `db.exec(sql)` is a database; neither
  is reported.
- **Tool arguments** are the handler's first parameter (destructured or whole)
  for `registerTool`/`tool`, and `request.params.arguments` for
  `setRequestHandler(CallToolRequestSchema)` / `setRequestHandler('tools/call')`.
  Each reference is resolved through the scope manager, so a callback parameter
  that shadows an argument is a different variable.
- **The argument's value is followed within the file**, bounded and
  cycle-guarded: through `const`/`let` bindings and reassignments,
  destructuring, member and element reads, `await`, string derivations
  (`.trim()`, `.split()`, `.slice()`, `.toLowerCase()`, `.join()`, `String()`,
  template literals, `+`) and the return value of a same-file helper.
- **A shell script position** — the element after `-c`, `-lc`, `/c` or
  `-Command` when the file is `sh`, `bash`, `zsh`, `cmd.exe`, `powershell`,
  `pwsh`… — is a command position too, and so is every argv element when the
  options set `shell: true`.
- **zx / execa `$` templates** quote each interpolation, so they are reported
  only where the argument chooses what runs: the first token (the binary),
  after `sh -c`, or under `$({ shell: true })`.
- **A closed set is the allowlist.** An argument whose input schema is
  `z.enum([...])`, `z.literal(...)` or `z.nativeEnum(...)` is not reported:
  the SDK rejects anything outside the set before the handler runs.

## ✅ Correct

```ts
// ✅ the argument selects an operation; the code names the binary
const ALLOWED = { list: 'ls', disk: 'df' } as const;

server.registerTool('run', cfg, async ({ op, target }) => {
  const binary = ALLOWED[op];
  if (!binary) throw new Error('unsupported operation');
  execFile(binary, [target]);   // user data is an argv element, never the command
});
```

Two things make that safe, and both are needed: the binary comes from a closed
set the code owns, and the user-supplied value is passed as an **argv array
element** rather than spliced into a command line. `execFile` with an array
does not involve a shell, so there is no metacharacter to escape.

## What this rule deliberately does not report

- **The whole args object.** `execSync(args)` is not a command; only a member
  of it (`args.cmd`) is.
- **A variable that is not a tool argument.** `execSync(configuredBinary)` may
  well be unsafe, but this rule cannot show it came from the model, and
  guessing is what earns a security rule its false-positive reputation.
- **A computed member.** `args[key]` is not statically a name.
- **A value the argument only selects.** `execSync(lookup(cmd))`,
  `ALLOWED[cmd]`, or `cmd.length > 3 ? 'ls' : 'pwd'` — an arbitrary call, a
  lookup or a comparison yields a value the code chose, not the argument's text.
- **A sink outside any tool handler.** The handler is the taint boundary; a
  sink elsewhere in the file is `node-security`'s question.
- **A file that imports no MCP server package** (`@modelcontextprotocol/sdk`,
  the v2 `@modelcontextprotocol/*` packages, `mcp-handler`).

## When Not To Use It

There is no configuration in which letting a model-supplied value name the
command is correct, so this rule has no options.

## Further Reading

- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [OWASP A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [MCP: Tools](https://modelcontextprotocol.io/docs/concepts/tools)
- [Node.js: `child_process.execFile`](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback)
