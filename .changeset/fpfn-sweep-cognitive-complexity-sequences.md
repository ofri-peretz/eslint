---
'eslint-plugin-maintainability': patch
---

fix: `cognitive-complexity` charges a homogeneous run of logical operators once, not once per operator. The docs' Complexity Factors table scores logical operators "+1 | `&&`, `||` (sequence breaks)" — a run costs one point and only a break in the run starts the next — but every `LogicalExpression` node was charged, so `a && b && c && d` cost 3 where the table says 1. That inflated every `&&`-heavy function against an unchanged Sonar-default threshold of 15. Mixed runs such as `a && b || c` still cost 2, as two sequences should.
