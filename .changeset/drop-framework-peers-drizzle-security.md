---
'eslint-plugin-drizzle-security': patch
---

fix(drizzle-security): no longer declares `drizzle-orm` as optional `peerDependencies`

No source file ever imported it; the rules match the library by the import specifier in the linted code, so nothing needs installing. The entries only made npm warn on a version mismatch. The supported ranges are now listed in the README under "Supported library versions". Nothing changes at lint time. If you installed the plugin next to this library and relied on npm's peer warning, that warning is gone.
