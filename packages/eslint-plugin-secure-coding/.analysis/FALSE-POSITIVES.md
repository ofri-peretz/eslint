# False Positive Improvements

This document tracks false positive patterns in `eslint-plugin-secure-coding` and their resolution status.

## Fixed False Positives ✅

### 1. `detect-non-literal-regexp` (CWE-400) - FIXED

**Previous Issue:** Flagged all regex literals and `new RegExp("literal")` as potential ReDoS.

**Fix Applied:**

- Now only flags:
  1. Dynamic `new RegExp(variable)` with variables
  2. Regex literals with truly dangerous nested quantifier patterns like `/(a+)+/`
- Static string patterns to `new RegExp("literal")` are no longer flagged
- Template literals without expressions are also safe

**Example - Now Valid:**

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}$/i; // ✅ Safe
const pattern = new RegExp('^[a-z]+$'); // ✅ Safe
```

**Still Flags:**

```typescript
new RegExp(userInput); // ❌ Flagged: dynamic variable
const evil = /(a+)+b/; // ❌ Flagged: nested quantifier
```

---

### 2. `no-clickjacking` (CWE-1021) - FIXED

**Previous Issue:** Triggered on every file without frame-busting code, even library files.

**Fix Applied:**

- Now only checks files that look like entry points:
  - `*.html`, `*.htm`
  - `index.tsx`, `app.tsx`, `main.tsx`, `page.tsx`
  - Files in `pages/` directory
  - `layout.tsx`

**Example - Now Valid:**

```typescript
// utils/math.ts - not an entry point
export function add(a: number, b: number) {
  return a + b; // ✅ No longer flagged
}
```

---

### 3. `no-missing-authentication` (CWE-287) - FIXED

**Previous Issue:** Triggered on any `.get(id)` call, including database queries.

**Fix Applied:**

- Now only checks Express/Fastify/Koa router patterns
- Callee object must look like a router: `app`, `router`, `server`, `express`, `fastify`, `koa`, `hapi`

**Example - Now Valid:**

```typescript
// Database query - not a route handler
stmt.get(userId); // ✅ No longer flagged
db.users.findOne(id); // ✅ No longer flagged
```

**Still Flags:**

```typescript
app.get('/users', handler); // ❌ Flagged: no auth
router.post('/login', handler); // ❌ Flagged: no auth
```

---

### 4. `no-weak-password-recovery` (CWE-640) - FIXED

**Previous Issue:** Triggered on any variable with "token" in the name.

**Fix Applied:**

- Now requires password-recovery-specific context:
  - Keywords: `password`, `forgot`, `reset`, `recovery`
  - Patterns: `resetpassword`, `passwordreset`, `forgotpassword`, `passwordrecovery`

**Example - Now Valid:**

```typescript
const token = crypto.randomBytes(32); // ✅ Not flagged
const authToken = jwt.sign({}, secret); // ✅ Not flagged
```

**Still Flags:**

```typescript
const resetToken = Date.now(); // ❌ Flagged: predictable
const passwordResetToken = Math.random(); // ❌ Flagged: weak entropy
```

---

## Remaining Work 🔄

### 5. `no-sql-injection` (CWE-89) - LOW PRIORITY

**Issue:** Triggers on template literals in non-SQL contexts.

**Status:** Could be improved but current impact is low. Use `eslint-disable` for specific lines.

---

### 6. `no-zip-slip` (CWE-22) - LOW PRIORITY

**Issue:** Triggers on static `/etc/` paths even when not from user input.

**Status:** Could be improved but current impact is low. Use `eslint-disable` for specific lines.

---

## Testing Valid Patterns

To verify no false positives:

```bash
cd playground/apps/demo-secure-coding-app
npx eslint src/valid-examples/secure-patterns.ts
```

Expected: 0 errors (including 0 secure-coding errors)

---

## Version

- **Last Updated:** 2023-12-13
- **Rules Fixed:** 4/6
- **Tests Passing:** 1627/1627
