# The Dev-Sec Friction Problem (And How to Eliminate It)

_By Ofri Peretz_

---

I've been on both sides. As a developer, I dreaded the security review. As a lead, I watched my team waste cycles fixing issues that should have been caught in the IDE.

The problem isn't people. It's timing. And the fix? A linter that catches security issues the moment you write them.

## Security as a Gate vs. Security as a Guardrail

The traditional model: Developers ship code. Security reviews it. Security finds issues. Developers resent the rework. Repeat.

This creates friction because:

- **Security finds problems late**, when fixing them is expensive
- **Developers feel ambushed** by issues they didn't know existed
- **Both sides blame each other** for the schedule slip

Sound familiar? I've seen teams lose entire sprints to this cycle.

## The Guardrail Model

What if security feedback happened at the moment of writing, not weeks later?

That's the core idea behind [eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) — a security linter with 89+ rules covering CWE, OWASP, and CVSS classifications. The red squiggly line appears _before_ the commit. The developer sees:

```bash
🔒 CWE-798 OWASP:A07-Auth-Failures CVSS:7.5 | Hardcoded API key detected | HIGH
   Fix: Move to environment variable: process.env.STRIPE_API_KEY
```

No ticket. No meeting. No blame. Just a fix.

After implementing this pattern on a team of 12 developers, we reduced security-related rework by approximately 60% and cut our average PR review cycle from 3 days to under 24 hours.

## The Culture Shift

When you move security left, three things happen:

1. **Developers learn faster** — Real-time feedback beats quarterly training every time. When a developer sees the same error pattern three times in a week, they internalize the lesson. No slide deck required.

2. **Security becomes less adversarial** — Your security team stops being the "no" team that blocks releases. Instead, they become architects who design the rules and guardrails that enable safe, fast shipping.

3. **Velocity increases** — No more surprise rework before release. Every security issue caught in the IDE is an issue that won't block your deployment in week 6 of a 6-week sprint.

## The Implementation: 10 Minutes

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended,
  {
    files: ['services/auth/**', 'services/payments/**'],
    ...secureCoding.configs.strict,
  },
];
```

Now your CI blocks insecure code automatically. Your security team reviews the _configuration_, not every pull request.

## Bonus: Let AI Handle the Fixes

The structured error messages are designed for AI coding assistants like Cursor and Copilot. When a developer sees the error, they can accept an AI-suggested fix in one keystroke.

Security + Developer Experience = Everyone wins.

## The Punch Line: Stop Fighting, Start Shipping

The goal isn't to eliminate the security team. It's to free them from being code reviewers so they can focus on architecture, threat modeling, and the work that actually requires expertise.

Your linter can catch hardcoded secrets. Your security team should be designing your authentication system.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: DevSecOps, Shift Left, Security Culture, Engineering Management, Developer Experience, CI/CD
