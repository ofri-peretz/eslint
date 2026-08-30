---
---

feat(release): CS009 catches a changeset that would mis-scope its own release notes

Changesets applies a changeset's body verbatim to every package it lists. A
changeset covering `eslint-plugin-jwt-security` and `eslint-plugin-node-security`
whose body describes rules from both therefore writes both paragraphs into both
CHANGELOGs, and each package's published release notes claim rules it does not
own.

That shipped. It reached a Version PR and was caught in review, not by tooling —
`lint-changesets` (CS001–CS008) and `verify-release-notes` (RN001–RN006) both
passed it, because neither can express "this entry names another package's
rules".

CS009 closes it at the only point where the fix is cheap: before the body is
copied anywhere. It builds rule ownership from the `packages/` tree rather than
a hand-kept list, drops the 14 rule names carried by more than one plugin (they
identify nothing), and reports only when a multi-package changeset names rules
owned by two or more of the packages it lists.

Deliberately quiet in the cases that are fine: a multi-package changeset naming
no rules, one naming rules from only a single listed package, a single-package
changeset naming anything at all, and rule names appearing as prose rather than
in backticks.
