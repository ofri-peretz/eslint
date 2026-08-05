---
'@interlace/eslint-devkit': minor
'eslint-plugin-prisma-security': minor
'eslint-plugin-drizzle-security': minor
'eslint-plugin-sequelize-security': minor
'eslint-plugin-typeorm-security': minor
'eslint-plugin-knex-security': minor
---

Add `no-mass-assignment` (CWE-915) to the five ORM plugins with object writes,
via a new shared `createMassAssignmentRule` factory.

```ts
await prisma.user.update({ where: { id }, data: req.body });
await User.create(req.body);
await db.insert(users).values({ ...req.body });
```

Each of those updates the fields the endpoint is about — and every other column
on the model: `role`, `isAdmin`, `ownerId`, `emailVerified`, `credits`. None of
them appear in the diff, which is why the shape survives review.

It also gets worse without anyone touching it: adding a sensitive column to a
model later silently widens every existing mass-assignment site. No line
changes, and the exposure is new.

Silent by design: a payload that names its fields (`{ name: req.body.name }`) is
the fix; an object that merely has a `body` key (`form.body`) is not a request;
`ctx.data` is ordinary application state in several frameworks; and a value the
rule cannot see through is not guessed at.

No options, deliberately. An allowlist would let a project re-approve the
dangerous shape wholesale, one config file further from the call site.

mysql2 and better-sqlite3 do not carry this rule — their writes are raw SQL
strings, already covered by `no-unsafe-query`.
