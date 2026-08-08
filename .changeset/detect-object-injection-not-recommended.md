---
'eslint-plugin-secure-coding': minor
---

Drop `detect-object-injection` from the `recommended` preset

Measured over `express` + `axios` + `sequelize`, the rule fired **535 times —
85% of everything `recommended` reported on those three repos** (632 total).
528 of the 535 had no taint indicator anywhere on the reported line:

```js
this.dataValues[updatedAtAttrName] = ...       // sequelize
where[field] = insertValues[field];            // sequelize
Axios.prototype[method] = generateHTTPMethod(); // axios
```

That is ordinary internal object manipulation, not attacker-controlled key
access. Without the rule, `recommended` reports 97 findings on the same corpus
instead of 632.

This is a design limit rather than a tuning gap. The rule reports every
computed key that fails to match one of its hand-maintained "safe" heuristics,
so on real code the default answer is "report". Inverting that — report only
when the key is reachable from a taint source — is dataflow analysis the rule
does not perform, and the rule's own fixtures contradict it (`obj[config.key]`
is asserted as a violation, which is exactly the axios false positive).

The rule is unchanged, still exported and still documented. Teams that want the
paranoid sweep can enable it explicitly and triage the output. It is no longer
handed to consumers as a default, because at this precision it does not protect
anyone — it teaches them to disable the plugin.

No rule behaviour changes; this only affects what `recommended` turns on.
