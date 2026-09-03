# Intent — the description ratchet is shrink-only and nothing shrinks it

> Stage 1 artifact. Opened after measuring how the 14,890 undescribed cases
> actually move under the gate that governs them.

**Status:** shipped · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

The undescribed-case count falls as a consequence of ordinary work, without
anyone scheduling a naming campaign. The gate creates pressure along the paths
people already touch.

## Why now

`check:rule-cases` freezes undescribed cases **per rule** and permits only a
fall. That design is right — a single total would let one rule add two hundred
while another happened to describe two hundred — and it has held: no rule has
gained an undescribed case since it shipped.

But holding is all it does. The ratchet has no downward force. A rule at 189
undescribed cases may be edited freely, forever, provided it does not reach 190. **419 rules carry the debt and the mechanism to reduce it is "somebody
decides to".** Nobody decides to; there is always a rule to fix instead.

Meanwhile the count is the largest number in the quality surface — 79.6% of
all cases — and it is quoted nowhere, because a number that never moves stops
being read. That is the failure mode this repository keeps finding in its own
instruments: the corpus scan reporting every target failed, the inventory
listing 270 rules as catching nothing, the API-surface table typed by hand. A
gate that cannot move is one step from a gate nobody reads.

## Constraints

- **No naming campaign.** 14,890 names written to clear a number would be
  written to clear a number, and would say nothing. The 47 blind spots found
  this quarter were found by probes, not by prose.
- **Per-rule, never a total.** The existing design is correct and stays.
- **Touch-based pressure only.** A rule nobody edits should not block anybody's
  unrelated work; the debt is not urgent enough to stop the queue.
- **Must not punish deletion.** Removing a bad case lowers the total and must
  never read as a regression.

## The mechanism this needs, and where it already exists

`rule-case-ledger.ts` has **no change detection** — it reads the whole suite
every run. So "pressure along the paths people touch" is not implementable in
it as written, which the first draft of this intent assumed without checking.

It does not need inventing. `scripts/rule-audit-gate.ts` already supports
`--changed`, resolving the staged diff to the rules whose findings it could
have moved, and the pre-commit hook already runs it that way. The design
borrows that resolver rather than writing a second one — a second
diff-to-rules mapping that could disagree with the first is the defect two
other intents here are already about.

## Success criteria

- **Now:** 14,890 undescribed · ratchet holds the line · 0 downward force.
- **Wanted:** a rule whose SOURCE changes must not leave its case descriptions
  where they were — the debt drains along the paths already being walked.
- **Breach:** an edit to a rule's source that leaves its undescribed count
  unchanged, where that count is above a floor.
- **Proven by:** editing a rule with undescribed cases fails; the same edit
  with a described case added passes; editing a rule already at zero passes
  untouched.
