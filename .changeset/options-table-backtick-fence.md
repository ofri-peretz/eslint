---
'eslint-plugin-secure-coding': patch
---

Fix the `dangerousChars` Options row, which rendered as truncated code

`no-improper-sanitization` documents `dangerousChars`, and that option's
default list contains a backtick among the characters it expects a sanitizer to handle. The
generated Options table wrapped the value in a single backtick, so CommonMark
closed the inline code span at the one inside the array and the rest of the row
rendered as unstyled plain text.

Code cells are now fenced with a run of backticks longer than any run inside
the value, padded with spaces so a leading or trailing backtick still belongs
to the value rather than to the fence.

Documentation only — no rule behaviour changed.
