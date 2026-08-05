---
"eslint-plugin-anthropic-security": patch
"eslint-plugin-openai-security": patch
"eslint-plugin-gemini-security": patch
"eslint-plugin-mcp-sdk-security": patch
"eslint-plugin-jwt-security": patch
"eslint-plugin-postgresql-security": patch
"@interlace/eslint-devkit": patch
---

Complete the logo row across every published package.

The six AI SDK family plugins landed after the logo row shipped, so they had no
marks; @interlace/eslint-devkit never had a header row at all. All of them now
carry Interlace -> ecosystem -> oxlint -> ESLint (devkit has no ecosystem mark).

The four AI SDK READMEs are also brought to the canonical structure they were
missing: Philosophy, Getting Started, Configuration Presets, Compatibility,
Related Plugins, and the 11-column rule table with the type-awareness column.

README-only change; no rule behaviour is affected. The patch bump is what
carries the new README onto npm, which only refreshes a package README on
publish.
