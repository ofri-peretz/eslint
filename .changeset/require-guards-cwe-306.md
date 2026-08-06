---
'eslint-plugin-nestjs-security': patch
---

`require-guards` reported the wrong CWE at the wrong severity on every finding.

It declared `CWE-284` at CVSS `9.8` (CRITICAL). Both were wrong.
[CWE-284](https://cwe.mitre.org/data/definitions/284.html) is a **Pillar**, and
MITRE marks it **Discouraged** for mapping real vulnerabilities — its own
guidance says the name "is often misused in low-information vulnerability
reports". And `9.8` requires `C:H/I:H/A:H` at once, which one missing guard does
not produce: an unguarded route that reads scores 7.5
(`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`) and one that mutates also scores 7.5
(`C:N/I:H/A:N`).

- `missingGuards`, `emptyGuards` — now `CWE-306` (Missing Authentication for
  Critical Function; Base, mapping Allowed) at CVSS 7.5, HIGH.
- `missingRequiredGuard` — now `CWE-862` (Missing Authorization) at CVSS 6.5,
  MEDIUM. It is a different weakness: the route _is_ guarded, so authentication
  runs and only a required policy guard is absent, which also means the caller
  needs privileges to reach it (`PR:L`, not `PR:N`).

No detection behaviour changes — same findings, honest labels. Reporting every
finding as CRITICAL left nothing to say when something genuinely is.
