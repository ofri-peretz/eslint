---
'eslint-plugin-nestjs-security': patch
---

`require-guards` recognises an in-handler check against a configured secret

The sibling of the existing `@Headers('…secret')` webhook exemption, one step
further in: some handlers take the credential as a query or route parameter and
compare it against the environment themselves.

```ts
if (this.configService.get<string>('FEATURE_TOKEN') !== token) {
  return false;
}
```

That is amplication's `user.controller.ts:19`, reported as an unguarded route
while it authenticates on its first statement.

Only equality against a secret *source* — `process.env.X` or a `.get()` on a
config object — clears a route. Comparing already-trusted data
(`req.user.role !== 'admin'`) is authorization, not authentication, and still
reports; so does reading config without comparing it.
