# `detect-non-literal-fs-filename` — TP / FP / FN map

Rule 2 of 10. Written BEFORE touching the rule, from the semantics of CWE-22,
and every claim below was executed in Node 24 rather than reasoned about.

---

## 0. What the weakness actually is, measured

Path traversal is reaching a file outside the intended directory. The intuitions
that matter are about `path`, and two of them are counterintuitive:

| expression | result | escapes? |
|---|---|---|
| `path.join('/safe', '../etc/passwd')` | `/etc/passwd` | **YES** |
| `path.join('/safe', 'a/../../etc/pw')` | `/etc/pw` | **YES** |
| `path.resolve('/safe', '../etc/passwd')` | `/etc/passwd` | **YES** |
| `path.normalize('/safe/../etc/passwd')` | `/etc/passwd` | **YES** — normalize is NOT a guard |
| `path.join('/safe', '/etc/passwd')` | `/safe/etc/passwd` | **no** |
| `path.resolve('/safe', '/etc/passwd')` | `/etc/passwd` | **YES** |

**`join` and `resolve` differ on an absolute second argument** — `join` treats it
as relative, `resolve` honours it and jumps to the filesystem root. A rule that
treats them as the same sink is wrong about one of them.

### Guards, measured

| guard | holds? |
|---|---|
| `path.basename(userInput)` | **YES** — `basename('../../etc/passwd')` is `passwd` |
| `path.resolve(base, p).startsWith(base + path.sep)` | **YES** |
| `path.resolve(base, p).startsWith(base)` | **NO** — `/safebad` starts with `/safe`. The classic prefix bug, and it is a TP, not an FP |
| `path.normalize(p)` alone | **NO** |
| allowlist membership on the filename | **YES** |

---

## 1. Baseline — the rule reports the LEAST evidence and misses the most

Measured against the current rule. It has **no `MemberExpression` case**:

| argument shape | reports? |
|---|---|
| `fs.readFileSync(p)` — bare unresolved identifier | **yes** |
| `fs.readFileSync(base + p)` | yes |
| `` fs.readFileSync(`/x/${p}`) `` | yes |
| `fs.readFileSync(path.join(d, p))` | yes |
| `fs.readFileSync(req.query.file)` | **NO** |
| `fs.readFileSync(process.argv[2])` | **NO** |
| `fs.readFileSync(o.p)` / `a.b.c` | **NO** |
| `fs.readFileSync(arr[0])` | **NO** |
| `fs.readFileSync(f())` | **NO** |

So the canonical CWE-22 — a request-derived path reaching `fs` — is invisible,
while a bare identifier the rule knows nothing about reports. That is the
evidence gradient inverted.

Scored on the 12-case matrix: **ours TP 0/6, FP 0/6** against
`eslint-plugin-security`'s **TP 6/6, FP 4/6**. Silence is not precision — a rule
that never fires has perfect precision and zero value.

`taintSources` also defaults to `['process']` only, which does not include any
request root.

---

## 2. TRUE POSITIVES — must detect

### A. Untrusted path reaching an `fs` sink

- **A1** direct: `fs.readFileSync(req.query.file)`, `req.body.path`, `req.params.p`
- ~~**A2** `process.argv[2]` / `process.env` used as a WHOLE path~~ — **NOT a
  finding, deliberately.** Whoever sets the environment or the argv of a process
  already chooses which files it opens, with or without this line; for a CLI,
  `readFile(argv[2])` IS the feature. Suppressed by `isWholeTaintValue`, a
  decision measured at 7% precision before it existed. **Composed** is different
  and still reports: `path.join(__dirname,'..',pkgFromArgv)` gives an argument a
  fixed prefix to escape.

  I listed this as a TP from CWE-22 reflex and the existing design was right.
  The distinction that matters is not "is it tainted" but **who controls it** —
  process-level input is already process-level trust; a request is not.
- **A3** through a binding hop: `const p = req.query.f; fs.readFile(p, cb)`
- **A4** composed: `` fs.readFileSync(`${UPLOADS}/${req.query.f}`) ``, `UPLOADS + req.query.f`
- **A5** `path.join(base, untrusted)` and `path.resolve(base, untrusted)` — both
  escape via `../`
- **A6** `path.normalize(untrusted)` — normalize is not a guard
- **A7** the **prefix-bug guard**: `resolve(base,p).startsWith(base)` without the
  separator. A guard that does not hold is a finding, not a suppression.
- **A8** the `fs/promises` API and `fs.promises.*`
- **A9** a function PARAMETER at a module boundary: `export function read(p) { fs.readFileSync(p) }`

### B. Sinks that must be covered

`readFile`, `readFileSync`, `writeFile`, `writeFileSync`, `appendFile`,
`createReadStream`, `createWriteStream`, `open`, `openSync`, `unlink`, `rm`,
`rmdir`, `mkdir`, `readdir`, `stat`, `lstat`, `copyFile`, `rename`, `truncate`,
`realpath`, `access`, plus the `fs/promises` and `fs.promises` spellings of each.

---

## 3. FALSE POSITIVES — must NOT report

- **C1** a literal path: `fs.readFileSync('./config.json')`
- **C2** a module constant: `const CONFIG = '/etc/app.json'`
- **C3** `path.join(__dirname, 'tpl.html')` / `import.meta.dirname` — anchored to
  the module's own location, no caller input
- **C4** `path.basename(untrusted)` — measured to strip traversal
- **C5** `path.resolve(base, p).startsWith(base + path.sep)` — the correct guard
- **C6** an allowlist checked before use
- **C7** a key from `Object.keys()` of a module-owned map
- **C8** a path built entirely from literals and constants
- **C9** test files
- **C10** `os.tmpdir()` + a generated name (`randomUUID`)

---

## 4. Test-plan rules carried from rule 1

1. Every TP fixture needs its FP twin — the same shape, guarded.
2. Every option needs a test that the option CHANGES the report count, across
   more than one shape. (`taintSources` defaults to `['process']`; verify what it
   actually governs before describing it.)
3. Name the edit that clears each finding. A rule the user cannot satisfy gets
   disabled, and a disabled rule has zero recall on everything else.
4. Verify semantics in `node -e` first — two of the six `path` claims above are
   the opposite of the obvious guess.
5. Measure real source, not just the corpus. `eslint-plugin-security`'s version of
   this rule is its **second loudest** (1,457 findings over 5 repos), so the
   precision half of this comparison is where the value is.
