---
'eslint-plugin-node-security': patch
---

`no-arbitrary-file-access` now reports only paths it can attribute to a request,
instead of duplicating `detect-non-literal-fs-filename`.

The rule's message is *"File path from user input — path traversal
vulnerability"*. Its implementation flagged **any** unsanitized identifier, so
it said that about build scripts and config loaders where no request exists.
Two problems from one cause:

- **The message was untrue.** `fs.readFileSync(configPath)` in a rollup config
  has no user input to point at.
- **It duplicated `detect-non-literal-fs-filename` on 25 corpus sites** — the
  same line reported twice, at `error` and `warn`, for the same reason. A
  reader fixes it once and is told twice.

The two rules now partition, the same way `no-innerhtml` and its source-specific
sibling already do: this one reports what it can attribute, the generic one
reports the rest. Exactly one rule owns a site.

Attribution means a **function parameter** (untrusted by definition — the callee
cannot see what a caller passes) or a local traced to `req` / `request` /
`params` / `query` / `body`.

Measured on the 8-repo corpus: **32 findings → 3**. Nothing goes undetected —
`detect-non-literal-fs-filename` still reports every removed case at `warn`.

Also fixes a false negative found on the way: the direct-member check read only
the immediate object, so `fs.readFile(req.body.upload.path)` was missed. It now
walks the whole chain.
