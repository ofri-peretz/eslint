---
title: 'Stop Wasting My Time on "Syntax Security"'
published: false
description: 'Asking "did you sanitize that?" in a PR comment is a failure of process. Here is how to elevate code review culture with automation.'
tags: codereview, engineering, productivity, security
cover_image:
series: Engineering Leadership
---

# Stop Wasting My Time on "Syntax Security"

There is nothing more demoralizing for a Senior Engineer than having their Pull Request rejected because of a minor syntax nitpick.

And there is nothing more dangerous for a team than a Code Review that focuses _only_ on syntax nitpicks.

## The Bike-Shedding Trap

When we review code, our brains gravitate towards the easy problems.

- "You missed a semicolon." (Easy)
- "This variable name is weird." (Easy)
- "This architectural pattern will cause a deadlock in high-concurrency scenarios." (**Hard**)

If your Code Review culture focuses on the easy stuff, you will miss the hard stuff. And security often falls into the "easy to miss, hard to fix" category.

## "Did you sanitize that?"

Asking "did you sanitize that input?" in a PR comment is a failure of process. It means:

1. The developer didn't know they had to.
2. The tooling allowed them to commit it.
3. You are now acting as a human linter.

**You are too expensive to be a human linter.**

## Elevating the Conversation

I insist on using strict security linters not just for "security," but for **culture**.

When the linter catches the missing CSRF token _before_ the PR is opened, the PR conversation changes.

- **Before**: "Please add a CSRF token here." → "Done."
- **After**: "I see the linter forced a CSRF token. How does this impact our stateless API design? Should we reconsider the auth strategy?"

## The Punch Line

Great teams automate the trivial so they can debate the critical.

By offloading the entire dictionary of "Security Nitpicks" (89+ rules covering OWASP, Regex, Crypto) to a machine, you clear the noise. You allow your humans to start acting like Architects instead of spell-checkers.

Trust the machine to catch the `CWE-89`. Trust your team to build the future.

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **What's the most bikesheddy PR comment you've ever received? Share below!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
