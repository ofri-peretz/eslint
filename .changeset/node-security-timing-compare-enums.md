---
'eslint-plugin-node-security': patch
'@interlace/eslint-devkit': patch
---

fix(node-security): `no-timing-unsafe-compare` no longer reports a comparison against an enum member, a `as const` property or a literal-union value

The rule matched the enum MEMBER's spelling: `event !== InteractionEvent.ForgotPassword` (Logto, 27 of 29 reports) and `event.type === WebhookEvents.SecretModified` (Infisical, 18) were reported because `Password` and `Secret` are secret words. An enum member is a value its declaration writes out, so it is a constant like a string literal. The rule now reads the enum where it is declared, in the same file or in a module imported by a relative path, and stays silent when the member's value is written out. A member computed by a call, an enum from a package or a path alias, and a class static or plain object that only looks like an enum still report.

Also silent: a property of an object the file declares `as const`, a name annotated with a literal union or an enum (`expected: 'access' | 'refresh'`), and an `If-None-Match` compared with an entity tag cut to a prefix of a content digest (`.digest('hex').slice(0, 32)`, Langfuse). A cut of a keyed digest (`createHmac`) still reports.

`@interlace/eslint-devkit` exports `valueFollow.enumMember`, which `sql-safety` already used privately.
