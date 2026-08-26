# Verdict ledger

Every verdict this project has rendered against **real third-party code**, with
the repository, file and line that produced it, so any entry can be re-checked
rather than taken on trust.

Machine-readable in `VERDICT_LEDGER.json`. Definitions are the ordinary ones:

| | meaning |
| :--- | :--- |
| **TP** | we reported a defect and it was real |
| **FP** | we reported something that was not a defect |
| **TN** | code we correctly stayed silent on — pinned as a `safe/` fixture |
| **FN** | a defect we missed |

**Current: 6 TP · 10 FP · 0 FN identified.** The false positives represent
**1,069 findings** in the wild.

That ratio is not a scandal, it is the first honest count. Before 2026-08-26 the
scored corpus contained exactly one false positive, because nobody had looked
at real code — and the benchmark that would have told us could not run at all
(see the two commits that repaired `benchmarks/score.ts`). A corpus with no
false positives is an unexamined one.

## FN is empty, and that is a gap not an achievement

Nothing here records a defect we missed, because our method cannot find one. We
scan code, look at what we reported, and judge it. A vulnerability no rule fires
on produces no finding to review, so it never enters this table.

Closing that needs a different instrument: a corpus with independently-known
ground truth (a CVE set, or code another scanner flags and we do not). Until
then, recall numbers rest on fixtures we wrote ourselves, and should be read
that way.

## False positives

| id | rule | shape | in the wild | status |
| :--- | :--- | :--- | ---: | :--- |
| FP-001 | `no-zip-slip` | `.extract()` on a non-archive | 6 | **fixed** (#727) |
| FP-002 | `no-timing-unsafe-compare` | `node.kind === SyntaxKind.X` | 11 | **fixed** (#727) |
| FP-003 | `no-insecure-comparison` | `if (e.code == 'MODULE_NOT_FOUND')` | 140 | **configurable** |
| FP-004 | `require-secure-credential-storage` | `TOKEN_SIGNING_ALG = 'RS256'` | 110 | **fixed** |
| FP-005 | `no-innerhtml` | `DOMPurify?.sanitize(h) ?? h` | 21 | parked |
| FP-006 | `no-hardcoded-credentials` | TypeORM migration `name` | 20 | parked |
| FP-007 | `jwt/require-issuer-validation` ×3 | minimal `jwt.verify` | — | open |
| FP-008 | `pg/no-transaction-on-pool` | hardcoded identifier `pool` | — | open |
| FP-009 | `no-unsafe-regex-construction` | `new RegExp(node.pattern, node.flags)` | 11 | open |
| FP-010 | `detect-object-injection` | `obj[key] = value` | ~750 | open |

`detect-object-injection` alone is six of the top eleven clusters. It is the
largest single block of unexamined findings we have, and it is one rule.

## True positives

Each was verified by reading the code, not by trusting the finding, and each is
now an open pull request on the project it affects.

| id | rule | where | what it gates |
| :--- | :--- | :--- | :--- |
| TP-001 | `no-timing-unsafe-compare` | eclipse-theia/theia-cloud | five HTTP endpoints behind one bearer check |
| TP-002 | `no-math-random-crypto` | telepat-io/otto | the pairing code that claims a challenge |
| TP-003 | `no-timing-unsafe-compare` | telepat-io/otto | controller registration, the privileged role |
| TP-004 | `no-timing-unsafe-compare` | humanprotocol/human-protocol | a KYC webhook signature |
| TP-005 | `no-zip-slip` | nwutils/getter | symlink targets written from archive bytes |
| TP-006 | `no-permissive-trust-proxy` | cncjs/cncjs | an IP allowlist — disclosure drafted, unsent |

TP-005 is worth reading as a method note. The first read looked like four
holes; building actual malicious zips and running them against unmodified
`main` showed yauzl already refused three of them, and only the symlink target
escaped. The PR says so, with the table.

## How an entry is closed

A false positive is not closed when the rule stops firing. It is closed when a
fixture exists that **fails on the unfixed rule and passes on the fixed one** —
the standard this repo already applies to bugs. Fixtures carry `@source` naming
the real file they came from, and `@sealed` naming the rule they hold down.

Entries marked *parked* have a reproduction in
`benchmarks/corpus/_pending-rule-fix/` and are deliberately not scored: the
per-CWE false-positive budget is zero, and raising a budget to accept a known
defect is how it becomes permanent.
