# How to Secure Your Node.js Backend in Under 5 Minutes

_By Ofri Peretz_

---

You don't need a security degree. You don't need to read the entire OWASP guide. You need 5 minutes and a terminal.

## The Setup (2 Minutes)

```bash
npm install --save-dev eslint eslint-plugin-secure-coding
```

## The Configuration (1 Minute)

Create `eslint.config.js`:

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

That's it. You now have 89 security rules protecting your codebase.

## The First Scan (2 Minutes)

```bash
npx eslint .
```

You'll see output like:

```bash
src/api/users.ts
  42:15  error  🔒 CWE-89 | SQL Injection detected | CRITICAL
                   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])

src/auth/login.ts
  18:5   error  🔒 CWE-798 | Hardcoded API key detected | HIGH
                   Fix: Move to environment variable: process.env.API_KEY
```

## What You Just Got

With three lines of configuration, you now detect:

| Category      | Protection                                          |
| ------------- | --------------------------------------------------- |
| **Injection** | SQL, NoSQL, Command, XPath, LDAP, GraphQL           |
| **Crypto**    | Weak algorithms, hardcoded secrets, timing attacks  |
| **Auth**      | Missing checks, privilege escalation, weak recovery |
| **XSS**       | innerHTML, URL params, template injection           |
| **Headers**   | CORS, CSP, clickjacking, security headers           |

## Level Up: Block Bad Code in CI

Add to your `package.json`:

```json
{
  "scripts": {
    "lint:security": "eslint . --max-warnings=0"
  }
}
```

Add to your GitHub Actions:

```yaml
- name: Security Lint
  run: npm run lint:security
```

Now insecure code cannot merge.

## Bonus: Let AI Fix It

The error messages are structured for AI assistants. In Cursor, Copilot, or Windsurf, just accept the suggested fix.

## The Punch Line: No Excuses

Security used to be hard. It used to require specialists. It used to slow you down.

Now it's 5 minutes and a config file.

The only question is: why haven't you done it yet?

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: Node.js, Security, Quick Start, Backend, ESLint, OWASP, Tutorial
