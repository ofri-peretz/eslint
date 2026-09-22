---
'eslint-plugin-secure-coding': patch
---

docs: `no-unchecked-loop-condition` no longer promises a report it cannot make

The rule's "❌ Incorrect" block listed a linked-list walk (`while (node) { node =
node.next }`) as detected. Three of that block's four entries do report; this one
never did, and should not: termination depends on the data being acyclic, which
is not a syntactic property. The identical shape is correct in an AST parent
walk, a scope-chain walk and a queue drain — including several inside this
plugin's own rules. The syntactic approximation was implemented and measured
across this repository's 740 rule sources: one report, zero true positives.

The example moves to "Known False Negatives" alongside the find-up-without-a-
root-guard shape, and the three inherited boilerplate entries there — which
described call sinks rather than loops — are replaced with this rule's real
ceiling. No behaviour change.
