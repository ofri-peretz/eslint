---
'eslint-plugin-react-a11y': minor
'@interlace/eslint-devkit': minor
---

Accessibility rules cite WCAG, not CWE.

Every rule in this plugin declared `cwe: 'CWE-252'`. CWE-252 is "Unchecked
Return Value" — a security weakness about ignoring what a function returns.
It has nothing to do with a missing `alt` attribute, and CWE has no
accessibility entries at all, because it is a taxonomy of *security*
weaknesses.

The claim was not cosmetic. `formatLLMMessage` enriches from the CWE, so a
developer with an image missing alt text was shown:

```
♿ CWE-252 OWASP:A10-Mishandling CVSS:5.3 | Image missing alt text | CRITICAL
```

Four assertions, all false, and two of them contradicting each other in the
same line — CVSS 5.3 is the MEDIUM band while the label reads CRITICAL. A
third disagreed with `meta.docs.cvss`, which said 9.5. That string reaches the
docs site, SARIF output and any consumer's security dashboard.

Now:

```
♿ WCAG 1.1.1 | Image missing alt text | HIGH
```

Each rule's criterion comes from that rule's own `docs/rules/*.md`, which
named the right standard the whole time — the machine-readable metadata simply
disagreed with the prose beside it. A lock now keeps the two in step, in both
directions.

`CRITICAL` is gone from this plugin. It belongs to the security severity
vocabulary, where it means stop shipping; a WCAG Level A failure is serious and
`HIGH` says so without borrowing a word that means something else.

`@interlace/eslint-devkit` gains `wcag` on `meta.docs` and on the message
options, rendered in the standards prefix where CWE would go. No behaviour
changes for rules that do not set it.
