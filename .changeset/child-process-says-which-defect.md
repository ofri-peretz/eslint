---
'eslint-plugin-node-security': minor
---

`detect-child-process` no longer calls a shell-free spawn "command injection".

`spawn`, `execFile` and `fork` default to `{ shell: false }`. When the executable
name is attacker-steerable the defect is real, but it is process control, not
shell-metacharacter injection — and the rule reported it as CWE-78 at CVSS 9.8
with the advice *"use execFile/spawn with `{shell: false}`"*, which is what the
reported line already did. Remediation that is a no-op on the line it is attached
to is a finding nobody can act on.

Measured against eslint-plugin-security's own `valid` corpus, this fired on 11 of
their 19 valid cases for this class — the single largest source of our findings
on code a competitor labelled clean.

Those findings now report **`untrustedProgram`** — CWE-114, HIGH — whose fix is
to resolve the name against an allowlist of permitted executables. Nothing
becomes silent and nothing new is reported: the same calls report, saying what is
actually true about them. `exec`/`execSync`, an explicit `shell: true`, a literal
shell binary (`spawn('bash', ['-c', …])`) and eval flags (`-c`, `-e`, `/c`) all
still report CWE-78, because a shell really is in the picture.

If you match on `messageId`, add `untrustedProgram` alongside
`childProcessCommandInjection`. The rule's own docs already described this split
correctly — the code was the half that disagreed.
