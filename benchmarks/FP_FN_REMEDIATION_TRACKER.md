# FP/FN Remediation Tracker

> Generated: 2026-02-07 | Updated: 2026-02-08 | Source: Dual-benchmark results (security + quality)
> Methodology: Test-first — write failing test → fix rule → verify benchmark regression

## 🎉 SECURITY FP STATUS: ALL RESOLVED

> **2026-02-08 Verification:** Re-ran benchmark with locally-built packages (latest source code).
> All 9 security FPs eliminated. Precision: **100%** (0 FPs). F1: **82.4%** (up from 77.5%).
>
> **ACTION REQUIRED:** Publish updated npm packages to lock in the fix:
>
> - `eslint-plugin-secure-coding` (has: isInSafeCallerContext, GraphQL keyword refinements)
> - `eslint-plugin-node-security` (has: validation-aware child process detection)
> - `@interlace/eslint-devkit` (dependency)
>
> Then `npm update` in `eslint-benchmark-suite` and commit the `2026-02-08.json` results.

---

## Status Legend

| Status | Meaning                   |
| :----- | :------------------------ |
| ⬜     | Not started               |
| 🧪     | Test written, fix pending |
| ✅     | Test + fix verified       |

---

## Part 1: Security False Positives (9 FPs → 0 FPs ✅ — 6 rules)

These are safe code patterns incorrectly flagged by Interlace security rules.

### FP-S1: `safe_cmd_validated` → `detect-child-process`

- **Status**: ✅ (verified: 2026-02-08 benchmark run)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:86-93`
- **Rule**: `eslint-plugin-node-security/src/rules/detect-child-process`
- **Root Cause**: Flags `execFile("convert", ["input.img", \`output.${format}\`])`even though format was validated via`ALLOWED_FORMATS.includes(format)` above
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const { execFile } = require("child_process");
      const ALLOWED_FORMATS = ["png", "jpg", "gif"];
      if (ALLOWED_FORMATS.includes(format)) {
        execFile("convert", ["input.img", \`output.\${format}\`]);
      }
    `,
  }
  ```
- **Fix**: In `detect-child-process`, traverse upward from the call site to find an `IfStatement` whose test contains a `.includes()` call that validates any variable used in the arguments array. Treat as safe if the validated variable is the one interpolated.

### FP-S2: `safe_cmd_validated` → `no-graphql-injection`

- **Status**: ✅ (verified: 2026-02-08 benchmark run — `isInSafeCallerContext` + keyword refinement)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:86-93`
- **Rule**: `eslint-plugin-secure-coding/src/rules/no-graphql-injection`
- **Root Cause**: Template literal `` `output.${format}` `` is flagged as potential GraphQL injection even though there are no GraphQL keywords
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const path = \`output.\${format}\`;
    `,
  }
  ```
- **Fix**: The `no-graphql-injection` rule should only flag template literals that contain **GraphQL structural markers** (keywords like `query`, `mutation`, `fragment` followed by `{ }`). A simple file path template should not trigger.

### FP-S3: `safe_path_allowlist` → `detect-non-literal-fs-filename`

- **Status**: ✅ (verified: 2026-02-08 benchmark run)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:121-131`
- **Rule**: `eslint-plugin-node-security/src/rules/detect-non-literal-fs-filename`
- **Root Cause**: `fs.readFileSync(path.join("./config", filename))` is flagged despite `ALLOWED_FILES.includes(filename)` check above
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const fs = require("fs");
      const path = require("path");
      const ALLOWED_FILES = ["config.json", "readme.txt"];
      if (!ALLOWED_FILES.includes(filename)) { throw new Error("Bad"); }
      fs.readFileSync(path.join("./config", filename));
    `,
  }
  ```
- **Fix**: Expand `isValidationCall` helper to detect `CONSTANT_ARRAY.includes(variable)` as a validation guard before the fs call.

### FP-S4: `safe_path_regex` → `detect-non-literal-fs-filename`

- **Status**: ✅ (verified: 2026-02-08 benchmark run)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:137-146`
- **Rule**: `eslint-plugin-node-security/src/rules/detect-non-literal-fs-filename`
- **Root Cause**: `fs.readFileSync(path.join("./uploads", filename))` flagged despite `/^[a-zA-Z0-9._-]+$/.test(filename)` regex guard
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const fs = require("fs");
      const path = require("path");
      if (!/^[a-zA-Z0-9._-]+$/.test(filename)) { throw new Error("Invalid"); }
      fs.readFileSync(path.join("./uploads", filename));
    `,
  }
  ```
- **Fix**: Expand `isValidationCall` to detect regex `.test()` guards as validation.

### FP-S5: `safe_template_logging` → `no-graphql-injection` (x2)

- **Status**: ✅ (verified: 2026-02-08 benchmark run — `isInSafeCallerContext` detects console.log)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:244-247`
- **Rule**: `eslint-plugin-secure-coding/src/rules/no-graphql-injection`
- **Root Cause**: ``console.log(`User logged in: ${username}`)`` and ``{ message: `Welcome, ${username}` }`` flagged as GraphQL injection
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `console.log(\`User logged in: \${username}\`);`,
  },
  {
    code: `const msg = { message: \`Welcome, \${username}\` };`,
  }
  ```
- **Fix**: Check callee context — if the template literal is inside `console.log()` or assigned to a simple object property, skip. Also ensure GraphQL structural markers are present.

### FP-S6: `safe_proto_allowlist` → `no-sensitive-data-exposure`

- **Status**: ✅ (verified: 2026-02-08 benchmark run)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:257-264`
- **Rule**: `eslint-plugin-secure-coding/src/rules/no-sensitive-data-exposure`
- **Root Cause**: Variable named with substring matching "password" context in an allowlist pattern
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const VALID_KEYS = ["name", "email", "age", "status"];
      if (!VALID_KEYS.includes(key)) { throw new Error("Invalid"); }
      obj[key] = value;
    `,
  }
  ```
- **Fix**: Check if the variable is used in a validation/allowlist context rather than being logged/exposed.

### FP-S7: `safe_proto_nullproto` → `detect-object-injection`

- **Status**: ✅ (verified: 2026-02-08 benchmark run — `isPrototypelessObject` detects Object.create(null))
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:292-298`
- **Rule**: `eslint-plugin-secure-coding/src/rules/detect-object-injection`
- **Root Cause**: `obj[key] = value` flagged even though `obj = Object.create(null)` — null-prototype objects are immune to prototype pollution
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      const obj = Object.create(null);
      for (const [key, value] of entries) {
        obj[key] = value;
      }
    `,
  }
  ```
- **Fix**: Track `Object.create(null)` declarations and exclude bracket access on those identifiers.

### FP-S8: `safe_random_shuffle` → `detect-object-injection` (x4)

- **Status**: ✅ (verified: 2026-02-08 benchmark run — `numericIndexNames` set detects i/j)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:338-346`
- **Rule**: `eslint-plugin-secure-coding/src/rules/detect-object-injection`
- **Root Cause**: Fisher-Yates shuffle `[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]` creates 4 bracket access warnings — these are numeric array indices, not prototype pollution
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    `,
  }
  ```
- **Fix**: Check if the index variable is a numeric loop counter (declared with `let i =`, `let j =` in a for loop). The rule already has a Set for common index names but needs to handle dynamically computed indices.

### FP-S9: `safe_timing_compare` → `no-insecure-comparison`

- **Status**: ✅ (verified: 2026-02-08 benchmark run)
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:392-402`
- **Rule**: `eslint-plugin-secure-coding/src/rules/no-insecure-comparison`
- **Root Cause**: `inputBuffer.length !== secretBuffer.length` flagged as timing-unsafe comparison — but `.length` checks are standard practice BEFORE `timingSafeEqual`
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `
      if (inputBuffer.length !== secretBuffer.length) { return false; }
      return crypto.timingSafeEqual(inputBuffer, secretBuffer);
    `,
  }
  ```
- **Fix**: Exclude `.length` property comparisons from timing-attack detection.

### FP-S10: `safe_redirect_sameorigin` → `no-graphql-injection` + `no-xpath-injection`

- **Status**: ✅ (verified: 2026-02-08 benchmark run — `isInSafeCallerContext` detects new URL())
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js:439-451`
- **Rule**: `eslint-plugin-secure-coding/src/rules/no-graphql-injection`, `no-xpath-injection`
- **Root Cause**: ``new URL(target, `https://${req.headers.host}`)`` flagged as GraphQL/XPath injection — it's a URL template
- **Test Case (unit test)**:
  ```typescript
  // Valid — should NOT flag
  {
    code: `const url = new URL(target, \`https://\${req.headers.host}\`);`,
  }
  ```
- **Fix**: `no-graphql-injection` should skip template literals starting with `https://` or `http://`. `no-xpath-injection` should skip URL patterns.

---

## Part 2: Security False Negatives (12 FNs — 7 categories)

These are vulnerable code patterns that Interlace MISSED.

> **2026-02-08 Update:** FN count increased from 9 to 12. The original benchmark had 3 "accidental TPs"
> where `no-graphql-injection` was incorrectly flagging SQL template literals as GraphQL injection.
> After fixing the GraphQL FPs, these are now correctly classified as FNs:
>
> - `vuln_sql_template_literal` — was flagged by graphql rule (wrong CWE), now correctly unflagged
> - `vuln_sql_dynamic_column` — same
> - `vuln_sql_conditional` — same
>
> These 4 SQL FNs need a proper SQL injection detection rule to be fixed.

### FN-S1: `vuln_sql_string_concat` — SQL Injection via `+` concat

- **Status**: ⬜
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/vulnerable/vulnerable.js:16-19`
- **Pattern**: `"SELECT * FROM users WHERE id = '" + userId + "'"`
- **Rule**: `eslint-plugin-pg/src/rules/no-unsafe-query` (or new rule)
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `
      const query = "SELECT * FROM users WHERE id = '" + userId + "'";
      db.query(query);
    `,
    errors: [{ messageId: 'unsafeQuery' }],
  }
  ```
- **Fix**: Extend `no-unsafe-query` to detect string concatenation (`BinaryExpression` with `+`) where the left side contains SQL keywords.

### FN-S2: `vuln_xss_innerhtml` — XSS via innerHTML

- **Status**: ⬜
- **Fixture**: `benchmarks/fn-fp-comparison/fixtures/vulnerable/vulnerable.js:226-228`
- **Pattern**: `document.getElementById("output").innerHTML = userContent`
- **Rule**: **NEW** `eslint-plugin-browser-security/no-inner-html`
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `document.getElementById("output").innerHTML = userContent;`,
    errors: [{ messageId: 'noInnerHtml' }],
  }
  ```
- **Fix**: Create new rule that flags `MemberExpression` where `property.name === 'innerHTML'` in an `AssignmentExpression`.

### FN-S3 & FN-S4: `vuln_random_token` + `vuln_random_session` — Insecure Randomness

- **Status**: ⬜
- **Fixture**: `vulnerable.js:299-301, 307-309`
- **Pattern**: `Math.random().toString(36)` and `Math.floor(Math.random() * 1000000)`
- **Rule**: **NEW** `eslint-plugin-secure-coding/no-insecure-random`
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `return Math.random().toString(36).substring(2);`,
    errors: [{ messageId: 'insecureRandom' }],
  },
  {
    code: `return "session_" + Math.floor(Math.random() * 1000000);`,
    errors: [{ messageId: 'insecureRandom' }],
  }
  ```
- **Fix**: Create new rule that flags `Math.random()` calls.

### FN-S5 & FN-S6: `vuln_nosql_mongo` + `vuln_nosql_where` — NoSQL Injection

- **Status**: ⬜
- **Fixture**: `vulnerable.js:374-377, 383-386`
- **Pattern**: `db.collection("users").findOne({ username })` and `{ $where: userInput }`
- **Rule**: **NEW** `eslint-plugin-mongodb-security/no-nosql-injection`
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `db.collection("users").find({ $where: userInput });`,
    errors: [{ messageId: 'nosqlInjection' }],
  }
  ```
- **Fix**: Create new rule that flags MongoDB `$where` with non-literal values and unvalidated findOne/find with user-controlled query objects.

### FN-S7 & FN-S8: `vuln_ssrf_fetch` + `vuln_ssrf_axios` — SSRF

- **Status**: ⬜
- **Fixture**: `vulnerable.js:396-399, 405-408`
- **Pattern**: `fetch(userUrl)` and `axios.get(endpoint)` without URL validation
- **Rule**: **NEW** `eslint-plugin-secure-coding/no-ssrf`
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `
      async function handler(userUrl) {
        return fetch(userUrl);
      }
    `,
    errors: [{ messageId: 'ssrf' }],
  }
  ```
- **Fix**: Create new rule that flags `fetch(variable)` and `axios.get(variable)` where the URL argument is a function parameter (user-controlled input).

### FN-S9: `vuln_redirect` — Open Redirect

- **Status**: ⬜
- **Fixture**: `vulnerable.js:418-421`
- **Pattern**: `res.redirect(req.query.returnTo)`
- **Rule**: **NEW** `eslint-plugin-express-security/no-open-redirect`
- **Test Case (unit test)**:
  ```typescript
  // Invalid — should flag
  {
    code: `
      function handler(req, res) {
        res.redirect(req.query.returnTo);
      }
    `,
    errors: [{ messageId: 'openRedirect' }],
  }
  ```
- **Fix**: Create new rule that flags `res.redirect()` where the argument traces back to `req.query`, `req.params`, or `req.body`.

---

## Part 3: Quality False Positives (31 FPs — 5 rules)

Two rules are responsible for **95%+** of all quality FPs.

### FP-Q1: `reliability/no-missing-null-checks` — 73 violations across 31 functions

- **Status**: ⬜
- **Rule**: `eslint-plugin-reliability/src/rules/no-missing-null-checks`
- **Root Cause**: Flags every property access as potential null deref, even with existing guards
- **Clean functions falsely flagged**: `clean_proper_error_handling`, `clean_timeout_abort`, `clean_parallel_requests`, `clean_awaited_promise`, `clean_structured_logging`, `clean_no_debug`, `clean_generic_error`, `clean_logger_info`, `clean_error_boundary`, `clean_early_return`, `clean_focused_function`, `clean_strategy_pattern`, `clean_simple_conditional`, `clean_single_responsibility`, `clean_const_let`, `clean_async_await`, `clean_immutable_params`, `clean_pure_utility`, `clean_rich_domain_model`, `clean_dependency_injection`, `clean_interface_segregation`, `clean_named_import`, `clean_lazy_import`, `clean_array_is_array`, `clean_rest_params`, `clean_for_of`, `clean_buffer_from`, `clean_graceful_shutdown`, `clean_direct_return`, `clean_promise_all_settled`, `clean_async_error_handling`
- **Fix Required**:
  1. Recognize optional chaining (`?.`) as a null guard
  2. Recognize nullish coalescing (`??`) as a null guard
  3. Recognize early-return guard patterns (`if (!x) return/throw`)
  4. Don't flag function parameters (assumed non-null unless typed as nullable)
  5. Don't flag inside try/catch blocks (error handling context)
  6. Recognize `typeof x !== 'undefined'` guards

### FP-Q2: `reliability/no-unhandled-promise` — 26 violations across 20 functions

- **Status**: ⬜
- **Rule**: `eslint-plugin-reliability/src/rules/no-unhandled-promise`
- **Root Cause**: Flags return values of functions that MIGHT be promise-like
- **Fix Required**:
  1. Don't flag `return asyncCall()` (caller handles the promise)
  2. Don't flag inside try/catch blocks
  3. Don't flag `.then().catch()` chains
  4. Don't flag `await` expressions (already awaited)

### FP-Q3: `reliability/require-network-timeout` — 5 violations

- **Status**: ⬜
- **Rule**: `eslint-plugin-reliability/src/rules/require-network-timeout`
- **Fix Required**: Recognize `AbortController` + `setTimeout` as valid timeout pattern

### FP-Q4: `maintainability/consistent-function-scoping` — 8 violations across 6 functions

- **Status**: ⬜
- **Rule**: `eslint-plugin-maintainability/src/rules/consistent-function-scoping`
- **Fix Required**: Don't flag class methods or dependency injection factory patterns

### FP-Q5: `maintainability/identical-functions` — 3 violations

- **Status**: ⬜
- **Rule**: `eslint-plugin-maintainability/src/rules/identical-functions`
- **Fix Required**: Increase minimum threshold for function body similarity

---

## Part 4: Quality False Negatives (6 FNs — 5 categories)

### FN-Q1: `prob_verbose_error` — Verbose Error Exposing Internals

- **Status**: ⬜
- **Fixture**: `benchmarks/quality-comparison/fixtures/problematic/quality-antipatterns.js:138-142`
- **Pattern**: ``throw new Error(`Database connection failed at ${host}:${port} with user ${dbUser}`)``
- **Rule**: `eslint-plugin-operability/no-verbose-error-messages` (enhance)
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `throw new Error(\`Connection failed at \${host}:\${port} with user \${user}\`);`,
    errors: [{ messageId: 'verboseError' }],
  }
  ```
- **Fix**: Enhance to detect template literals in `new Error()` with interpolation of host/port/user patterns.

### FN-Q2: `prob_magic_numbers` — Unexplained Magic Numbers

- **Status**: ⬜
- **Fixture**: `quality-antipatterns.js:205-214`
- **Pattern**: `if (total > 1000) { return total * 0.15; }`
- **Rule**: **NEW** `eslint-plugin-conventions/no-magic-numbers`
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `
      if (total > 1000) { return total * 0.15; }
      else if (total > 500) { return total * 0.1; }
    `,
    errors: [{ messageId: 'magicNumber' }, { messageId: 'magicNumber' }],
  }
  ```
- **Fix**: Create new rule. Flag numeric literals that are not 0, 1, -1, or common array/string operations.

### FN-Q3: `prob_inconsistent_returns` — Mixed Return Types

- **Status**: ⬜
- **Fixture**: `quality-antipatterns.js:290-295`
- **Pattern**: Returns `"high"`, `50`, `true`, and `null` from different branches
- **Rule**: **NEW** `eslint-plugin-conventions/consistent-return-type`
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `
      function f(value) {
        if (value > 100) return "high";
        if (value > 50) return 50;
        return null;
      }
    `,
    errors: [{ messageId: 'inconsistentReturn' }],
  }
  ```
- **Fix**: Create new rule that tracks return types across branches and flags mixed types.

### FN-Q4: `prob_string_concat` — String Concatenation Instead of Template Literals

- **Status**: ⬜
- **Fixture**: `quality-antipatterns.js:302-312`
- **Pattern**: `"Hello, my name is " + name + ", I am " + age + " years old"`
- **Rule**: **NEW** `eslint-plugin-conventions/prefer-template-literal`
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `return "Hello " + name + " from " + city;`,
    errors: [{ messageId: 'preferTemplateLiteral' }],
  }
  ```
- **Fix**: Create new rule that flags string concatenation between string literals and variables.

### FN-Q5: `prob_mutable_export` — Mutable Exported Binding

- **Status**: ⬜
- **Fixture**: `quality-antipatterns.js:372`
- **Pattern**: `export let prob_mutable_export = "initial"`
- **Rule**: **NEW** `eslint-plugin-modularity/no-mutable-exports`
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `export let count = 0;`,
    errors: [{ messageId: 'noMutableExports' }],
  }
  ```
- **Fix**: Create new rule that flags `export let` and `export var` declarations.

### FN-Q6: `prob_new_buffer` — Deprecated `new Buffer()`

- **Status**: ⬜
- **Fixture**: `quality-antipatterns.js:394-396`
- **Pattern**: `return new Buffer(size)`
- **Rule**: **NEW** `eslint-plugin-modernization/no-new-buffer`
- **Test Case**:
  ```typescript
  // Invalid — should flag
  {
    code: `const buf = new Buffer(10);`,
    errors: [{ messageId: 'noNewBuffer' }],
  }
  ```
- **Fix**: Create new rule that flags `new Buffer()` calls. Suggest `Buffer.from()` or `Buffer.alloc()`.

---

## Execution Priority

### Wave 1: Biggest Impact FP Fixes (3 rules → eliminates ~90% of all FPs)

| #   | Target                   | Est. FP Reduction |
| :-- | :----------------------- | :---------------- |
| 1   | `no-missing-null-checks` | -73 quality FPs   |
| 2   | `no-unhandled-promise`   | -26 quality FPs   |
| 3   | `no-graphql-injection`   | -4 security FPs   |

### Wave 2: Remaining Security FP Fixes (5 rules)

| #   | Target                           |
| :-- | :------------------------------- |
| 4   | `detect-non-literal-fs-filename` |
| 5   | `detect-object-injection`        |
| 6   | `no-sensitive-data-exposure`     |
| 7   | `no-insecure-comparison`         |
| 8   | `no-xpath-injection`             |

### Wave 3: Security FN Fixes — New Rules (5 new rules)

| #   | Target                                                    |
| :-- | :-------------------------------------------------------- |
| 9   | `no-insecure-random` (covers 2 FNs)                       |
| 10  | `no-inner-html` (covers 1 FN)                             |
| 11  | `no-nosql-injection` (covers 2 FNs)                       |
| 12  | `no-ssrf` (covers 2 FNs)                                  |
| 13  | `no-open-redirect` (covers 1 FN)                          |
| 14  | Enhance `no-unsafe-query` for string concat (covers 1 FN) |

### Wave 4: Quality FN Fixes — New Rules (5 new rules)

| #   | Target                              |
| :-- | :---------------------------------- |
| 15  | `no-magic-numbers`                  |
| 16  | `prefer-template-literal`           |
| 17  | `no-mutable-exports`                |
| 18  | `no-new-buffer`                     |
| 19  | `consistent-return-type`            |
| 20  | Enhance `no-verbose-error-messages` |

### Wave 5: Minor Quality FP Fixes (3 rules)

| #   | Target                        |
| :-- | :---------------------------- |
| 21  | `require-network-timeout`     |
| 22  | `consistent-function-scoping` |
| 23  | `identical-functions`         |

---

## Success Criteria

| Metric             | Original (npm)        | Current (source) | After FN Fixes | Target   |
| :----------------- | :-------------------- | :--------------- | :------------- | :------- |
| Security FP        | 9                     | **0** ✅         | 0              | **0**    |
| Security FN        | 9 (incl 3 accidental) | **12**           | 0              | **0**    |
| Quality FP         | 31                    | 31 (pending)     | 2              | **0**    |
| Quality FN         | 6                     | 6                | 0              | **0**    |
| Security Precision | 77.5%                 | **100%** ✅      | ≥95%           | **≥95%** |
| Security Recall    | 77.5%                 | **70.0%**        | ≥95%           | **≥95%** |
| Security F1        | 77.5%                 | **82.4%** ✅     | ≥95%           | **≥95%** |
| Quality F1         | 64.8%                 | ~64.8%           | ~80%           | **≥90%** |

---

## Verification Protocol

After each fix:

1. `pnpm nx test <plugin-name>` — unit tests pass
2. `pnpm nx lint <plugin-name>` — no lint errors
3. `pnpm nx build <plugin-name>` — builds clean
4. Re-run benchmark: `npm run benchmark:fn-fp` / `npm run benchmark:quality`
5. Compare results JSON — verify FP/FN count decreased, no regressions
