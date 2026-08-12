---
'eslint-plugin-browser-security': patch
'eslint-plugin-secure-coding': patch
---

Remove two vestigial package-level lockfiles that carried vulnerable transitive dependencies.

These sat inside an npm-workspaces package where the root lockfile governs. They pinned
`ajv@6.12.6` and `brace-expansion@1.1.12/2.0.2`, which carry a ReDoS and three DoS advisories.

They were not reachable by any install path. `npm ci` from inside the package directory resolves
against the root lockfile and installs the fixed `ajv@6.15.0` / `brace-expansion@2.1.4`; with
`--workspaces=false`, or from a copy outside the workspace, `npm ci` fails outright because the
files are stale enough to be internally inconsistent (they pin `@interlace/eslint-devkit@1.2.1`
against a current `1.13.0`). `package-lock.json` is also excluded from published tarballs, so
consumers never saw them either.

The impact was on scanners, not installs: OSV reads lockfiles off disk regardless of npm's
resolution rules, so these two files alone produced all 29 vulnerabilities in the OpenSSF
Scorecard report while `npm audit` at the root stayed clean.
