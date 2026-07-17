---
'eslint-plugin-conventions': minor
---

`conventions/utm-taxonomy`: align the taxonomy with the live attribution
system — add `devto` to `utm_source` and `article` to `utm_medium`, and drop
the never-shipped `dev_to` spelling.

The blog's `/go/` redirect handler routes by
`article_platforms.platform === utm_source`, and those platform rows are
stored as `'devto'` — the un-underscored form is load-bearing and cannot
change. Every hand-written article link and the Dev.to publisher transform
already emit `utm_source=devto&utm_medium=article`; the taxonomy's `dev_to`
was the outlier. No real link ever carried `dev_to`, so removing it turns
the rule into a typo guard instead of a cohort-splitter. Runtime consumers
(visitor-profile inference) still accept `dev_to` on inbound URLs for
historical links.
