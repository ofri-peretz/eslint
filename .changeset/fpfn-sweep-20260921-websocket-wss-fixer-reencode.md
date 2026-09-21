---
'eslint-plugin-browser-security': patch
---

fix: `require-websocket-wss` autofix corrupted URLs containing a quote, newline or backslash

The fixer spliced the string literal's **decoded** `.value` between hardcoded single quotes. That re-encodes the string, and three legal URLs came back wrong:

```js
new WebSocket("ws://h/room's"); // -> 'wss://h/room's'  SyntaxError
new WebSocket('ws://h/a\nb'); // -> a real newline    SyntaxError, unterminated
new WebSocket('ws://h/a\\b'); // -> 'wss://h/a\b'     parses, URL SILENTLY changed
```

An apostrophe is an RFC 3986 sub-delim, so the first is an ordinary URL. The third is the one with teeth: it parses, so nothing surfaces — a security rule quietly retargets the connection it claims to have secured.

This is the only `fixable` rule in the plugin, so `--fix` applies it unreviewed, and the same broken text was offered as an editor suggestion.

The fix rewrites the scheme inside the literal's **original source text** — the technique this rule's own `TemplateLiteral` branch already used, and the one `QUALITY_STANDARDS.md`'s ✅ example demonstrates. A grep for the naive `` `'${value}'` `` pattern now returns nothing in the monorepo: sibling rules in `conventions` and `express-security` hit this exact class and fixed it already, and their comments name all three failure modes.

Two consequential details:

- **Quote style is now preserved.** One pre-existing test asserted that the fix rewrote double quotes to single. That requoting was the _mechanism_ of the corruption, not a feature — quote style belongs to `quotes`/Prettier, not to a CWE-319 transport rule. That assertion is corrected; it was the only test affected.
- **An escaped scheme (`'\x77s://h'`) reports with no fix.** It decodes to `ws://` but is not spelled that way in source, so a source-text rewrite cannot find it. The URL is still cleartext, so it must still report — but offering a fix that changes nothing is the failure this rule's own header criticises.

Four fixtures failed before the fix and pass after; two of them failed with RuleTester's own `A fatal parsing error occurred in autofix`.
