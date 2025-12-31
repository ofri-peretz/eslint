---
title: 'Helmet is Not Enough: 7 Express Security Rules You Are Missing'
published: false
description: 'You added Helmet. Great. Here are 7 more security gaps in your Express app that ESLint can catch.'
tags: express, nodejs, security, eslint
cover_image:
series: Express Security
---

# Helmet is Not Enough: 7 Express Security Rules You're Missing

You added Helmet to your Express app. Security checkbox: done. ✅

**Right?**

Wrong. Helmet handles headers. Here are 7 security gaps it doesn't cover.

## Gap #1: Missing Body Parser Limits

```javascript
// ❌ No limits = DoS vulnerability
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

Attacker sends a 500MB JSON body. Your server OOMs.

```javascript
// ✅ With limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

## Gap #2: Missing Rate Limiting

```javascript
// ❌ No rate limiting
app.post('/login', async (req, res) => {
  // Attacker tries 10,000 passwords/second
});
```

```javascript
// ✅ With rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
});

app.post('/login', loginLimiter, async (req, res) => {
  // Now limited to 5 attempts per 15 minutes
});
```

## Gap #3: CORS Credentials with Wildcard

```javascript
// ❌ Dangerous: Any origin can send credentials
app.use(
  cors({
    origin: '*',
    credentials: true, // 💀
  }),
);
```

```javascript
// ✅ Specific origins for credentials
app.use(
  cors({
    origin: ['https://app.example.com'],
    credentials: true,
  }),
);
```

## Gap #4: Insecure Cookie Options

```javascript
// ❌ Missing security flags
res.cookie('session', token);
```

```javascript
// ✅ Secure cookie settings
res.cookie('session', token, {
  httpOnly: true, // No JavaScript access
  secure: true, // HTTPS only
  sameSite: 'strict', // No CSRF
  maxAge: 3600000, // 1 hour
});
```

## Gap #5: Missing CSRF Protection

```javascript
// ❌ No CSRF protection on state-changing routes
app.post('/transfer', (req, res) => {
  transferMoney(req.body);
});
```

```javascript
// ✅ With CSRF protection
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

app.post('/transfer', csrfProtection, (req, res) => {
  transferMoney(req.body);
});
```

## Gap #6: Regex DoS in Routes

```javascript
// ❌ Catastrophic backtracking
app.get(/^\/user\/(\w+)+$/, (req, res) => {
  // /user/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa! takes forever
});
```

```javascript
// ✅ Safe pattern
app.get('/user/:id([a-zA-Z0-9]+)', (req, res) => {
  // Linear time matching
});
```

## Gap #7: GraphQL Introspection in Production

```javascript
// ❌ Schema exposed in production
const server = new ApolloServer({
  schema,
  introspection: true, // Attackers can see entire API
});
```

```javascript
// ✅ Disable in production
const server = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
});
```

## ESLint Catches All 7

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [expressSecurity.configs.recommended];
```

### 9 Express Security Rules

| Rule                                  | CWE      | Gap                   |
| ------------------------------------- | -------- | --------------------- |
| `require-express-body-parser-limits`  | CWE-400  | DoS via large body    |
| `require-rate-limiting`               | CWE-307  | Brute force attacks   |
| `no-cors-credentials-wildcard`        | CWE-346  | CORS misconfiguration |
| `no-insecure-cookie-options`          | CWE-614  | Cookie theft          |
| `require-csrf-protection`             | CWE-352  | CSRF attacks          |
| `no-express-unsafe-regex-route`       | CWE-1333 | ReDoS                 |
| `no-graphql-introspection-production` | CWE-200  | API exposure          |
| `require-helmet`                      | CWE-693  | Missing headers       |
| `no-permissive-cors`                  | CWE-942  | Wide CORS             |

## Error Messages

```bash
src/app.ts
  12:5  error  🔒 CWE-400 | express.json() missing body limit
               Risk: Large payload DoS attacks
               Fix: Add { limit: '10kb' } option

  25:5  error  🔒 CWE-614 | Cookie missing secure options
               Risk: Session hijacking via XSS or network interception
               Fix: Add { httpOnly: true, secure: true, sameSite: 'strict' }
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-express-security %}
📦 npm install eslint-plugin-express-security
{% endcta %}

```javascript
import expressSecurity from 'eslint-plugin-express-security';
export default [expressSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-express-security](https://www.npmjs.com/package/eslint-plugin-express-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-express-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Which of these gaps do you have? Run the linter and find out!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
