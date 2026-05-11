# @interlace/cli

> One-command CLI for the Interlace ESLint security ecosystem. Drop-in `interlace audit` instead of memorizing `npx eslint --plugin secure-coding ...`.

## Install

```bash
npm install -g @interlace/cli
# or zero-install:
npx @interlace/cli --help
```

## Usage

```bash
interlace audit                       # Lint cwd with all installed Interlace plugins
interlace audit src --json            # JSON output
interlace audit src --sarif > out.sarif   # SARIF v2.1.0 (consumable by GHAS)
interlace audit --plugin secure-coding ./src

interlace init                        # Generate a starter eslint.config.mjs
interlace init --force                # Overwrite existing

interlace bench                       # Quick local bench (npm run ilb:smoke)

interlace mcp secure-coding           # Start the MCP server for the secure-coding plugin
                                       # (used by Claude Code / Cursor / any MCP client)

interlace --help                       # Full help
interlace --version
```

## Recommended first run for a new project

```bash
cd your-project
npx @interlace/cli init               # writes eslint.config.mjs
npx @interlace/cli audit              # lint everything
```

## Why this CLI exists

The Interlace ecosystem ships 11 security plugins, a SARIF formatter, MCP servers per plugin, and a benchmark suite. Without this CLI, getting started requires memorizing all of them. With it: one word.

See the [main project](https://github.com/ofri-peretz/eslint) for the full ecosystem, plus the [GitHub Action](https://github.com/ofri-peretz/eslint/tree/main/.github/actions/audit) for one-line CI integration.

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

