---
'eslint-plugin-browser-security': patch
---

fix: `no-clickjacking` treated the header NAME as frame protection, so `ALLOWALL` silenced it

`declaresFrameProtection` ended in `|| text.includes('x-frame-options')`, which accepted any string merely _containing_ the header name as proof the page was protected. `X-Frame-Options: ALLOWALL` and the obsolete `ALLOW-FROM` therefore silenced the rule, as did prose that happened to mention the header. This fails open on exactly the CWE-1021 shape the rule exists to catch, and it contradicted the rule's own treatment of the CSP twin: `frame-ancestors *` is already rejected two lines above. A CSP is data, so the directive is the evidence — the same reasoning applies to `X-Frame-Options`, where only `DENY` or `SAMEORIGIN` is protection. The name check is removed; the value checks are unchanged.
