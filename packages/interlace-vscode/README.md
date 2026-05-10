# Interlace ESLint — VS Code Extension

> One-click access to the [Interlace ESLint security ecosystem](https://github.com/ofri-peretz/eslint) inside VS Code. Squiggles for security findings, audit-on-save, and a single command to boot any of the 11 plugin MCP servers so an in-editor AI agent (Claude Code, Cursor, GitHub Copilot Workspace) can call lint rules as typed tools.

## Install

Marketplace:

```
ext install interlace.interlace-vscode
```

Or from the command palette: `Extensions: Install from VSIX…` and pick the `.vsix` you built locally.

## Prerequisites

The extension shells out to the `interlace` CLI. Install it once globally:

```bash
npm install -g @interlace/cli
```

(Or set `interlace.cliPath` in settings to a different binary path.)

## Commands

| Command | What it does |
| :--- | :--- |
| **Interlace: Audit Current File** | Lint the active file, show findings as squiggles + Problems-panel entries |
| **Interlace: Audit Workspace** | Lint the whole workspace |
| **Interlace: Init (write eslint.config.mjs)** | Drop the recommended starter config |
| **Interlace: Start MCP Server for Plugin…** | Pick a plugin (secure-coding, browser-security, …) and start its MCP server in a terminal — pipe-ready for Claude Code / Cursor |

## Settings

| Setting | Default | Notes |
| :--- | :--- | :--- |
| `interlace.cliPath` | `interlace` | Path to the binary |
| `interlace.plugins` | `secure-coding,node-security,browser-security` | Or `all` for the full security fleet |
| `interlace.failOn` | `warning` | `error` / `warning` / `none` |
| `interlace.runOnSave` | `true` | Audit on file save |
| `interlace.supportedLanguages` | `[js, jsx, ts, tsx]` | Which languages activate the extension |

## Status bar

A `🛡 Interlace` indicator shows the current finding count. Click it to re-audit the active file.

## Why use this vs. the official ESLint extension

- **One-click MCP server boot** for AI-agent integration. No JSON-config wrangling.
- **Built-in security fleet** — `interlace audit` already enables 11 security plugins; the official ESLint extension makes you wire each up manually.
- **Status-bar indicator** showing finding count without opening the Problems panel.
- **Identical findings to CI** — the extension shells the same `interlace` binary your GitHub Action uses, so local ≡ CI by construction.

## Building from source

```bash
cd packages/interlace-vscode
npm install
npm run build
# Then F5 in VS Code to launch an Extension Development Host.
```

To package as `.vsix`:

```bash
npx @vscode/vsce package
```

## License

MIT — same as the rest of the Interlace ecosystem.
