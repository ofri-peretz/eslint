---
---

Dependency bump only, plus the one app-side change it required.

`fumadocs-ui` 16.14.5 renders `<main>` from `layouts/docs/page/slots/container`
where 16.14.2 did not, so the docs layout's own `<main id="main-content">`
wrapper became a second landmark and failed the "exactly one `<main>`" check.
That wrapper is now a focusable `div`, matching every other route.

No rule behaviour changes, so there is nothing to release.
