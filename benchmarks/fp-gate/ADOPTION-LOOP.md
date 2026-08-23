# The adoption loop

```
  1. FIND      candidate repos          ADOPTION-TARGET-NETWORK.md (131 qualified)
  2. SCAN      at HEAD, published prod  scripts/ilb-adoption-triage.mts
  3. TP   -->  open a PR                a fix + the one rule that caught it + the install
  4. FP   -->  fix the rule, PUBLISH,   scripts/ilb-fp-gate.ts, then re-scan
              re-scan to confirm
```

## Step 4 does not end at "fixed"

Every false positive found so far came from the **npm tarball**, not from `main`. A
stranger runs what is published. `main` had already fixed all six jwt rules on a bare
`.verify()` before this campaign started, and it made no difference to anyone, because
the fix was never released.

So the loop's exit condition is a **re-scan against the published package**, not a green
test suite. Until then a fix has changed nothing outside this repository.

## Step 3 has never fired

Across 7 repositories scanned and ~14 findings read by hand, **zero true positives** have
survived verification:

| repo | candidates read | TP |
|---|---:|---:|
| ahaenggli/AzureAD-LDAP-wrapper | 3 | 1 (too weak to lead with) |
| shardeum/json-rpc-server | 4 | 0 |
| add2cal/add-to-calendar-button | 2 | 0 |
| LavaMoat/LavaMoat | 1 | 0 |
| ApparyllisOrg/SimplyPluralApi | 2 | 0 |
| ably-chat-js | 1 | 0 |
| n11techhub/mcp-bitbucket | 2 | 0 |

This is the finding that should drive planning: **the bottleneck is not target supply.**
There are 131 qualified repos and only 7 have been scanned. The bottleneck is precision —
the loop currently runs as an FP-discovery engine, which is valuable, but it means
outreach stays gated on step 4.

## Rules for step 3

Not every true positive is PR-worthy. Two recurring shapes that are *real* but must not
be filed:

- **Maintainer-run scripts.** `exec(\`git ${command}\`)` in a deploy script, `process.argv[2]`
  in a release script. Mechanically injection; no trust boundary, because the attacker is
  the person running the release. Seen in `add-to-calendar-button` and `ably-chat-js`.
- **Findings the repo already knows about.** Check for an existing `eslint-disable` on the
  line before writing a word. Telling someone their rule is noisy when they already
  disabled it reads as condescension.

## Rules for step 2

- Scan **at HEAD**, freshly cloned. A stale clone verifies nothing.
- Volume is the strongest FP signal. A rule firing 100+ times on one repository is
  describing a coding style. The three noisiest rules in `strict` produced 75% of all
  findings and every one sampled was false.
- Never report "0 findings" without proving the rule set loaded. Both harness bugs found
  while building this — a 7-rule preset silently standing in for 201, and a worktree
  measuring the wrong checkout — presented as clean repositories.
