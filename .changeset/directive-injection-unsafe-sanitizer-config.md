---
'eslint-plugin-secure-coding': minor
---

`no-directive-injection`: stop reporting correct DOMPurify calls, start
reporting the ones that disable sanitization.

The reported false positive does not reproduce —
`DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })` is not reported, and
the rule produces 0 findings for it across the 8-repo corpus. It is now locked
as a `valid` fixture, along with the spelled-out form and seven adjacent
shapes, so the recommended safe pattern can never regress into a finding again.

The issue's *other* acceptance criterion was failing, and that turned out to be
the real defect: a genuinely unsafe sanitizer config was silently accepted.

```js
DOMPurify.sanitize(html, { ADD_TAGS: ['script'] })   // was: no finding
DOMPurify.sanitize(html, { ADD_ATTR: ['onerror'] })  // was: no finding
```

Both hand back markup that executes, while still reading as sanitized at the
call site — the worst shape a security rule can miss, because the code looks
defended. `ADD_TAGS`/`ALLOWED_TAGS` naming `script`, `iframe`, `object`,
`embed` or `base`, and `ADD_ATTR`/`ALLOWED_ATTR` naming an `on*` handler,
`srcdoc`, `formaction` or `xlink:href`, now report under the new
`unsafeSanitizerConfig` message, which names the offending option and value.

The check is narrow by construction: the receiver's name must mention
"purify", the config must be an object literal, and the values must be literal
strings in an array. A `{ ALLOWED_TAGS }` shorthand referencing a constant
defined elsewhere is left alone — assuming the worst about an unreadable value
is what produced the original false positive.
