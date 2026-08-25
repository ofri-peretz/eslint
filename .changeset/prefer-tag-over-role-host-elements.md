---
'eslint-plugin-react-a11y': minor
---

fix: `prefer-tag-over-role` stops reporting on `<svg role="img">` and on components

A census of all 31 findings on the pinned corpus found **31 false positives**
and no true ones.

**23 were `<svg role="img">`** — the recommended pattern, not a violation. An
inline SVG needs an explicit `role="img"` and an accessible name for assistive
technology to announce it as a single graphic rather than walking its shapes,
and it cannot become `<img>` without moving to an external file and giving up
`currentColor`, styling and animation.

**8 were custom components** — MUI `<Box>`, `<MuiLink>`, `<LinkMui>`. The rule
cannot know what DOM element a component renders; in MUI that intent is
expressed as `component="img"`, which is invisible here. Advising `<img>`
instead of someone's component is advice about a name, not about the DOM that
ships.

The rule keeps its actual job: `<div role="img">` and `<span role="link">`
still report, and the svg exemption is specific to `role="img"` —
`<svg role="link">` still reports.
