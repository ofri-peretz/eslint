# Audit Patterns — what to look for, what's easy to miss

> Generated 2026-05-09. Source: the eight stress-test / observability tools landed in iter-2026-05-09 (`ilb:stress-test`, `ilb:stress-test-docs`, `ilb:autofix`, `ilb:doc-test-alignment`, `ilb:severity-audit`, `ilb:corpus-integrity`, `ilb:fixture-coverage`, `ilb:regression`).
>
> Two audiences:
>
> 1. **Anyone fixing rules** — a checklist of FP / FN classes that recur across the fleet, with the AST shape that detects each.
> 2. **Anyone auditing rules without our tooling** (a human, an LLM, a one-off review) — the blind spots that hand-review consistently misses, and which checks close them.

---

## 1. Parse-error patterns in rule docs

The doc-harvest harness ([`scripts/ilb-stress-test-docs.ts`](../scripts/ilb-stress-test-docs.ts)) reduced parse errors from **70 → 9** by handling these classes. Listed in order of frequency observed across our 394-rule corpus.

### 1.1. Mixed-language blocks tagged as `javascript`

```javascript
// Loading resources over HTTP
const imageUrl = 'http://example.com/logo.png';
<script src="http://example.com/tracking.js"></script>;   // ← HTML embedded in JS
fetch('http://api.example.com/users');
```

**Cause.** Doc author wants to demonstrate a mixed-context vuln (HTML and JS in the same example) but tags the block as `javascript`. The bare `<script>` element is parsed as a JSX expression statement, which fails without `jsx: true`.

**Recovery.** Parser fallback chain: try `js` → `js+jsx` → `ts+jsx`. Once JSX is enabled the snippet parses. **Recovery rate: ~30 of 70.**

### 1.2. Multiple top-level adjacent JSX elements

```jsx
<input type="checkbox" checked={isChecked} />
<input type="text" value={name} />
```

**Cause.** Doc shows two related examples in one block. JSX requires a single root expression, so two adjacent elements don't parse.

**Recovery.** When bare-parse fails, retry with `<>${code}</>` (fragment wrapper) and `function _doc() { return (<>${code}</>); }` (function-body wrapper). The wrappers preserve AST shape so rule visitors still see the original elements. **Recovery rate: ~25 of 70.**

### 1.3. Ellipsis as a content placeholder

```javascript
crypto.pbkdf2(password, salt, 100000, 64, 'sha1', (err, key) => { ... });
```

**Cause.** The doc uses `{ ... }` to mean "elided body" — common in code-style writing but not valid JavaScript. The `...` token is only legal as a spread / rest operator.

**Recovery.** Pre-process: replace `\{[\s]*\.\.\.[\s]*\}` with `{}` before parsing. Real spread (`{...obj}`, `[...arr]`, `(...args)`) is unaffected. **Recovery rate: ~10 of 70.**

### 1.4. Diagrams / configs embedded under `### ❌ Incorrect`

```mermaid
flowchart TD
  A --> B
```

```json
{
  "dependencies": { "lodash": "^4.0.0" }
}
```

**Cause.** Some rules show a Mermaid flowchart of "what bad code looks like" or a JSON config example. The fence is captured by the harness but it's not lintable JS.

**Recovery.** Skip-list of language tags that aren't JS: `mermaid`, `json`, `bash`, `sh`, `shell`, `html`, `xml`, `text`, `markdown`, `sql`, `graphql`, `yaml`, `diff`, `css`. **Recovery rate: ~5 of 70.**

### 1.5. The 9 residuals (genuinely under-specified snippets)

Snippets that need their authors to add context — typically TS/TSX with undeclared types or imports. These are doc-fix items, not harness limitations:

| Rule | Issue |
| :--- | :--- |
| `browser-security/no-unvalidated-deeplinks` | TS block uses an undeclared interface |
| `conventions/prefer-dependency-version-strategy` | JS block contains shell + `package.json` mixed |
| `lambda-security/no-exposed-error-details` | TS block references `Lambda` / `APIGatewayProxyEvent` types |
| `operability/require-data-minimization` | TS block uses generic types without bounds |
| `react-features/{no-invalid-html-attribute, no-unescaped-entities, no-unknown-property}` | TSX with custom JSX namespace |
| `secure-coding/no-directive-injection` | TS block uses ambient module declarations |

---

## 2. False-positive patterns (rule fires when it shouldn't)

These appeared in 45+ of our rules across the audit. Each has a known mitigation pattern that a rule author can apply.

### 2.1. AST-walker / codemod context

```javascript
import * as t from '@babel/types';
function visit(node) {
  return node.type === 'Identifier' ? node[node.name] : null;
}
```

**FP class.** Rules that flag dynamic property access (`detect-object-injection`), insecure comparison (`no-insecure-comparison`), GraphQL injection (`no-graphql-injection`) misclassify codemod / AST-walker code. The AST library author isn't comparing user input — they're traversing a syntax tree.

**Detection mitigation (already deployed in audit iter-2 for `no-insecure-comparison`).**

```typescript
function isInCodemodContext(context): boolean {
  const imports = context.getSourceCode().ast.body.filter((n) => n.type === 'ImportDeclaration');
  return imports.some((i) =>
    /^(@babel\/types|@babel\/traverse|recast|jscodeshift|eslint|estree-walker|ast-types|esrap)$/.test(
      String((i as any).source.value),
    ),
  );
}
```

Apply at the top of every visitor. **Closes:** `detect-object-injection`, `no-insecure-comparison`, `no-graphql-injection` in AST contexts.

### 2.2. Validated input (allowlist / regex / type guard)

```javascript
const ALLOWED = ['config.json', 'readme.txt'];
if (!ALLOWED.includes(name)) throw new Error('bad');
fs.readFileSync(path.join('./conf', name));    // safe: validated above
```

**FP class.** Path-traversal, command-injection, NoSQL-injection rules flag the call site without checking for a preceding allowlist / regex / type-guard validation.

**Mitigation pattern (already deployed in audit iter-1 for fs / path rules).**

```typescript
function hasPriorValidation(node, varName, context): boolean {
  const scope = context.getScope();
  // Walk ancestors looking for: if (ALLOWED.includes(varName)) ... call
  // Walk for: if (REGEX.test(varName)) ... call
  // Walk for: typeof varName === 'string' && pattern test
  // ...
}
```

**Closes:** `detect-non-literal-fs-filename`, `detect-child-process`, `no-zip-slip`, `no-arbitrary-file-access`.

### 2.3. Literal-argument rules misfiring on literals

```javascript
const re = new RegExp('^[a-z]+$');           // literal — safe
const cmd = exec('git status');              // literal — safe
xpath.evaluate(doc, '/users/user[@id="1"]'); // literal — safe
```

**FP class.** Rules like `detect-non-literal-regexp`, `no-xpath-injection`, `no-xxe-injection` flag *any* call regardless of whether the argument is a literal string or constructed dynamically.

**Mitigation pattern.**

```typescript
function isLiteralOrConstantArg(arg, context): boolean {
  if (arg.type === 'Literal') return true;
  if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) return true;
  if (arg.type === 'Identifier') {
    const def = context.getScope().resolve(arg)?.defs[0];
    if (def?.type === 'Variable' && def.parent?.kind === 'const') {
      return isLiteralOrConstantArg(def.node.init, context);
    }
  }
  return false;
}
```

**Closes:** the four-rule cluster in §2.3 of the FP_FN tracker (`no-xxe-injection`, `no-xpath-injection`, `no-unsafe-regex-construction`, `detect-non-literal-regexp`) plus `no-format-string-injection`, `no-ldap-injection`. **One shared helper closes ~6 FPs.**

### 2.4. Framework-context misclassification (Lambda vs Express)

```javascript
function handler(req, res) {
  const auth = req.headers.authorization;   // Express, not Lambda
  res.send(`Hello ${req.params.name}`);
}
```

**FP class.** `lambda-security/*` rules fire on Express handlers because both shapes touch a `req.headers` / `req.body` object.

**Mitigation pattern (already deployed in audit iter-1 — the gate is too loose still).**

```typescript
function isLambdaHandler(node, context): boolean {
  // Strict: function takes (event, context) AND
  //         file imports 'aws-lambda' types OR
  //         file exports `handler`
  const params = node.params;
  if (params.length < 2) return false;
  const [event, ctx] = params;
  if (event.name !== 'event' || ctx.name !== 'context') return false;
  const imports = context.getSourceCode().ast.body.filter((n) => n.type === 'ImportDeclaration');
  return imports.some((i) =>
    String((i as any).source.value).startsWith('aws-lambda'),
  );
}
```

The current audit-iter-1 gate is `params[0].name === 'event'` only — too loose, fires on `function handler(event, ...)` in Express too. **Tighten to require both name match AND `aws-lambda` import.**

### 2.5. Variable-name pattern misclassification (label vs credential)

```javascript
const labels = { password: 'Enter your password', email: 'Email address' };
element.setAttribute('type', 'password');
```

**FP class.** Hardcoded-credential / sensitive-data rules trigger on any string with the word `password` / `secret` / `token` / `key` regardless of what role it plays.

**Mitigation pattern (already deployed in audit iter-2 for `no-hardcoded-credentials`).**

```typescript
function isUiLabelContext(node): boolean {
  // Property key 'label' / 'name' / 'placeholder' / 'description'
  // Assignment target .label / .name / .type
  // setAttribute('type', 'password') / setAttribute('name', 'password')
  // i18n: t('password') / intl.formatMessage({id: 'password'})
}
```

### 2.6. Non-credential-bearing template literals

```javascript
console.log(`User logged in: ${username}`);             // logging template
const url = new URL(target, `https://${req.headers.host}`);   // URL template
```

**FP class.** Rules detecting unsafe interpolation flag every template literal that contains a variable, regardless of the surrounding context.

**Mitigation pattern.** Inspect the call expression containing the template:
- `console.log(...)` / `logger.info(...)` / `winston.log(...)` → logging context, skip.
- `new URL(...)` / `URL.parse(...)` → URL context, skip if scheme literal is safe.
- Template starts with `https://` / `http://` / known URL scheme → URL context.

### 2.7. Numeric-key bracket access

```javascript
for (let i = 0; i < arr.length; i++) {
  arr[i] = transform(arr[i]);
}
```

**FP class.** `detect-object-injection` flags every bracket access. Numeric loop counters can't pollute Object prototypes (only string keys can).

**Mitigation pattern (already deployed in audit iter-1 — partial).** Detect:
- Numeric literal: `obj[0]`
- Unary plus / parseInt / Number(): `obj[+i]`
- Identifier resolved to a `for`-loop counter: `for (let i...) obj[i]`
- Typed-array indexing: object resolves to `Float32Array` / `Uint8Array` / `Int32Array` etc.

### 2.8. Test files / fixtures

**FP class.** Rules fire on test fixtures (`*.test.*`, `*.spec.*`, `__tests__/`, `__fixtures__/`, `corpus/`) where deliberately-bad code is the point.

**Mitigation pattern.** Standard skip in the rule's metadata or via a project-wide `eslint.config.js` override:

```javascript
{
  files: ['**/__tests__/**', '**/*.test.{js,ts,tsx}', '**/__fixtures__/**'],
  rules: { /* selectively disable noisy rules */ },
}
```

But for rules that should still apply in tests (e.g. fixed-credentials in test files matter for environments), do this in the rule itself.

---

## 3. False-negative patterns (rule silent when it should fire)

The 23 FN findings from the doc harvest plus the 8 from the hand-curated stress test cluster into these classes.

### 3.1. Sibling-sink misses

```javascript
el.innerHTML = userInput;                   // ✓ caught by no-innerhtml
el.insertAdjacentHTML('beforeend', input);  // ✗ same XSS class, missed
el.outerHTML = userInput;                   // ✗ same XSS class, missed
document.write(userInput);                  // ✗ same XSS class, missed
```

**FN class.** Rule lists ONE sink (e.g. `innerHTML`) but misses semantically equivalent sinks.

**Audit checklist (per CWE class):**
- **DOM XSS:** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `document.writeln`, `eval`, `Function()`, `setTimeout(string)`, `setInterval(string)`.
- **SQL injection:** string concat in `.query()`, template literal in `.query()`, sub-`raw`/`literal` constructors, ORM `where: '...'`.
- **Command injection:** `exec`, `execSync`, `execFile`, `spawn` with `shell: true`, `child_process` via dynamic require.
- **Path traversal:** `fs.readFile*`, `fs.writeFile*`, `fs.createReadStream*`, `path.resolve`, `path.join` with user input.
- **Prototype pollution:** `obj[key] = value`, `Object.assign(obj, untrusted)`, `{ ...untrusted }` in merge, `_.merge`, `Object.setPrototypeOf`.

### 3.2. Indirection through one level of variable

```javascript
const SECRET = 'super-secret-key-12345';   // hardcoded
jwt.sign({}, SECRET, opts);                // ← rule misses; only matches inline literal
```

**FN class.** Rules pattern-match the literal in the call expression but don't follow `const X = literal` declarations one frame up.

**Mitigation pattern.**

```typescript
function resolveLiteralValue(node, context): string | null {
  if (node.type === 'Literal') return String(node.value);
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === 'Identifier') {
    const ref = context.getScope().references.find((r) => r.identifier === node);
    const def = ref?.resolved?.defs[0];
    if (def?.type === 'Variable' && def.parent?.kind === 'const') {
      return resolveLiteralValue(def.node.init, context);
    }
  }
  return null;
}
```

### 3.3. Indirect access via bracket notation

```javascript
window['eval'](code);              // bypasses no-eval (which matches Identifier 'eval')
globalThis['Function'](code);      // same class
self['eval'](code);
```

**FN class.** Rules match `Identifier{name: 'eval'}` but don't match `MemberExpression{property: Literal{value: 'eval'}}`.

**Mitigation pattern.** Add a sibling visitor:

```typescript
'MemberExpression[computed=true]': (node) => {
  if (node.property.type === 'Literal' && BLOCKLIST.has(node.property.value)) {
    if (isGlobalObject(node.object)) report(node);
  }
}
```

### 3.4. Equivalent constructor / merger patterns

```javascript
obj[key] = value;                       // ✓ caught by detect-object-injection
Object.assign(obj, untrustedSource);    // ✗ same prototype-pollution class, missed
const merged = { ...untrustedSource };   // ✗ same class, missed
_.merge(obj, untrustedSource);           // ✗ same class, missed
```

**FN class.** Rule matches one syntactic shape but misses functionally equivalent shapes.

**Mitigation pattern (per rule class):** maintain a list of "equivalent operations" and check each. The list per CWE class is in §3.1 above.

### 3.5. Runtime-built patterns

```javascript
function buildRegex(pattern) {
  return new RegExp(`^(${pattern}+)+$`);  // catastrophic backtracking, missed by no-redos-vulnerable-regex
}

function buildQuery(table) {
  return `SELECT * FROM ${table} WHERE id = ?`;  // missed by no-unsafe-query (no concat detected)
}
```

**FN class.** The dangerous shape is constructed at runtime via `new RegExp(template)` / template literal, so static pattern matching against the literal source misses it.

**Mitigation pattern.** When the argument is a `TemplateLiteral` or a function-derived string, **flag with lower confidence** rather than skip. Pair with a comment-based escape hatch (`// eslint-safe-runtime`) for known-good cases.

### 3.6. Taint-source breadth (cookies / params / headers)

```javascript
JSON.parse(req.cookies.session);  // ✗ missed if rule only matches req.body
JSON.parse(req.query.config);      // ✗ same
JSON.parse(req.headers['x-config']); // ✗ same
```

**FN class.** Rules tracking user-controlled input only check `req.body.*` and miss other Express taint sources.

**Mitigation pattern.**

```typescript
const TAINT_PATHS = ['body', 'query', 'params', 'cookies', 'headers'];
function isTainted(node): boolean {
  // node is a member expression — walk left to find req.* path
  let cur = node;
  while (cur?.type === 'MemberExpression') cur = cur.object;
  if (cur?.name !== 'req') return false;
  // Now walk right to find which sub-path
  // Match req.<TAINT_PATHS>.* → tainted
}
```

Same applies for: `event.body` / `event.queryStringParameters` / `event.headers` (Lambda), `ctx.request.*` (Koa / NestJS), `request.*` (Hono / Hapi).

### 3.7. Array-element walks

```javascript
const tokens = ['Bearer sk_live_realsecret_456', 'Cookie sid=abc'];
fetch('/api', { headers: { Authorization: tokens[0] } });
```

**FN class.** Hardcoded-credential rules scan `Literal` / `TemplateLiteral` nodes but don't walk into `ArrayExpression` elements.

**Mitigation pattern.** Visit `ArrayExpression` and recurse over `elements`.

### 3.8. Verify-then-trust mismatch

```javascript
const decoded = jwt.decode(token);   // no signature check at all
return decoded.userId;               // trusted as if verified
```

**FN class.** Rule checks for `jwt.verify` with `algorithms: ['none']` but misses the more common variant: `jwt.decode()` followed by trusting the decoded payload.

**Mitigation pattern.** Two-pass: track every `decode()` call's return value, then check whether the same identifier is dereferenced (e.g. `.userId`, `.role`) without a `verify()` call sandwiched in between.

---

## 4. Blind spots in human / LLM hand-review (Claude included)

This is the section a reviewer should keep open while auditing rules without our automated tooling. Each item is a class of mistake **I (Claude / general LLM-led review) consistently make** unless something forces me to check.

### 4.1. I trust the doc's "## ❌ Incorrect" example as the rule's contract

**The mistake.** When asked "does this rule work correctly?", I read the doc, see a matching ❌ example, and assume the rule fires on it. I rarely actually run the rule against the example.

**What forces the check.** `npm run ilb:stress-test-docs`. The harness lints every doc snippet against the rule it documents — surfaces any rule whose documentation contradicts its implementation.

**How frequent.** This single check found **23 FN findings** the audit had missed.

### 4.2. I match by AST shape, not by semantic equivalence

**The mistake.** When designing a rule, I match `MemberExpression { property: { name: 'eval' } }` and call it done. I don't ask "is there any other JS expression that achieves the same effect as `eval`?"

**What forces the check.** A rule's per-CWE sink list (§3.1 above). Whenever I name a sink, I should consult the list — `eval` is in the same equivalence class as `Function()`, `window['eval']`, `setTimeout(string)`, `vm.runInNewContext`, and so on.

**How frequent.** **5 of the 8 hand-curated stress-test FN findings** were missed sinks within an equivalence class the rule already partially covered.

### 4.3. I treat parser failures as "the snippet is malformed"

**The mistake.** When ESLint refuses to parse a doc snippet, I assume the snippet is bad — not the parser.

**What forces the check.** The parser-fallback chain (§1.1–1.3 above). 87% of the parse errors I flagged in the morning run were actually fixable by the harness, not by the doc.

### 4.4. I assume rule docs are complete and load-clean

**The mistake.** When a plugin has 30 rule docs, I assume the plugin exposes 30 rules.

**What forces the check.** `npm run ilb:doc-test-alignment` and the `rule-not-registered` classification in `ilb:stress-test-docs`. **11 rules** in our codebase have docs but aren't wired into the plugin's exports.

### 4.5. I conflate `error` and `warn` severity with security/quality split

**The mistake.** I assume "security rule = `error`, quality rule = `warn`". Reality: severity is a precision contract (the README §1 policy) — security rules with low Wild precision must ship as `warn`, not `error`, to avoid training devs to ignore CI.

**What forces the check.** `npm run ilb:severity-audit`. **6 of our `error`-level rules** fire predominantly on adversarial Edge code, violating the `error ≥ 95%` precision floor.

### 4.6. I trust auto-fix correctness if the rule has a fixer

**The mistake.** A rule's `meta.fixable: 'code'` means "the rule has a fixer." It doesn't mean the fixer was tested.

**What forces the check.** `npm run ilb:autofix`. **47 of 53 fixable rules** in our codebase ship without a single test verifying the fixer's output.

### 4.7. I assume the corpus is stable across runs

**The mistake.** When ILB-Wild prints "3.48 findings/kLoC", I assume those findings are reproducible. Reality: 20 of 22 repos used to track mutable branches (`main`, `master`).

**What forces the check.** `npm run ilb:corpus-integrity`. After pinning all 22 repos to SHAs, the bench is now reproducible to the commit.

### 4.8. I conflate "Wild firings" with "rule has fixture coverage"

**The mistake.** "Rule X fires 200 times on Wild" sounds like signal. Without fixture coverage, it's unmeasured noise — we have no precision/recall data on it.

**What forces the check.** Per-rule observability section in `scorecard.md`. **3 rules** in our codebase fire 50+ times on real OSS but have zero Arena/Juliet fixtures (`no-unchecked-loop-condition`, `no-buffer-overread`, `no-graphql-injection` at certain thresholds).

### 4.9. I judge a rule against my hypothesis instead of its source

**The mistake.** When asked "does `detect-object-injection` over-fire?", I imagine what it might do, not what it does. The implementation is the only authority on the implementation.

**What forces the check.** Read the rule's source before suggesting a fix. The hand-curated stress-test cases ([`scripts/ilb-stress-test.ts`](../scripts/ilb-stress-test.ts)) include hypothesis fields drawn from reading the source — that's why the disagreements are actionable.

### 4.10. I assume single-version ESLint behaviour

**The mistake.** A rule that passes on ESLint 9.39 may FN on 10.x because of upstream AST shape changes. Without a matrix run, the regression is silent.

**What forces the check.** `.github/workflows/eslint-version-matrix.yml` — Node 22/24 × ESLint 8.x / 9.x / 9.39 / 10.x × Arena+Juliet, nightly + PR.

### 4.11. I don't validate corpus labels are themselves correct

**The mistake.** I run a bench, see F1 100%, and call victory. I never ask "are the fixture labels right?"

**What forces the check.** `npm run ilb:coverage` — Cohen's κ vs each competitor + over-fit detector (lists fixtures only Interlace catches → flag for human triage). Today our Juliet over-fit list has 7 entries; ILB-Arena has zero.

### 4.12. I don't track findings over time

**The mistake.** A scorecard dated 2026-05-03 is a snapshot. A regression yesterday is invisible if today's score is the same as last week's.

**What forces the check.** `benchmark-results/history.ndjson` (append-only) plus the Trend column in the scorecard. Sparkline shows 12-day score history per bench.

---

## 5. Audit checklist for new rules (TL;DR)

When designing or reviewing a new rule, work this list:

```text
[ ] Doc has a `## ❌ Incorrect` block with self-contained code
[ ] Doc has a `## ✅ Correct` block with self-contained code
[ ] Both code blocks have a language hint that matches the parser
[ ] Doc snippets pass `npm run ilb:stress-test-docs --rule=<name>`
[ ] Rule is registered in plugin's `src/index.ts` rules export
[ ] Rule has at least one `valid` and one `invalid` test case
[ ] If `meta.fixable`, at least one `invalid` case has an `output` field
[ ] At least 4 fixtures across Arena + Juliet (required for `error` severity)
[ ] Sink list checked against §3.1 per-CWE equivalence list
[ ] Validated-input mitigation applied per §2.2
[ ] AST-walker / codemod context guard applied if rule could match in those contexts
[ ] Severity matches `npm run ilb:severity-audit` policy floor
[ ] Wild precision ≥ 95% before promotion to `error` (per README §1)
[ ] Rule appears in scorecard.md "Per-rule observability" section
[ ] No new disagreements when `npm run ilb:regression` runs against baseline
```

If every box is ticked, the rule is **publication-grade**. If any are missing, treat it as a P1 in the tracker.
