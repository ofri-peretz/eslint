---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `no-missing-error-context` accepts a custom `*Error` argument and a re-throw

```ts
class UsageError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}
throw new UsageError(msg, 'pass --x'); // reported: "missing message"
try {
  run();
} catch (err) {
  throw err;
} // reported: "missing message"
```

A class whose name ends in `Error` builds its own message from whatever it is given, so the argument is the context; a re-thrown identifier already carries the message and stack it was thrown with. `eslint-plugin-reliability`'s copy of this rule has accepted both for some time and this one had not — the two had drifted. The arms are now identical in both, and the same test cases sit in both files. `throw new Error(someVar)` and `throw undefined` still report.
