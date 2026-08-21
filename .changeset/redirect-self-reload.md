---
'eslint-plugin-browser-security': patch
---

`no-insecure-redirects` no longer reports a page reloading itself.

```js
window.location.assign(window.location.href);
```

CWE-601 is redirection to an *untrusted site*. Navigating to the URL the
document is already on cannot move the user anywhere, so there is no site to be
untrusted and an attacker gains nothing they do not already have. Found on the
pinned corpus in okta-signin-widget, under a comment saying exactly what it is:
"Load the current page URI again to get a new state token".

`location.href` remains an untrusted read everywhere else — a URL carries
attacker-controlled query and hash — which is why the shape reached the report.
The exemption compares the printed receiver, so it holds only for the **same**
Location: `top.location.href` and `window.location.hash` both still report, and
both are pinned as FN guards alongside the canonical `?next=` open redirect.

Covers the assignment spelling too. Verified on the pinned corpus: this rule
drops from 1 finding to 0, total 41 → 40.
