---
'eslint-plugin-react-features': patch
---

fix(react-features): no-unknown-property recognises Capture-phase event handlers

React gives every known event handler a capture-phase twin (`onFocus` → `onFocusCapture`, `onClick` → `onClickCapture`), but the rule's known-DOM-property list only had the bubble-phase name, so `onFocusCapture`/`onClickCapture` were reported as unknown. A `...Capture` suffix is now accepted whenever its bubble-phase base is a known handler; an unknown base (`onBogusHandlerCapture`) still reports.
