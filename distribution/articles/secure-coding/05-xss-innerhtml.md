---
title: "XSS via innerHTML: The Classic That Won't Die"
published: false
description: "innerHTML has been exploited for 20 years. It's still the #1 XSS vector. Here's why and how ESLint prevents it."
tags: javascript, security, frontend, eslint
cover_image:
canonical_url:
---

# XSS via innerHTML: The Classic That Won't Die

Cross-Site Scripting has been a top vulnerability since 2003. Two decades later, `innerHTML` remains the #1 vector.

## The Problem

```javascript
// ❌ User input directly in innerHTML
const userComment = '<img src=x onerror="alert(document.cookie)">';
document.getElementById('comments').innerHTML = userComment;
```

User cookies stolen. Session hijacked. And your security team is not happy.

## Why Developers Still Make This Mistake

| Excuse                     | Reality                                    |
| -------------------------- | ------------------------------------------ |
| "I sanitize on the server" | XSS happens client-side                    |
| "It's just text, not HTML" | Users submit HTML entities                 |
| "React protects me"        | Not when you use `dangerouslySetInnerHTML` |
| "It's an admin panel"      | Admins get phished too                     |

## The Variations

```javascript
// ❌ All of these are XSS vectors
element.innerHTML = userInput;
element.outerHTML = userInput;
document.write(userInput);
element.insertAdjacentHTML('beforeend', userInput);

// ❌ jQuery too
$('#container').html(userInput);
$(userInput).appendTo('#container');

// ❌ React escape hatch
<div dangerouslySetInnerHTML={{ __html: userInput }} />;
```

## The Fix

```javascript
// ✅ Use textContent for text
element.textContent = userInput; // Safe, escapes HTML

// ✅ Use DOMPurify for HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// ✅ Use the DOM API
const text = document.createTextNode(userInput);
element.appendChild(text);

// ✅ React: Just use JSX
<div>{userInput}</div>; // Automatically escaped
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Every innerHTML usage triggers:

```bash
src/comments.tsx
  12:5  error  🔒 CWE-79 OWASP:A03 CVSS:6.1 | XSS risk: unsanitized HTML
               Fix: Use textContent for text, or DOMPurify.sanitize() for HTML
```

## The Full Coverage

The plugin catches ALL XSS vectors:

| Rule                         | Catches                              |
| ---------------------------- | ------------------------------------ |
| `no-unsanitized-html`        | innerHTML, outerHTML, document.write |
| `no-unescaped-url-parameter` | URL params in DOM                    |
| `no-improper-sanitization`   | Incomplete sanitization              |

## Example: Safe Comment System

```javascript
// Before: Vulnerable
function addComment(text) {
  commentsDiv.innerHTML += `<div class="comment">${text}</div>`;
}

// After: Safe
function addComment(text) {
  const div = document.createElement('div');
  div.className = 'comment';
  div.textContent = text;
  commentsDiv.appendChild(div);
}
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Stop XSS at the source. Before it reaches the browser.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-unsanitized-html](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsanitized-html.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
