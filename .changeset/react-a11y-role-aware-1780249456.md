---
"eslint-plugin-react-a11y": patch
---

fix: role-aware false-positive reduction in three Base UI / headless UI rules

click-events-have-key-events, interactive-supports-focus, and
no-static-element-interactions now recognize interactive ARIA roles
(button, link, menuitem, combobox, etc.) and skip reporting when an
element explicitly declares one. This eliminates false positives on
Base UI and other headless-component patterns where `<div role="button">`
is the correct composition technique.
