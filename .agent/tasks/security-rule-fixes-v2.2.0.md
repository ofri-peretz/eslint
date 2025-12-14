# Implementation Plan for eslint-plugin-secure-coding v2.2.0

**Status:** In Progress  
**Start Date:** 2025-12-12  
**Target Completion:** High-priority fixes for v2.2.0

---

## High Priority Fixes (v2.2.0 Release)

### ✅ 1. `no-insecure-jwt` - JWT Algorithm Bypass [COMPLETED]

**Status:** ✅ Fixed  
**CWE:** CWE-347 (CVSS 7.5)  
**Changes Made:**

- Added `looksLikeJwtOperation()` helper function to detect JWT operations beyond known libraries
- Updated CallExpression handler to check both `isTrustedJwtLibrary()` AND `looksLikeJwtOperation()`
- Updated VariableDeclarator handler to use the same logic
- Now detects patterns like `jwt.verify(token, secret, {algorithms: []})` and `{algorithms: ['none']}`

**Testing:** Build successful ✅  
**Next:** Test against demo file in playground

### ⏳ 2. `no-unsanitized-html` - DOM-based XSS [TODO]

**Status:** Pending  
**CWE:** XSS (HIGH)  
**Issue:** `innerHTML = userContent` not detected  
**Demo:** Line 15 in `no-unsanitized-html.ts`  
**Fix Needed:**

- Add detection for DOM property assignments (innerHTML, outerHTML, insertAdjacentHTML)
- Track user-controlled data flow to these sinks
- Consider safe patterns like textContent or DOMPurify usage

**Implementation Approach:**

```typescript
// Detect assignments to dangerous DOM properties
AssignmentExpression(node) {
  if (node.left.type === 'MemberExpression' &&
      node.left.property.type === 'Identifier') {
    const propName = node.left.property.name;
    const dangerousProps = ['innerHTML', 'outerHTML'];

    if (dangerousProps.includes(propName)) {
      // Check if right side contains user input
      if (containsUserInput(node.right)) {
        context.report({
          node,
          messageId: 'unsanitizedHtml'
        });
      }
    }
  }
}

// Also check CallExpression for insertAdjacentHTML, document.write, etc.
CallExpression(node) {
  if (node.callee.type === 'MemberExpression') {
    const methodName = node.callee.property.name;
    const dangeroMethods = ['insertAdjacentHTML', 'write', 'writeln'];

    if (dangerousMethods.includes(methodName) && node.arguments.length > 0) {
      if (containsUserInput(node.arguments[0])) {
        context.report({
          node,
          messageId: 'unsanitizedHtml'
        });
      }
    }
  }
}
```

### ⏳ 3. `no-privilege-escalation` - Authorization Bypass [TODO]

**Status:** Pending  
**CWE:** Authorization (HIGH)  
**Issue:** `user.role = req.body.role` not detected  
**Demo:** Line 18 in `no-privilege-escalation.ts`  
**Fix Needed:**

- Detect authorization-critical property updates from untrusted input
- Track patterns like `user.role`, `user.permissions`, `user.admin`, etc.
- Identify untrusted sources like `req.body`, `req.query`, `params`

**Implementation Approach:**

```typescript
// List of authorization-sensitive properties
const authProperties = [
  'role', 'roles', 'permissions', 'admin', 'isAdmin',
  'superuser', 'privileges', 'access', 'scope', 'scopes'
];

const untrustedSources = [
  'req.body', 'req.query', 'req.params', 'request.body',
  'request.query', 'request.params', 'ctx.request.body'
];

AssignmentExpression(node) {
  if (node.left.type === 'MemberExpression' &&
      node.left.property.type === 'Identifier') {
    const propName = node.left.property.name;

    if (isAuthProperty(propName)) {
      if (isUntrustedSource(node.right)) {
        context.report({
          node,
          messageId: 'privilegeEscalation',
          data: { property: propName }
        });
      }
    }
  }
}
```

### ⏳ 4. `no-buffer-overread` - Memory Safety [TODO]

**Status:** Pending  
**CWE:** CWE-125  
**Issue:** `Buffer.readUInt8()` without bounds checking not detected  
**Demo:** Line 12 in `no-buffer-overread.ts`  
**Fix Needed:**

- Track Buffer read operations (readUInt8, readUInt16, readInt32, etc.)
- Check if bounds validation exists before the read
- Detect patterns like `if (offset < buffer.length)` before `buffer.readUInt8(offset)`

**Implementation Approach:**

```typescript
// Track buffer read methods
const bufferReadMethods = [
  'readUInt8', 'readUInt16BE', 'readUInt16LE', 'readUInt32BE', 'readUInt32LE',
  'readInt8', 'readInt16BE', 'readInt16LE', 'readInt32BE', 'readInt32LE',
  'readFloatBE', 'readFloatLE', 'readDoubleBE', 'readDoubleLE',
  'readBigInt64BE', 'readBigInt64LE', 'readBigUInt64BE', 'readBigUInt64LE'
];

CallExpression(node) {
  if (node.callee.type === 'MemberExpression') {
    const methodName = node.callee.property.name;

    if (bufferReadMethods.includes(methodName)) {
      const offsetArg = node.arguments[0];

      // Check if there's a bounds check before this read
      if (!hasBoundsCheck(node, offsetArg)) {
        context.report({
          node,
          messageId: 'bufferOverread',
          data: { method: methodName }
        });
      }
    }
  }
}

// Helper to detect bounds checking
function hasBoundsCheck(readNode, offsetExpr) {
  // Look for parent if statement with length check
  // This requires cross-statement analysis
  const parent = readNode.parent;
  // Check for patterns like:
  // if (offset < buffer.length) { buffer.readUInt8(offset); }
  // if (offset + 4 <= buffer.length) { buffer.readUInt32BE(offset); }
  return false; // Simplified - needs full implementation
}
```

---

## Medium Priority Fixes (v2.3.0 Release)

### ⏳ 5. `no-directive-injection` - Template Injection

**Status:** Pending  
**Issue:** `ejs.render(userTemplate)` not detected  
**Fix:** Detect template engine usage with user-controlled templates

### ⏳ 6. `no-toctou-vulnerability` - TOCTOU Race Conditions

**Status:** Pending  
**Issue:** `fs.existsSync()` followed by `fs.readFile()` not detected  
**Fix:** Cross-statement analysis for check-use patterns

### ⏳ 7. `no-redos-vulnerable-regex` - ReDoS

**Status:** Pending  
**Issue:** `/^(a+)+$/` with nested quantifiers not detected  
**Fix:** Static regex complexity analysis

### ⏳ 8. `no-insecure-comparison` - Timing Attacks

**Status:** Pending  
**Issue:** `password === userInput` not detected  
**Fix:** Detect strict equality on credential variables

### ⏳ 9. `no-unescaped-url-parameter` - Open Redirect

**Status:** Pending  
**Issue:** `window.location = params.returnUrl` not detected  
**Fix:** Track URL parameter flow to redirect sinks

### ⏳ 10. `no-improper-sanitization` - Sanitization Bypass

**Status:** Pending  
**Issue:** `.replace(/<script>/g, '')` insufficient sanitization not detected  
**Fix:** Recognize incomplete sanitization patterns

### ⏳ 11. `no-improper-type-validation` - Type Confusion

**Status:** Pending  
**Issue:** `if (data)` truthy check on `unknown` type not detected  
**Fix:** TypeScript type narrowing analysis

---

## Testing Strategy

### Unit Tests

- [ ] Add test case for generic `jwt.verify()` detection
- [ ] Test `algorithms: []` pattern
- [ ] Test `algorithms: ['none']` pattern
- [ ] Test mixed `algorithms: ['none', 'HS256']` pattern

### Integration Tests

- [ ] Run against playground demo files
- [ ] Verify all 11 missing rules are now detected
- [ ] Check for no regressions in existing 37 working rules

### Performance Tests

- [ ] Ensure new detection logic doesn't significantly slow down linting
- [initial] Benchmark against large codebases

---

## Documentation Updates

### Rule Documentation

- [ ] Update `no-insecure-jwt.md` with new detection capabilities
- [ ] Add examples for generic JWT library usage
- [ ] Document the algorithm confusion attack patterns

### Changelog

- [ ] Document all fixes in CHANGELOG.md
- [ ] Highlight breaking changes (if any)
- [ ] Add migration guide for users

### Demo Files

- [ ] Verify all demo files trigger correctly
- [ ] Update demo status report
- [ ] Create before/after examples for each fix

---

## Release Checklist

### Pre-release

- [x] Fix `no-insecure-jwt` rule
- [ ] Fix remaining 3 high-priority rules
- [ ] Run full test suite
- [ ] Update version to 2.2.0
- [ ] Update documentation
- [ ] Run lint on playground demos
- [ ] Generate updated comprehensive report

### Release

- [ ] Create git tag for v2.2.0
- [ ] Run `nx release version minor`
- [ ] Run `nx release publish`
- [ ] Update playground to use new version
- [ ] Verify all fixes work in playground

### Post-release

- [ ] Update GitHub repository
- [ ] Announce release on npm
- [ ] Update project README with new coverage stats
- [ ] Create v2.3.0 planning document for remaining 7 rules

---

## Implementation Notes

### Challenges Encountered

1. **Generic JWT Detection**
   - Original implementation only checked known libraries ('jsonwebtoken', 'jose')
   - Demo files used generic `jwt` identifier
   - Solution: Added `looksLikeJwtOperation()` to detect any `.verify()`, `.decode()`, `.sign()` calls

2. **Cross-Statement Analysis Needed**
   - TOCTOU and buffer bounds checking require analyzing multiple statements
   - Current ESLint visitor pattern works on single nodes
   - Need to implement context tracking between statements

3. **Data Flow Tracking**
   - Several rules need taint analysis (tracking user input flow)
   - Examples: `no-unescaped-url-parameter`, `no-privilege-escalation`
   - May need to integrate with TypeScript type system or implement custom flow analysis

### Technical Debt

1. **False Positive Reduction**
   - Current `safetyChecker` may not catch all safe patterns
   - Need more sophisticated analysis for sanitization detection
   - Consider adding machine learning-based classification

2. **Performance Optimization**
   - Some regex patterns in detection may be expensive
   - Consider caching analysis results
   - Profile hot paths and optimize

3. **Type System Integration**
   - Rules like `no-improper-type-validation` need TypeScript type information
   - Current implementation doesn't leverage type checking
   - Consider using TypeScript compiler API

---

## Resources

- [JWT Best Practices (RFC 8725)](https://tools.ietf.org/html/rfc8725)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [ESLint Custom Rule Documentation](https://eslint.org/docs/latest/developer-guide/working-with-rules)
- [TypeScript AST Viewer](https://astexplorer.net/)

---

_Last Updated: 2025-12-12_  
_Next Review: After completing high-priority fixes_
