---
'eslint-plugin-react-features': patch
---

fix: `jsx-no-script-url` now catches control-character-obfuscated `javascript:` URLs

The scheme test was `/^\s*javascript:/i`, which only strips whitespace BEFORE the scheme. The URL spec has the parser remove leading C0 controls and space and then strip every ASCII tab, line feed and carriage return from anywhere in the input, so an `href` with a tab inside the scheme, or with a leading U+0001, both resolve to `javascript:alert(1)` — verified in Chrome and in Node's WHATWG `URL`, identical to the plain payload the rule already reported. A CVSS 9.5 / CWE-79 rule was silent on two live XSS payloads whose only difference from a reported one is invisible characters. The test is now React's own `sanitizeURL` pattern, which upstream `eslint-plugin-react` uses and which every message this rule emits already links readers to. No documented Correct example and no existing test changes behaviour.
