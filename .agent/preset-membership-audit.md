# Preset membership audit — 2026-08-09

Every rule the ecosystem ships that is **not** in its plugin's `recommended`
preset, measured on both corpora before deciding whether it belongs there.

Method: enable the rule alone, count findings on the 13-repo wild corpus
(~1,900 files of real Express/NestJS code = false-positive cost) and on
ILB-CWE-Corpus split by vulnerable/safe fixture (= true-positive yield).

**223 rules ship. 179 are in `recommended`. 44 are outside — 36 live, 8 deprecated.**

## Verdict: promote none of them

Not one of the 36 live rules earns promotion on evidence. This is the useful
result — the presets are not missing coverage, and the rules outside them are
outside for reasons the measurements confirm.

### Disqualified on false-positive cost

| Rule | wild findings | corpus TP | corpus FP |
| --- | --- | --- | --- |
| `secure-coding/no-missing-authentication` | **195** | 23 | **31** |
| `browser-security/require-csp-headers` | 27 | 2 | 1 |
| `secure-coding/no-improper-type-validation` | 23 | 0 | 0 |
| `node-security/require-secure-deletion` | 15 | 0 | 0 |
| `browser-security/no-unencrypted-transmission` | 14 | 1 | 2 |
| `node-security/prefer-native-crypto` | 9 | 0 | 0 |
| `secure-coding/no-format-string-injection` | 8 | 2 | 1 |
| `jwt-security/require-issuer-validation` | 8 | 1 | 1 |
| `jwt-security/require-audience-validation` | 8 | 1 | 1 |
| `jwt-security/require-max-age` | 8 | 1 | 1 |
| `node-security/no-dynamic-require` | 4 | 0 | 0 |
| `node-security/no-dynamic-dependency-loading` | 4 | 0 | 0 |
| `secure-coding/require-backend-authorization` | 4 | 0 | 0 |
| `browser-security/no-sensitive-data-in-cache` | 4 | 0 | 0 |
| `secure-coding/no-electron-security-issues` | 3 | 0 | 0 |
| `secure-coding/require-secure-defaults` | 1 | 0 | 0 |

`no-missing-authentication` alone would add **195 findings** — two thirds of
the entire current corpus — for 23 true positives it mostly shares with rules
already enabled.

### Disqualified as redundant

| Rule | Why |
| --- | --- |
| `secure-coding/no-directive-injection` | Its 2 corpus TPs are on CWE-116 fixtures already scored **TP 2/2**. Adds no detection, and adds a false positive on `CWE-116/safe/dompurify-sanitize.js` — `DOMPurify.sanitize()` with an explicit allowlist, the canonical correct answer. **Rule bug, tracked below.** |
| `secure-coding/no-hardcoded-session-tokens` | Its 1 corpus TP is on a CWE-798 fixture already scored **TP 5/5**. |
| `browser-security/no-disabled-certificate-validation` | Detects the same `rejectUnauthorized: false` as `node-security/no-self-signed-certs`, promoted 2026-08-09. Enabling both double-reports one defect — the pattern already recorded against the two CSRF rules. |

### No measurable signal in either direction (16)

Zero findings on the wild corpus **and** zero on both halves of the CWE corpus:

`no-pii-in-logs`, `detect-weak-password-validation`,
`require-secure-credential-storage`, `require-storage-encryption`,
`no-cryptojs-weak-random`, `no-deprecated-cipher-method`,
`no-insecure-key-derivation`, `no-insecure-rsa-padding`, `no-sha1-hash`,
`no-password-in-url`, `no-sensitive-data-in-analytics`,
`no-tracking-without-consent`, `no-unescaped-url-parameter`,
`require-url-validation`, `require-mime-type-validation`,
`jwt-security/require-issued-at`

Several of these are things we *want* enforced — SHA-1, deprecated ciphers,
weak RSA padding. They stay out because nothing in either corpus exercises
them, so promoting them would be a guess. **The gap is corpus coverage, not
preset membership**: add fixtures that exercise these CWEs, then re-measure.

### Deprecated and correctly excluded (8)

`express-security` and `browser-security` each carry `no-missing-cors-check`,
`no-missing-csrf-protection`, `no-missing-security-headers`; browser-security
also has a deprecated `no-permissive-cors`, and secure-coding a deprecated
`no-insecure-comparison`. All name live replacements. The three that were
still in `express-security`'s `recommended` were removed this session (-43
wild findings).

## Follow-ups this audit produced

1. `no-directive-injection` reports `DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })`.
   A dedicated sanitizer with an explicit allowlist is the recommended fix for
   this CWE; the rule flags it. Real false positive, independent of promotion.
2. The 16 zero-signal rules need corpus fixtures before any membership decision
   can be made about them. Until then, "should we enable SHA-1 detection?" has
   no measurable answer.
