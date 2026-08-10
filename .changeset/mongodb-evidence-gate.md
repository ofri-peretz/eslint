---
'eslint-plugin-mongodb-security': major
---

Every rule now abstains in files without local MongoDB evidence

Measured over the corpus, **47% of everything this plugin reported (1,663 of
3,542 findings) was in a file with no Mongo import**. The plugin already
discriminated by *receiver* (`receiver.ts`), but that is a name heuristic:
`userModel.findOne()` reads identically in a TypeORM repository and a Mongoose
one. Grouping the off-SDK findings by repository, **73% sat in repositories with
zero MongoDB anywhere** — twentyhq, strapi and cal.com are TypeORM and Prisma.
The file-level question is the one the plugin could not ask.

**This gate is a union, unlike vercel-ai's, and the corpus is why.** An
import-only probe was right for the AI SDK because every no-import caller turned
out to be a different vendor. Here the opposite risk dominates: the idiomatic
Mongoose layout defines a model in one file and consumes it through a
**relative** import, so a service calling `User.findOne()` has no package
specifier to find.

Evidence accepted, each chosen by measurement:

- an import / `require` / dynamic `import()` / **`import x = require(...)`** of
  `mongodb`, `mongoose`, `@nestjs/mongoose`, `@typegoose/typegoose`, `bson`,
  `connect-mongo`, **or any `mongoose-*` / `*-mongoose` plugin**. The plugin
  ecosystem matters: of the twelve corpus files containing `new Schema(` that a
  four-package list placed "outside Mongo", **eleven were plugin consumers** —
  `mongoose-paginate`, `passport-local-mongoose`, `mongoose-lean-virtuals`.
- `new Schema(...)` / `new mongoose.Schema(...)`
- `.lean()` — Mongoose's own query modifier, with no analogue elsewhere
- `Types.ObjectId` and `new ObjectId(...)`
- a `mongodb://` or `mongodb+srv://` connection string, anywhere in a literal or
  template quasi

Two obvious candidates were **rejected on evidence**:

- `$set` / `$push` / `$inc` object keys look Mongo-specific and are not. `$push`
  is `react-addons-update`'s immutability helper, `$set` is jQuery UI, and
  `$addToSet` is Meteor's minimongo — all three appear in the corpus.
- a **bare** `ObjectId` identifier is a type name in unrelated libraries, so only
  the qualified and constructed forms count.

A locally bound `require` is not module loading, and shadowing is **lexical**
from the start — the file-wide flag that regressed express/postgres in #483 is
not repeated. The probe is cached per `Program`, so sixteen rules cost one AST
walk.

**Recall cost measured, not assumed.** Every finding over all 232 corpus files
carrying Mongo evidence, diffed before and after: **316 → 316**. The first run of
that diff lost six findings and **caught two real defects in this gate**, both
now fixed and locked: `import x = require('mongoose')` is a
`TSImportEqualsDeclaration` rather than a `require` call and was invisible (three
files, and DefinitelyTyped writes nearly every CommonJS test this way), and the
DSN test was anchored to the start of the string so
`'MONGODB_URL=mongodb://…'` did not count (two files).

The single remaining difference is `express-rest-boilerplate/src/index.js`,
where `mongoose` is a **relative** import of a local wrapper. The dropped report
was `require-auth-mechanism` on `mongoose.connect()` — a zero-argument call that
merely delegates. The genuine finding for that same defect is retained at the
real connect site, `src/config/mongoose.js:26`, where
`mongoose.connect(mongo.uri, {...})` specifies no auth mechanism. **Zero
actionable findings lost.**

That relative-wrapper shape is the gate's known false negative and it is
deliberate: resolving one hop across files would give every rule project state
that can go stale and a dependency on lint order, which no other probe in this
ecosystem has.

Locked by `src/module-gate.lock.test.ts` over the whole rule registry, with the
TypeORM / Prisma / `react-addons-update` / jQuery shapes as negatives and ten
positive controls — including the import-equals and unanchored-DSN cases the
recall diff uncovered — so the suite cannot pass with the gate shut.
