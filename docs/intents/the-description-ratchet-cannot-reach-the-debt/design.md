# Design — charge the debt to the rule being edited

> Stage 2 artifact. Accepts [intent.md](./intent.md).

**Status:** shipped · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## Requirements

1. Editing a rule's source, while that rule has undescribed cases, fails.
2. Editing a rule already at zero undescribed passes untouched.
3. Deleting cases never reads as a regression.
4. A rule nobody edits blocks nobody.
5. One diff-to-rules mapping in the repository, not two.

## Design

A new mode on the existing gate: `check:rule-cases --touched`.

It reuses `changedRules()` from `scripts/rule-audit-gate.ts` — exported rather
than reimplemented — which resolves `git diff --cached` to the rules whose
behaviour the staged change could have moved, and already pulls in a whole
plugin when a shared `src/utils/*` is touched.

For each touched rule the gate requires its undescribed count to be **strictly
lower** than the recorded baseline. Not zero: a rule at 189 cannot be cleared
in the change that fixes a bug in it, and demanding that would make the gate
something people route around. One case named per edit is enough — the debt
drains at the rate the code is actually worked on, which is the only rate that
was ever going to happen.

A rule at zero is exempt, so the common case costs nothing.

`--touched` runs in the PRE-COMMIT hook beside `rule-audit:gate --changed`,
which already stages the same diff. The full `check:rule-cases` keeps running
in CI unchanged.

## Verification

All four demonstrated before shipping, against
`secure-coding/detect-object-injection` (197 undescribed, the worst in the
repo) and `anthropic-security/no-browser-api-key-exposure` (zero):

1. Edited the rule's source, described nothing → **exit 1**,
   `secure-coding/detect-object-injection  197 undescribed`.
2. Same edit, one case named → count fell 197 → 196 → **passes**.
3. Edited a rule already at zero → **passes**, no output.
4. Deleted a case from a touched rule → **passes**; a deletion lowers the count
   and must never read as a regression.

Case 2 took two attempts and the first is worth recording: replacing the bare
string `'const val = a[b][c];'` with a `{ name, code }` object produced
`} },` — a nested brace, because the case was ALREADY wrapped in an object.
The ledger then read the whole malformed literal as the `code` and the count
stayed at 197, which is what a gate should do when handed something it cannot
parse. Fixed by adding `name:` to the existing object rather than replacing it.

## The gate blocked the commit that introduced it

Worth recording, because it was a real design flaw and not a false alarm.

`--update` rewrites the baseline to match the current count. A change that
names a case AND updates the baseline in one commit therefore compared 196
against 196 and read as a stall — the reduction it had just made was invisible
to the gate that asked for it.

Fixed by reading the baseline as **committed in HEAD** rather than as it sits
in the working tree, which is the only comparison that answers "did this change
make it better". Re-proven in both directions afterwards:
`node-security/no-buffer-overread  165 undescribed` still fails on a bare edit.

## Rejected alternatives

**Require zero on touch.** Rejected: a rule at 189 is untouchable under that
rule, so the first person to need a bug fix in it either writes 189 names or
finds a way around the gate. Gates that make ordinary work impossible get
disabled, and then the line they held is gone too.

**A global downward ratchet — total must fall every week.** Rejected: it
creates pressure with no owner. Whoever commits last on a quiet week pays a
debt they did not incur, which is how a shared gate becomes resented and then
excluded.

**Naming campaign, clear all 14,890.** Rejected in the intent and again here.
Names written to clear a number say nothing; the 47 pinned blind spots this
quarter were found by probes, not prose. Worse, a bulk rename would make the
metric read as solved while the cases stayed exactly as unexamined.

**A second diff-to-rules resolver inside `rule-case-ledger.ts`.** Rejected:
two mappings that can disagree is the defect `no-privilege-escalation` had
tonight — one half of a rule widened, the other not, and a request value
reaching an authorisation field through the half that could not see it.

## Out of scope

The TN-versus-TP priority argued in
`an-unexplained-valid-case-is-a-pinned-blind-spot`. This gate treats both
alike; weighting them is a separate change, and stacking it here would make
neither reviewable.
