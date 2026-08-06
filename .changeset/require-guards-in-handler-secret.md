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

Only equality against a secret *source* clears a route, and the name has to
look like a credential: `process.env.CRON_SECRET`, `config.get('API_TOKEN')`.
`process.env.NODE_ENV !== 'production'` is a feature flag and still reports —
otherwise a handler could switch its own access control off by inspecting its
environment. The comparison must also be in the handler itself, not inside a
callback it passes along.

Comparing already-trusted data (`req.user.role !== 'admin'`) is authorization,
not authentication, and still reports; so does reading config without comparing
it.
