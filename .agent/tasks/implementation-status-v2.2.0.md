# Implementation Status: ESL Lint Plugin Security Rule Fixes v2.2.0

**Last Updated:** 2025-12-12 00:15:00  
**Build Status:** ✅ All tests passing (1342/1342)  
**Current Status:** 2/11 rules fixed, 9 remaining

---

## ✅ Completed Fixes (2/11)

### 1. `no-insecure-jwt` - JWT Algorithm Bypass ✅

**Status:** FIXED & TESTED  
**CWE:** CWE-347 (CVSS 7.5)  
**Build:** ✅ Passing

**Changes Made:**

- Added `looksLikeJwtOperation()` helper function to detect JWT operations beyond known libraries
- Updated `CallExpression` handler to check both `isTrustedJwtLibrary()` AND `looksLikeJwtOperation()`
- Updated `VariableDeclarator` handler to use expanded detection logic
- Now detects patterns like:
  - `jwt.verify(token, secret, {algorithms: []})`
  - `jwt.verify(token, secret, {algorithms: ['none']})`
  - `jwt.verify(token, secret, {algorithms: ['none', 'HS256']})`

**Files Modified:**

- `/packages/eslint-plugin-secure-coding/src/rules/security/no-insecure-jwt.ts`

**Next:** Test against playground demo files

---

### 2. `no-unsanitized-html` - DOM-based XSS ✅

**Status:** FIXED & TESTED  
**CWE:** CWE-79 (XSS - HIGH)  
**Build:** ✅ Passing

**Changes Made:**

- Enhanced detection to catch `outerHTML` in addition to `innerHTML`
- Simplified user input detection to be more aggressive (safer approach)
- Now flags ANY non-sanitized assignment to dangerous DOM properties
- Removed complex user input pattern matching in favor of: "if it's not a literal and not sanitized, flag it"

**Detection:**

- `container.innerHTML = userInput` ✅
- `container.outerHTML = dynamicContent` ✅
- `container.innerHTML = DOMPurify.sanitize(html)` ✓ (allowed - sanitized)
- `container.innerHTML = "static string"` ✓ (allowed - literal)

**Files Modified:**

- `/packages/eslint-plugin-secure-coding/src/rules/security/no-unsanitized-html.ts`

**Next:** Add support for `document.write()` and `insertAdjacentHTML()`

---

## ⏳ Remaining High-Priority Fixes (2/4)

### 3. `no-privilege-escalation` - Authorization Bypass [NEEDS ANALYSIS]

**Status:** IMPLEMENTATION EXISTS, NOT TRIGGERING  
**CWE:** CWE-269 (HIGH)  
**Demo Pattern:** `db.updateUser(req.body.userId, { role: req.body.role })`

**Current Implementation:**
The rule already has comprehensive detection:

1. `AssignmentExpression`: Catches `user.role = req.body.role`
2. `CallExpression`: Catches calls like `setRole()`, `grant()`, etc.
3. **`ObjectExpression`**: Should catch `{ role: req.body.role }` in function arguments

**Why It's Not Working:**
The `ObjectExpression` handler (line 403-434) should be detecting the pattern. Possible issues:

1. Demo file not being linted properly
2. `isInsideRoleCheck()` returning false positive
3. Object expression not being visited for some reason

**Recommended Fix:**

```typescript
// In checkObjectExpression, add debug logging or enhance detection:
function checkObjectExpression(node: TSESTree.ObjectExpression) {
  if (isTestFile) return;

  for (const prop of node.properties) {
    if (prop.type === 'Property' && prop.key.type === 'Identifier') {
      const keyName = prop.key.name.toLowerCase();

      // Expand list of auth-sensitive properties
      const authProps = [
        'role',
        'roles',
        'permission',
        'permissions',
        'privilege',
        'privileges',
        'access',
        'level',
        'isadmin',
        'admin',
        'superuser',
        'scope',
        'scopes',
      ];

      if (authProps.includes(keyName)) {
        const text = sourceCode.getText(prop);
        if (matchesIgnorePattern(text, ignorePatterns)) continue;

        if (containsUserInput(prop.value, sourceCode, userInputPatterns)) {
          if (!isInsideRoleCheck(node, sourceCode, roleCheckPatterns)) {
            context.report({
              node: prop,
              messageId: 'privilegeEscalation',
              data: {
                issue: `Role assignment '${keyName}' from user input without authorization check`,
              },
              suggest: [
                {
                  messageId: 'addRoleCheck',
                  fix: (_fixer: TSESLint.RuleFixer) => null,
                },
              ],
            });
          }
        }
      }
    }
  }
}
```

**Test Plan:**

1. Add unit test with exact demo pattern
2. Verify `containsUserInput()` matches` `req.body.role`
3. Verify `isInsideRoleCheck()` returns false for unsecured context
4. Test against playground demo file directly

---

### 4. `no-buffer-overread` - Memory Safety [TODO]

**Status:** NOT STARTED  
**CWE:** CWE-125 (Memory Safety)  
**Demo Pattern:** `buffer.readUInt8(offset)` without bounds check

**Implementation Needed:**

```typescript
// Add to create() return:
CallExpression(node: TSESTree.CallExpression) {
  if (node.callee.type !== 'MemberExpression') return;
  if (node.callee.property.type !== 'Identifier') return;

  const methodName = node.callee.property.name;
  const bufferReadMethods = [
    'readUInt8', 'readUInt16BE', 'readUInt16LE', 'readUInt32BE', 'readUInt32LE',
    'readInt8', 'readInt16BE', 'readInt16LE', 'readInt32BE', 'readInt32LE',
    'readFloatBE', 'readFloatLE', 'readDoubleBE', 'readDoubleLE',
    'readBigInt64BE', 'readBigInt64LE', 'readBigUInt64BE', 'readBigUInt64LE'
  ];

  if (!bufferReadMethods.includes(methodName)) return;

  // Check buffer object
  if (node.callee.object.type !== 'Identifier') return;
  const bufferName = node.callee.object.name.toLowerCase();
  if (!bufferName.includes('buffer') && !bufferName.includes('buf')) return;

  // Check if there's an offset argument
  if (node.arguments.length === 0) return;

  // For now, flag all buffer reads without bounds checking
  // TODO: Implement sophisticated flow analysis to detect bounds checks

  context.report({
    node,
    messageId: 'bufferOverread',
    data: { method: methodName },
  });
}
```

**Challenges:**

- Requires cross-statement analysis to find bounds checks like `if (offset < buffer.length)`
- May generate false positives without sophisticated flow analysis
- Consider making this rule "warn" level initially

**File to Modify:**

- `/packages/eslint-plugin-secure-coding/src/rules/security/no-buffer-overread.ts`

---

## ⏳ Medium-Priority Fixes (7 rules)

### 5. `no-directive-injection` - Template Injection [TODO]

**Demo:** `ejs.render(userTemplate)`  
**Detection Needed:** Template engine calls with user-controlled templates

```typescript
// Check for template engine usage
CallExpression(node: TSESTree.CallExpression) {
  const templateEngines = ['render', 'compile', 'template'];
  const templateLibs = ['ejs', 'pug', 'handlebars', 'mustache', 'nunjucks'];

  if (node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier') {
    const method = node.callee.property.name.toLowerCase();
    const object = node.callee.object;

    if (template Engines.includes(method)) {
      // Check if object is a template library
      if (object.type === 'Identifier' &&
          templateLibs.some(lib => object.name.toLowerCase().includes(lib))) {
        // Check if first argument contains user input
        if (node.arguments[0] && containsUserInput(node.arguments[0])) {
          context.report({ node, messageId: 'directiveInjection' });
        }
      }
    }
  }
}
```

---

### 6. `no-toctou-vulnerability` - TOCTOU Race Conditions [TODO]

**Demo:** `fs.existsSync(path)` followed by `fs.readFile(path)`  
**Challenge:** Requires multi-statement analysis

```typescript
// Track fs.exists calls and check for subsequent reads
const existsCalls = new Map<string, TSESTree.Node>();

CallExpression(node: TSESTree.CallExpression) {
  if (node.callee.type !== 'MemberExpression') return;
  if (node.callee.object.type !== 'Identifier') return;

  const objectName = node.callee.object.name;
  if (objectName !== 'fs' && objectName !== 'promises') return;

  const method = node.callee.property.type === 'Identifier'
    ? node.callee.property.name
    : '';

  // Track exists/access calls
  if (['existsSync', 'exists', 'access', 'accessSync'].includes(method)) {
    const pathArg = node.arguments[0];
    if (pathArg) {
      const pathText = sourceCode.getText(pathArg);
      existsCalls.set(pathText, node);
    }
  }

  // Check for read operations on previously checked paths
  const readMethods = ['readFile', 'readFileSync', 'readSync', 'open', 'openSync'];
  if (readMethods.includes(method)) {
    const pathArg = node.arguments[0];
    if (pathArg) {
      const pathText = sourceCode.getText(pathArg);
      if (existsCalls.has(pathText)) {
        context.report({
          node,
          messageId: 'toctouVulnerability',
          data: { path: pathText },
        });
      }
    }
  }
}
```

---

### 7. `no-redos-vulnerable-regex` - ReDoS [TODO]

**Demo:** `/^(a+)+$/` (nested quantifiers)  
**Detection:** Static regex complexity analysis

```typescript
// Analyze regex patterns for ReDoS vulnerabilities
Literal(node: TSESTree.Literal) {
  if (node.regex) {
    const pattern = node.regex.pattern;

    // Check for nested quantifiers: (a+)+ or (a*)* or (a+)* etc.
    const nestedQuantifiers = /\([^)]*[*+]\)[*+]/;
    if (nestedQuantifiers.test(pattern)) {
      context.report({
        node,
        messageId: 'redosVulnerable',
        data: { pattern },
      });
    }

    // Check for alternation with overlapping patterns
    const dangerousAlternation = /\([^|]*\|[^)]*\)[*+]/;
    if (dangerousAlternation.test(pattern)) {
      context.report({
        node,
        messageId: 'redosVulnerable',
        data: { pattern },
      });
    }
  }
}

NewExpression(node: TSESTree.NewExpression) {
  if (node.callee.type === 'Identifier' &&
      node.callee.name === 'RegExp' &&
      node.arguments[0]) {
    // Analyze RegExp constructor
    // Similar logic as Literal check above
  }
}
```

---

### 8. `no-insecure-comparison` - Timing Attacks [TODO]

**Demo:** `password === userInput`  
**Detection:** Strict equality on credential variables

```typescript
BinaryExpression(node: TSESTree.BinaryExpression) {
  if (node.operator !== '===' && node.operator !== '!==') return;

  const credentialNames = [
    'password', 'pwd', 'secret', 'token', 'key',
    'hash', 'auth', 'credential', 'api_key', 'apikey'
  ];

  const containsCredential = (n: TSESTree.Node): boolean => {
    const text = sourceCode.getText(n).toLowerCase();
    return credentialNames.some(name => text.includes(name));
  };

  if (containsCredential(node.left) || containsCredential(node.right)) {
    context.report({
      node,
      messageId: 'insecureComparison',
      suggest: [{
        messageId: 'useTimingSafeEqual',
        fix: (fixer) => {
          // Replace with crypto.timingSafeEqual()
          return null; // Complex fix - provide suggestion only
        },
      }],
    });
  }
}
```

---

### 9. `no-unescaped-url-parameter` - Open Redirect [TODO]

**Demo:** `window.location = params.returnUrl`  
**Detection:** URL parameter flow to redirect sinks

```typescript
AssignmentExpression(node: TSESTree.AssignmentExpression) {
  if (node.left.type !== 'MemberExpression') return;

  const text = sourceCode.getText(node.left);
  const redirectSinks = [
    'window.location',
    'window.location.href',
    'location.href',
    'document.location'
  ];

  if (redirectSinks.some(sink => text.includes(sink))) {
    // Check if right side contains URL parameters
    const rightText = sourceCode.getText(node.right);
    const urlParamPatterns = [
      /params?\./,
     /query\./,
      /req\.(query|params)/,
      /returnUrl/,
      /redirect/i,
      /next/,
 /url/i
    ];

    if (urlParamPatterns.some(p => p.test(rightText))) {
      // Check for URL encoding
      const encoded = /encodeURI|escape/.test(rightText);
      if (!encoded) {
        context.report({
          node,
          messageId: 'unescapedUrlParameter',
        });
      }
    }
  }
}
```

---

### 10. `no-improper-sanitization` - Sanitization Bypass [TODO]

**Demo:** `.replace(/<script>/g, '')`  
**Detection:** Incomplete sanitization patterns

```typescript
CallExpression(node: TSESTree.CallExpression) {
  if (node.callee.type !== 'MemberExpression') return;
  if (node.callee.property.type !== 'Identifier') return;

  const method = node.callee.property.name;
  if (method !== 'replace') return;

  // Check if it's trying to sanitize HTML
  const args = node.arguments;
  if (args.length < 2) return;

  const pattern = sourceCode.getText(args[0]);
  const replacement = sourceCode.getText(args[1]);

  // Detect common incomplete sanitization patterns
  const incomplete Patterns = [
    /<script>/,  // Only removes <script>, not</script>
    /<.*?>/,     // Tries to remove ALL tags with single replace
  ];

  if (incompletePatterns.some(p => pattern.includes(p.source))) {
    context.report({
      node,
      messageId: 'improperSanitization',
      data: { pattern },
    });
  }
}
```

---

### 11. `no-improper-type-validation` - Type Confusion [TODO]

**Demo:** `if (data)` truthy check on `unknown` type  
**Detection:** TypeScript type narrowing analysis

```typescript
// Requires TypeScript type information
IfStatement(node: TSESTree.IfStatement) {
  if (node.test.type !== 'Identifier') return;

  // Get TypeScript type information (requires parserServices)
  const parserServices = context.parserServices;
  if (!parserServices || !parserServices.program) return;

  const checker = parserServices.program.getTypeChecker();
  const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.test);
  const type = checker.getTypeAtLocation(tsNode);

  // Check if type is 'unknown' or 'any'
  if (type.flags & ts.TypeFlags.Unknown || type.flags & ts.TypeFlags.Any) {
    // Check if condition is just a truthy check
    const conditionText = sourceCode.getText(node.test);
    if (!/typeof|instanceof|Array\.isArray/.test(conditionText)) {
      context.report({
        node: node.test,
        messageId: 'improperTypeValidation',
      });
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

For each fixed rule, add test cases:

```typescript
ruleTester.run('rule-name', rule, {
  valid: [
    // Safe patterns
    'const safe = literal;',
  ],
  invalid: [
    {
      code: 'vulnerable pattern',
      errors: [{ messageId: 'expectedMessage' }],
    },
  ],
});
```

### Integration Tests

After all fixes:

```bash
# Build
nx build eslint-plugin-secure-coding

# Test against playground
cd ~/repos/ofriperetz.dev/playground
pnpm add -w -D eslint-plugin-secure-coding@latest
nx lint demo-secure-coding-app

# Analyze results
nx lint demo-secure-coding-app 2>&1 | grep -o 'secure-coding/[a-z-]*' | sort | uniq -c | sort -rn
```

---

## Release Checklist for v2.2.0

### Pre-Release

- [ ] Fix all 11 detection gap rules
- [ ] Run full test suite: `nx test eslint-plugin-secure-coding`
- [ ] Verify playground demos trigger correctly
- [ ] Update rule documentation
- [ ] Update CHANGELOG.md

### Version Bump

- [ ] Run `nx release version minor`
- [ ] Verify version: 2.1.0 → 2.2.0

### Publish

- [ ] Run `nx release publish`
- [ ] Verify npm package: `npm view eslint-plugin-secure-coding@2.2.0`

### Post-Release

- [ ] Update playground: `pnpm add -w -D eslint-plugin-secure-coding@2.2.0`
- [ ] Generate new comprehensive report
- [ ] Update repository README with new coverage stats (target: 48/48 = 100%)

---

## Current Progress Summary

**Completed:** 2/11 rules (18%)  
**Build Status:** ✅ Passing  
**Test Coverage:** 1342/1342 tests passing

**High Priority Remaining:** 2 rules

- `no-privilege-escalation` (needs analysis)
- `no-buffer-overread` (needs implementation)

**Medium Priority Remaining:** 7 rules

- All medium priority rules need implementation

**Estimated Time to Complete:**

- High priority (2 rules): 2-3 hours
- Medium priority (7 rules): 5-7 hours
- Testing & validation: 2 hours
- **Total:** 9-12 hours of development time

**Recommendation:**

1. Complete high-priority fixes first (2-3 hours)
2. Release as v2.1.1 with critical fixes
3. Schedule v2.2.0 with all 11 rules fixed

---

_Last build: 2025-12-12 00:15 - All tests passing ✅_
