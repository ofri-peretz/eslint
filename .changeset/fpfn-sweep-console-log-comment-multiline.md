---
'eslint-plugin-operability': patch
---

fix: `no-console-log` `strategy: 'comment'` autofix emitted source that does not parse

The fixer prefixed a `//` comment marker to the statement, but a `//` comment ends at the newline. Only the statement's first physical line was commented; the rest was left behind as loose source. With `fixable: 'code'` and `hasSuggestions: false`, this is applied unattended by `eslint --fix` — verified end-to-end through the `ESLint` class with `fix: true`, which wrote the broken file to disk.

The common case is not exotic. Prettier — this repo's own formatter — wraps any `console.log` wider than the print width across several lines, which is exactly the verbose debug logging this rule exists to find:

```ts
  console.log(
    'Processing incoming request',
    requestId,
    …
  );
```

became

```ts
  // console.log(
    'Processing incoming request',
    …
  );
```

→ `Parsing error: Expression expected.`

The fixer now comments every physical line the statement spans — split on every JavaScript line terminator (`\r\n`, `\n`, a lone `\r`, U+2028, U+2029), since a `//` comment ends at each of them — keeping the `//` marker after each line's own indentation, and declines (no rewrite, report unaffected) when non-whitespace follows the statement on its last line — `case 1: console.log(x); break;` and `if (r) { console.log(x); }` would otherwise lose the `break;` or the closing brace to the same comment.

The documented single-line shape `console.log("test");` → `// console.log("test");` is unchanged, as is the existing structural guard and the `remove`, `convert` and `warn` strategies.
