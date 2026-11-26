---
'eslint-plugin-openai-security': patch
---

fix(openai-security): no longer declares `openai`, `@openai/agents` as optional `peerDependencies`

No source file ever imported them; the rules match the library by the import specifier in the linted code, so nothing needs installing. The entries only made npm warn on a version mismatch. The supported ranges are now listed in the README under "Supported library versions". Nothing changes at lint time. If you installed the plugin next to these libraries and relied on npm's peer warning, that warning is gone.
