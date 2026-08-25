---
'eslint-plugin-react-features': minor
---

fix: `no-unknown-property` stops reporting on custom elements and `xmlns`

A census of all 65 findings on the pinned corpus found **65 false positives** in
two classes.

**Custom elements.** The rule skipped custom *components* by their capital
letter, but a web component is lowercase — `<altcha-widget>` — so it looked
like a host element and every one of its attributes was reported. React passes
attributes to custom elements through verbatim, and the HTML spec requires a
hyphen in the name, which is the signal that was missing.

**XML namespace attributes.** `xmlns` and `xmlnsXlink` on `<svg>` are valid
React attributes and are emitted by every icon exporter.

The message also read *"Unknown DOM property detected"* without naming the
property, which is unactionable even when the finding is right. It now reads
``` `flooble` is not a DOM property of `<div>` ```.

The rule keeps its job: `class` instead of `className`, and unknown attributes
on ordinary tags, still report.
