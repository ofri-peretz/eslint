---
title: 'Why Senior Engineers Still Write Insecure Code (And How to Stop It)'
published: false
description: 'Even your best engineers make security mistakes. The problem is not talent—it is cognitive load. Here is how to fix it with automation.'
tags: security, engineering, leadership, productivity
cover_image:
series: Engineering Leadership
---

# Why Senior Engineers Still Write Insecure Code (And How to Stop It)

I've seen it happen in almost every team I've managed.

A Principal Engineer, someone with 10+ years of experience, pushes a feature. It's architecturally brilliant, scalable, and clean. And hidden deep in a utility function, there's a regex that is vulnerable to ReDoS.

Why? Are they bad engineers? No. They are **human**.

## The Cognitive Load Problem

"Secure Coding" is not a skill you learn once. It's a massive, constantly shifting database of "Don't Do This" rules.

- Don't use `innerHTML`.
- Don't use `target="_blank"` without `rel="noopener"`.
- Don't use `AES` in ECB mode.
- Don't use `localStorage` for sensitive tokens.

Asking a developer to keep the entire **OWASP Application Security Verification Standard (ASVS)** in their working memory while also solving complex business logic is a recipe for failure.

## Offloading "Rote" Security

In high-performing organizations, we practice **Cognitive Offloading**. We take the things that require memorization and move them into the infrastructure.

If a machine can detect it, a human shouldn't have to think about it.

This is the difference between tools:

- **`eslint-plugin-no-unsanitized`**: Good, but only catches XSS
- **`eslint-plugin-security`**: Catches Node.js hotspots, misses modern frontend patterns
- **`eslint-plugin-secure-coding`**: Offloads **89 distinct vulnerability classes** across the entire stack

## The Punch Line: Free Your Brain

By installing comprehensive security linting, you are effectively hiring a full-time Security Researcher to pair-program with every engineer on your team.

It sits in the background, silent until it matters. And when it speaks, it doesn't just block; it teaches:

- "Hey, this regex can loop infinitely."
- "Hey, this specific Electron configuration allows remote code execution."

This reduces the "Security Tax" on your Senior Engineers. They stop worrying about the trivialities of syntax security and focus on what you pay them for: **System Design and Architecture**.

Security is important. Too important to rely on your memory.

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **How does your team handle the cognitive load of security? Share your strategies!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
