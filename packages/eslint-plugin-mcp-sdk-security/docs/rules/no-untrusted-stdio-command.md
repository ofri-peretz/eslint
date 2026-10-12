---
title: no-untrusted-stdio-command
description: Disallow an MCP client spawning a stdio server whose command comes from a tool argument, a network response or a project config file.
tags: ['security', 'mcp']
category: security
severity: high
cwe: CWE-78
autofix: false
---

> **Keywords:** command injection, CWE-78, MCP, Model Context Protocol, MCP client, StdioClientTransport, CVE-2025-6514, MCPoison, .mcp.json, npx, agent security, RCE

<!-- @rule-summary -->

Disallow an MCP client spawning a stdio server whose command comes from a tool argument, a network response or a project config file.
<!-- @/rule-summary -->

**CWE:** [CWE-78](https://cwe.mitre.org/data/definitions/78.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects `new StdioClientTransport({ command, args })` where the command, a shell's `-c` script or the package a runner such as `npx` fetches comes from data an attacker controls. This rule is part of [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security).

💼 This rule is set to **error** in the `recommended` and `strict` configs.

## Quick Summary

| Aspect            | Details                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-78](https://cwe.mitre.org/data/definitions/78.html) (OS Command Injection) |
| **Severity**      | High (CVSS 8.8)                                                                 |
| **Auto-Fix**      | ❌ No auto-fix available                                                        |
| **Category**      | Security                                                                        |

## Why this matters

An MCP client starts a stdio server by running a process on its own host.
`StdioClientTransport` takes the `command` and `args` and spawns them, so
whoever chooses those values runs code as the user. This is the client side of
the CVE-2025-6514 class (a client that runs what a server or registry tells it
to) and of project-config attacks such as "MCPoison" (a repository ships an
`.mcp.json` whose server entry runs the attacker's command when the user opens
the project).

Three places hand a client a command it does not own:

- **A tool argument.** A "hub" tool that launches other servers from model
  input lets anything that steers the model choose the command.
- **A network response.** A registry or marketplace entry fetched at runtime is
  whatever the remote host, or anyone on the path, sends.
- **A project config file.** A file read from the working directory
  (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`) belongs to the author of
  whatever repository the user opened, not to the user.

## Relationship to `node-security` and `secure-coding`

There is no overlap. `node-security/no-shell-injection` and
`secure-coding`'s command-injection checks look at `child_process` calls; the
MCP SDK spawns the process inside `StdioClientTransport`, so no
`child_process` call appears in the client's code. This rule reads the
transport's options, which only an MCP-aware rule knows are a command line.

The server-side counterpart, a tool argument reaching `child_process`, is
[`no-command-injection-in-tool`](./no-command-injection-in-tool.md).

## ❌ Incorrect

```ts
// ❌ a tool argument names the command a hub tool spawns
server.registerTool('launch', cfg, async (args) => {
  const transport = new StdioClientTransport({
    command: args.command,
    args: args.args,
  });
  await client.connect(transport);
});

// ❌ the opened repository's .mcp.json chooses the command
const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));
for (const [name, server] of Object.entries(cfg.mcpServers)) {
  new StdioClientTransport({ command: server.command, args: server.args });
}

// ❌ a registry entry fetched over the network
const entry = await (await fetch(REGISTRY_URL)).json();
new StdioClientTransport({ command: entry.command });

// ❌ a static shell runs an untrusted script
new StdioClientTransport({ command: 'sh', args: ['-c', server.script] });

// ❌ a static runner fetches an untrusted package
new StdioClientTransport({ command: 'npx', args: ['-y', args.pkg] });
```

## How positions and sources are recognised

- **The sink** is `new StdioClientTransport(...)` resolved to an MCP package
  (`@modelcontextprotocol/sdk/client/stdio.js`, or v2's
  `@modelcontextprotocol/client` / `@modelcontextprotocol/node`), never matched
  by name. The options are read inline, from a same-file `const`, or through a
  spread (`{ ...server }` supplies `command` unless a later key replaces it).
  Options that cannot be read are skipped, unless the options value is itself
  untrusted (`new StdioClientTransport(server)`).
- **Positions:** the `command`; every `args` element after `-c`, `-lc`, `/c`
  or `-Command` when the command is a static `sh`, `bash`, `zsh`, `cmd`,
  `cmd.exe`, `powershell` or `pwsh`; and the first non-flag `args` element
  when the command is a static `npx`, `uvx`, `bunx`, `pnpx` or `pipx` (after
  `pipx run`), because that element names the package that runs. A whole
  `args` array that is untrusted counts for a static shell or runner.
- **Tool arguments** are a tool handler's parameters, as in
  `no-command-injection-in-tool`. A key the input schema restricts to
  `z.enum` / `z.literal` is the allowlist.
- **Network responses** are the result of `fetch`, `axios`, `got`, `undici`,
  `node-fetch` or `http(s)` requests, their `.json()` / `.text()`, and their
  `.data` / `.body`.
- **Project config files** are `readFile` / `readFileSync` (from `fs`,
  `fs.promises` or `fs/promises`) of a project-relative path, and
  `JSON.parse` of the result. A path is project-relative when it is a static
  string that is not absolute, or is built from `process.cwd()` (the global)
  through `path.join` / `path.resolve` or a template that starts with it.
- **Values are followed within the file**: bindings, destructuring, member
  reads, `await`, string derivations, a same-file helper's return, `for…of`
  and `.map` / `.forEach` / `.flatMap` over an untrusted value, and
  `Object.entries` / `Object.values` / `Object.keys` of one.

## ✅ Correct

```ts
// ✅ the untrusted value only selects a server from a table the code owns
const ALLOWED = {
  git: { command: 'uvx', args: ['mcp-server-git'] },
  time: { command: 'uvx', args: ['mcp-server-time'] },
} as const;

server.registerTool('launch', cfg, async ({ name }) => {
  const entry = ALLOWED[name];
  if (!entry) throw new Error('unknown server');
  await client.connect(new StdioClientTransport(entry));
});

// ✅ the user's own configuration, not the opened repository's
const cfg = JSON.parse(
  readFileSync(
    path.join(os.homedir(), '.config', 'mcp', 'servers.json'),
    'utf8',
  ),
);
```

A client that must honour a project's server list should show each new or
changed entry to the user and spawn it only after approval, keyed on the exact
command and arguments, so that a later edit to the file needs a new approval.

## What this rule deliberately does not report

- **A lookup into a static allowlist.** `ALLOWED[name]` yields a value the
  code chose.
- **The user's own config.** A path under `os.homedir()`, or an absolute path,
  is not a source; neither is a path the rule cannot place (a parameter, a
  dynamic segment in `path.resolve`).
- **Other `args` positions.** An untrusted argument passed to a fixed server
  (`['-y', 'server-filesystem', root]`), or to a command that is neither a
  shell nor a package runner, is that server's input.
- **`env` and `cwd`.** They are not followed, even though an environment
  variable such as `NODE_OPTIONS` can also change what runs.
- **Options the rule cannot read**, including options defined in another
  module.
- **A file that imports no MCP package.**

## When Not To Use It

There is no configuration in which letting a tool argument, a downloaded
document or a repository's file choose the process a client spawns is safe
without approval, so this rule has no options.

## Further Reading

- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [OWASP A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [MCP: Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)
- [CVE-2025-6514 (mcp-remote)](https://nvd.nist.gov/vuln/detail/CVE-2025-6514)
