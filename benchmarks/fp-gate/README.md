# FP-Gate — the benign corpus that must stay silent

Every file in `corpus/` is code that has been **read by a human and confirmed not to be
a vulnerability**. Most of it is lifted verbatim from real open-source repositories, with
the provenance recorded in a header comment. Any finding on this corpus is, by
construction, a false positive.

## Why this exists

A rule's own test fixtures only ever contain code that already looks like its target
domain. Every fixture in `eslint-plugin-jwt-security/…/require-algorithm-whitelist.test.ts`
names the receiver `jwt`:

```js
valid: {
  code: `jwt.verify(token, secret, { algorithms: ['RS256'] });`;
}
invalid: {
  code: `jwt.verify(token, secret);`;
}
```

The rule actually keys on `.verify(`, not on anything JWT-related. No fixture in the suite
can reveal that, because none of them names the receiver anything else. In the wild it
fires on `this.verify(changes, [], facts)` in a repo with no JWT anywhere
(LavaMoat/LavaMoat `packages/harden/src/pnpm/opinions.js:69`).

This corpus is the opposite population: **plausible code the rules should ignore.**

## The contract

- Findings on this corpus are false positives. There is no per-file expectation list to
  maintain — the whole corpus must be silent.
- Scope is **security plugins only**. A style rule reporting here (`prefer-node-protocol`,
  `no-commonjs`) is correct behaviour and out of scope; the contract covers the claims
  that cost credibility when they are wrong.
- Fixtures must be _narrow_. If a fixture triggers a rule for a legitimate reason
  unrelated to the FP it is pinning, fix the fixture. `intentionally-public-endpoints.js`
  installs helmet and rate limiting precisely so that `require-helmet` — a correct
  finding — does not pollute the signal.

## Ratchet, not a cliff

`baseline.json` records the false positives known today. CI fails when the count **grows**
or a new construct starts firing. Every fix shrinks the baseline. When it reaches zero the
gate flips to `--strict` (zero tolerance).

```bash
npx tsx scripts/ilb-fp-gate.ts            # report + ratchet check (CI)
npx tsx scripts/ilb-fp-gate.ts --update   # re-baseline after a fix lands
npx tsx scripts/ilb-fp-gate.ts --strict   # zero findings allowed
```

## It refuses to report a number it cannot stand behind

If any in-scope security plugin fails to load, the gate **aborts** rather than reporting a
partial count. A gate covering a third of the fleet reports "0 new false positives" for the
same reason an empty directory does. Override deliberately with `--allow-partial`.

Plugins are resolved by **explicit path into this tree's `packages/`**, never by bare
package name: in a git worktree `node_modules` is usually symlinked to the primary
checkout, so a bare import silently measures the _other_ tree's code.

### Setup

The gate loads each plugin's built entry point, so the workspace must be built —
and in a worktree that needs a real install, not a symlinked `node_modules`
(a symlink makes `@interlace/eslint-devkit` resolve to the primary checkout's older
build, and plugins then fail to compile against it):

```bash
npm install && npx turbo build --filter="./packages/eslint-plugin-*"
```

## Adding a case

1. Confirm by hand that the code is genuinely benign. **Do not add a case you have not
   read.** A wrong entry here permanently blinds the gate to a real vulnerability class.
2. Record provenance: repo, path, line, and the commit/date it was read at.
3. State _why_ it is benign in the header, in terms of the security property — not
   "this is fine", but "an X.509 thumbprint is a protocol-mandated identifier and cannot
   be upgraded to SHA-256".
4. Run the gate. If it fires, that is a new confirmed FP: fix the rule, or add it to the
   baseline with a linked issue.

## Measured noise, by preset (2026-08-22)

78.3 KLOC / 534 files of well-maintained real code — `ahaenggli/AzureAD-LDAP-wrapper`,
`shardeum/json-rpc-server`, `add2cal/add-to-calendar-button`, `LavaMoat/LavaMoat` — linted
at `origin/main`, counting only rules the preset actually enables.

| preset        | plugins | rules | findings | per KLOC |
| ------------- | ------- | ----- | -------- | -------- |
| `recommended` | 21      | 201   | 82       | **1.05** |
| `strict`      | 21      | 272   | 572      | **7.30** |

**The default is quiet; `strict` is where the noise lives.** Three rules produce 429 of
`strict`'s 572 findings (75%):

| rule                                        | findings | what it actually flags                                                                                         |
| ------------------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------- |
| `secure-coding/detect-object-injection`     |      182 | `delete all[key]`, `db[newEntryDN] = x` — local object writes. The single most-disabled rule in the ecosystem. |
| `secure-coding/no-improper-type-validation` |      126 | `config.LDAP_PORT != 636`, `value.length == 0` — this is `eqeqeq` with a CWE tag.                              |
| `secure-coding/no-insecure-comparison`      |      121 | Overlaps the row above so heavily that both fire on the same line.                                             |

The worst single case: `if ((typeof arr[i]) == 'object' && arr[i] !== null)` — the textbook
null-safe object check — is reported by **two** rules at once.

`no-improper-type-validation` is also `error` in the `owasp-top-10` preset. That is the
highest-priority correction: `owasp-top-10` is a preset people enable deliberately for
compliance, and it currently reports the correct defensive idiom as an OWASP finding.

Top of `recommended`, for triage (not yet verified as FPs beyond the baseline):
`no-toctou-vulnerability` 17, `browser-security/no-innerhtml` 14,
`detect-eval-with-expression` 10, `no-math-random-crypto` 7.
