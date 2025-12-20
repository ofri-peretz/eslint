# From 600 SonarQube Alerts to 12 Actionable Ones

_By Ofri Peretz_

---

You open your SAST dashboard. 600 security alerts. Your heart sinks.

You click the first one. False positive. The second one. Also false. By the tenth, you stop clicking.

This is **alert fatigue**, and it's why most security tools fail.

## The Real Cost of False Positives

When developers learn that 90% of alerts are noise, they stop trusting the tool. They disable rules. They add `// eslint-disable-next-line` everywhere. Your "security tool" becomes a badge of compliance, not an actual defense.

## Why Traditional SAST Tools Fail

Most static analysis tools flag patterns like:

```javascript
const query = 'SELECT * FROM users WHERE id = ' + userId;
```

Good catch! But they also flag:

```javascript
const query = `SELECT * FROM ${tableName}`; // tableName is a hardcoded constant
const safeQuery = sanitize(userInput); // Already sanitized
const ormResult = User.findOne({ id }); // ORM handles parameterization
```

False positives everywhere.

## Feature-Based Detection: A Different Approach

[eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) uses **feature-based detection** with:

- **Sanitizer awareness** — Recognizes common sanitization functions
- **ORM pattern detection** — Knows that Prisma, Sequelize, and TypeORM are safe
- **Annotation support** — Respects `// secure-coding-ignore` when you've verified manually
- **Safe library detection** — Tracks known-safe packages

The result? Fewer, higher-quality alerts.

## The Practical Difference

Before: 600 alerts, 540 false positives, team ignores everything.

After: 12 alerts, 11 real issues, team fixes them same day.

## How to Set Up Low-Noise Security

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

The `recommended` preset is tuned for low false-positive rates. For critical paths, use `strict`:

```javascript
{
  files: ['services/auth/**'],
  ...secureCoding.configs.strict
}
```

## The Punch Line: Quality Over Quantity

A security tool is only useful if developers trust it. Trust comes from accuracy.

When every alert is real, developers fix them. When most alerts are noise, they tune you out.

Choose your tools wisely. Choose the ones your team will actually use.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: SAST, Alert Fatigue, False Positives, Developer Productivity, Code Quality, Security Tools
