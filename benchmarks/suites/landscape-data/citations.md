# License freedom matrix — citations (H#32)

All quotes retrieved **2026-07-31**. This document states what each license or
terms document **says**, quoted verbatim; it does not characterize any vendor's
intent. Where a term is ambiguous the cell says "unclear — see clause".
**Not legal advice; verify against the current license before relying on it.**

Axis definitions:

- **License** — SPDX id, or "proprietary terms" where no SPDX license applies.
- **OSI-approved** — the license appears on the OSI license list
  (<https://opensource.org/licenses>, retrieved 2026-07-31).
- **Free for private repos** — the license/terms permit analysis of private,
  commercial codebases at no charge.
- **Offline-capable** — the tool can run its analysis with no account and no
  required network connection.
- **No code upload** — source code is not sent to vendor servers as part of
  analysis.

## The matrix

| Tool | License | OSI-approved | Free for private repos | Offline-capable | No code upload |
|---|---|---|---|---|---|
| Interlace security plugins (10 pkgs) [^interlace] | MIT | yes | yes | yes | yes |
| eslint-plugin-security | Apache-2.0 | yes | yes | yes | yes |
| eslint-plugin-security-node | ISC (npm field) [^secnode] | yes | yes | yes | yes |
| @microsoft/eslint-plugin-sdl | MIT | yes | yes | yes | yes |
| eslint-plugin-no-unsanitized | MPL-2.0 | yes | yes | yes | yes |
| eslint-plugin-xss | ISC (npm field) [^xss] | yes | yes | yes | yes |
| eslint-plugin-sonarjs | LGPL-3.0-only [^sonarjs] | yes | yes | yes | yes |
| Semgrep OSS engine | LGPL-2.1 | yes | yes | conditional [^semgrep-metrics] | yes [^semgrep-metrics] |
| Semgrep Registry rules | Semgrep Rules License v1.0 [^semgrep-rules] | no [^semgrep-rules-osi] | yes — internal use only [^semgrep-rules] | yes (once fetched) | yes |
| CodeQL CLI | proprietary terms (GitHub CodeQL Terms and Conditions) [^codeql-terms] | no [^codeql-osi] | **no** [^codeql-private] | yes (within permitted purposes [^codeql-terms]) | yes |
| Snyk Code (free tier) | Apache-2.0 (CLI); service = proprietary terms [^snyk-cli] | CLI yes; service n/a | yes — with caps [^snyk-caps] | **no** [^snyk-auth] | **no** [^snyk-upload] |
| Bearer CLI | Elastic-2.0 [^bearer] | **no** [^elv2-osi] | yes [^bearer] | yes | yes |
| njsscan | LGPL-3.0 | yes | yes | yes | yes |
| DevSkim | MIT | yes | yes | yes | yes |

## Citations

[^interlace]: All 10 packages (`eslint-plugin-secure-coding`,
    `eslint-plugin-browser-security`, `eslint-plugin-node-security`,
    `eslint-plugin-express-security`, `eslint-plugin-lambda-security`,
    `eslint-plugin-mongodb-security`, `eslint-plugin-nestjs-security`,
    `eslint-plugin-vercel-ai-security`, `eslint-plugin-jwt`,
    `eslint-plugin-pg`) declare `"license": "MIT"` in their npm `package.json`
    and ship the MIT text; repo license: MIT
    (<https://github.com/ofri-peretz/eslint>, retrieved 2026-07-31). ESLint
    plugins execute inside the local ESLint process; no account, network, or
    upload is part of analysis.

[^secnode]: npm registry `license` field: `ISC`
    (<https://registry.npmjs.org/eslint-plugin-security-node>, retrieved
    2026-07-31). The GitHub API reports no detected license file for
    `gkouziik/eslint-plugin-security-node` (`license: null`, retrieved
    2026-07-31) — the npm field is the only license declaration found.

[^xss]: npm registry `license` field: `ISC`
    (<https://registry.npmjs.org/eslint-plugin-xss>, retrieved 2026-07-31).
    The GitHub API reports `NOASSERTION` for `Rantanen/eslint-plugin-xss`
    (retrieved 2026-07-31): no license file GitHub can classify.

[^sonarjs]: npm registry `license` field: `LGPL-3.0-only`
    (<https://registry.npmjs.org/eslint-plugin-sonarjs>, retrieved
    2026-07-31). The GitHub API reports `NOASSERTION` at the
    `SonarSource/SonarJS` monorepo level (retrieved 2026-07-31); the npm
    package declaration is the per-package license. "GNU Lesser General
    Public License version 3" appears on the OSI list
    (<https://opensource.org/licenses>, retrieved 2026-07-31).

[^semgrep-metrics]: Semgrep engine is LGPL-2.1
    (<https://github.com/semgrep/semgrep/blob/develop/LICENSE>, retrieved
    2026-07-31; "GNU Lesser General Public License version 2.1" appears on
    the OSI list). Marked *conditional* on offline because of the metrics
    default — Semgrep docs: "`--metrics auto` : (default) metrics are sent
    whenever rules are pulled from the Semgrep Registry or the user is
    logged in" and "`--metrics off` : metrics are never sent"
    (<https://semgrep.dev/docs/metrics>, retrieved 2026-07-31). The same
    page describes metrics as aggregate usage data; it does not describe
    source-code upload as part of `semgrep scan`.

[^semgrep-rules]: `semgrep/semgrep-rules` LICENSE: "Semgrep Rules License
    v1.0" (<https://github.com/semgrep/semgrep-rules/blob/develop/LICENSE>,
    retrieved 2026-07-31). The license text states: "You may use the rules
    only for your own internal business purposes." and "This license does
    not allow you to distribute the rules, or to make them available to
    others as a service."
    (<https://semgrep.dev/legal/rules-license>, v1.0, retrieved 2026-07-31).
    Internal analysis of private code is within "internal business
    purposes" as written; redistribution and rules-as-a-service are the
    quoted limitations.

[^semgrep-rules-osi]: "Semgrep Rules License" does not appear on the OSI
    license list (<https://opensource.org/licenses>, retrieved 2026-07-31).

[^codeql-terms]: "GitHub CodeQL Terms and Conditions"
    (<https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md>,
    retrieved 2026-07-31). Permitted purposes as listed: "Use the Software
    to perform academic research."; "Use the Software to demonstrate the
    Software."; and, for Open Source Codebases only, "Perform analysis on
    the Open Source Codebase." The CodeQL *queries* repo (`github/codeql`)
    is separately MIT-licensed (GitHub API `license.spdx_id: MIT`,
    retrieved 2026-07-31) — the engine/queries license split is real and
    recorded as such.

[^codeql-osi]: The CLI binaries are distributed under the GitHub CodeQL
    Terms and Conditions (see [^codeql-terms]), which is not on the OSI
    license list (<https://opensource.org/licenses>, retrieved 2026-07-31).

[^codeql-private]: Under "License Restrictions", the Terms state the
    Software may not be used: "in connection with any codebase that is not
    an Open Source Codebase (e.g., code in a private repo in GitHub)."
    The Terms also state: "if your use of the Software is under a paid
    customer license for GitHub Advanced Security, the restrictions … do
    not apply."
    (<https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md>,
    retrieved 2026-07-31.)

[^snyk-cli]: npm registry `license` field for the `snyk` CLI package:
    `Apache-2.0` (<https://registry.npmjs.org/snyk>, retrieved 2026-07-31).
    The GitHub API reports `NOASSERTION` for `snyk/cli` (retrieved
    2026-07-31). The analysis service is governed by Snyk's proprietary
    terms, not the CLI license.

[^snyk-auth]: Snyk docs: "Once you have installed the Snyk CLI … you need
    to authenticate with your Snyk account."
    (<https://docs.snyk.io/snyk-cli/authenticate-to-use-the-cli>, retrieved
    2026-07-31.)

[^snyk-upload]: Snyk docs, "How Snyk handles your data", Snyk Code section:
    "Snyk accesses your repository code for a one-time analysis and caches
    the source code according to the Cloud provider's storage minimum
    policy."
    (<https://docs.snyk.io/working-with-snyk/how-snyk-handles-your-data>,
    retrieved 2026-07-31.)

[^snyk-caps]: Snyk pricing FAQ: "If you sign up with our 'Free' plan, the
    limits are: Open Source, 200 tests; Code, 100 tests; IaC, 300 tests;
    Container, 100 tests." (<https://snyk.io/plans/>, retrieved
    2026-07-31.) The free plan does permit private repositories; the caps
    and cloud processing are separate axes and are kept separate here.

[^bearer]: `Bearer/bearer` `LICENSE.txt` is the Elastic License 2.0
    (<https://github.com/Bearer/bearer/blob/main/LICENSE.txt>, retrieved
    2026-07-31; GitHub API reports `NOASSERTION` because it cannot
    classify ELv2). Its limitations, verbatim: "You may not provide the
    software to third parties as a hosted or managed service …"; "You may
    not move, change, disable, or circumvent the license key functionality
    in the software …"; "You may not alter, remove, or obscure any
    licensing, copyright, or other notices of the licensor in the
    software." Local analysis of private code is within the copyright
    grant as written ("use, copy, distribute, make available, and prepare
    derivative works of the software").

[^elv2-osi]: "Elastic License" does not appear on the OSI license list
    (<https://opensource.org/licenses>, retrieved 2026-07-31).

## NOASSERTION gaps observed in this landscape

GitHub's license detection returned `NOASSERTION` (or null) for four
repositories in this registry, each recorded above with its npm-field or
license-file resolution: `snyk/cli` (npm: Apache-2.0), `Bearer/bearer`
(LICENSE.txt: Elastic-2.0), `SonarSource/SonarJS` monorepo (npm:
LGPL-3.0-only), `Rantanen/eslint-plugin-xss` (npm: ISC),
plus a null result for `gkouziik/eslint-plugin-security-node` (npm: ISC).
These are statements of what the APIs and files report, not judgments.

---

*Quotes retrieved 2026-07-31; not legal advice; verify against the current
license before relying on it. Second-agent adversarial re-verification of
every quote against the live URL is required before any public page renders
this table (leadership plan H6 gate).*
