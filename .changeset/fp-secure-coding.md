---
'eslint-plugin-secure-coding': patch
---

**🐛 Fix** — `no-unsafe-regex-construction` reported on dynamic flags alone

Found by running the rule against code written specifically to break it, and
pinned by a case that fails on the unfixed rule.

The rule reported when only the FLAGS were dynamic and the pattern was a
literal. Flags cannot introduce catastrophic backtracking on their own, so
that finding was never actionable.
