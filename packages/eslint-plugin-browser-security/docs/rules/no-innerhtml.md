# no-innerhtml

> **Keywords:** XSS, innerHTML, outerHTML, CWE-79, security, DOM manipulation, sanitization, DOMPurify

Detects dangerous innerHTML/outerHTML assignments that can lead to Cross-Site Scripting (XSS). This rule is part of [`eslint-plugin-frontend-security`](https://www.npmjs.com/package/eslint-plugin-frontend-security).

⚠️ This rule **_errors_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                            |
| ----------------- | -------------------------------------------------- |
| **CWE Reference** | CWE-79 (Cross-site Scripting)                      |
| **Severity**      | 🔴 Critical                                        |
| **Auto-Fix**      | ✅ Yes (suggests DOMPurify)                        |
| **Category**      | Security                                           |
| **Best For**      | Frontend apps, React/Vue/Angular, DOM manipulation |

## Vulnerability and Risk

**Vulnerability:** Assigning unsanitized user input to `innerHTML` or `outerHTML` allows attackers to inject malicious scripts.

**Risk:** XSS attacks can:

- Steal session cookies and authentication tokens
- Perform actions as the victim user
- Redirect to phishing sites
- Install keyloggers

## How XSS via innerHTML Works

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569'
  }
}}%%
sequenceDiagram
    participant Attacker
    participant Victim
    participant App
    participant AttackerServer

    Attacker->>App: Submit malicious input<br/>&lt;script&gt;steal(cookies)&lt;/script&gt;
    App->>App: Store input without sanitization
    Victim->>App: View page with malicious content
    App->>Victim: element.innerHTML = userInput
    Victim->>Victim: Browser executes injected script
    Victim->>AttackerServer: Session cookie stolen!

    Note over Attacker,AttackerServer: Attacker now has victim's session
```

## Examples

### ❌ Incorrect

```javascript
// Direct assignment of user input - CRITICAL XSS
element.innerHTML = userInput;

// Template literal with user data - VULNERABLE
element.innerHTML = `<div>${userData.name}</div>`;

// Function result without sanitization - VULNERABLE
element.innerHTML = getUserContent();
element.outerHTML = fetchedData;

// React dangerouslySetInnerHTML (different rule, same concept)
<div dangerouslySetInnerHTML={{ __html: userContent }} />;
```

### ✅ Correct

```javascript
// Use textContent for text - SAFE
element.textContent = userInput;

// Sanitize with DOMPurify - SAFE
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// Literal strings are safe
element.innerHTML = '<p>Static content</p>';

// Create elements programmatically - SAFE
const div = document.createElement('div');
div.textContent = userInput;
container.appendChild(div);
```

## Options

| Option                | Type       | Default                                                               | Description                          |
| --------------------- | ---------- | --------------------------------------------------------------------- | ------------------------------------ |
| `allowInTests`        | `boolean`  | `false`                                                               | Allow innerHTML in test files        |
| `trustedSanitizers`   | `string[]` | `['DOMPurify.sanitize', 'sanitize', 'sanitizeHtml', 'xss', 'purify']` | Trusted sanitizer function names     |
| `allowLiteralStrings` | `boolean`  | `true`                                                                | Allow innerHTML with literal strings |

```json
{
  "rules": {
    "frontend-security/no-innerhtml": [
      "error",
      {
        "trustedSanitizers": ["DOMPurify.sanitize", "myCustomSanitizer"],
        "allowLiteralStrings": true
      }
    ]
  }
}
```

## Best Practices

### 1. Use DOMPurify

```javascript
import DOMPurify from 'dompurify';

function renderUserContent(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

element.innerHTML = renderUserContent(userInput);
```

### 2. Prefer textContent

```javascript
// For plain text, always use textContent
element.textContent = userData.name; // Safe - no HTML parsing
```

### 3. Use DOM APIs

```javascript
// Build DOM programmatically
function createComment(user, text) {
  const div = document.createElement('div');
  div.className = 'comment';

  const author = document.createElement('span');
  author.textContent = user.name; // Safe

  const content = document.createElement('p');
  content.textContent = text; // Safe

  div.appendChild(author);
  div.appendChild(content);
  return div;
}
```

## Related Rules

- [`no-eval`](./no-eval.md) - Detects dangerous eval usage
- [`no-sensitive-localstorage`](./no-sensitive-localstorage.md) - Detects sensitive data in localStorage

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Content from Variable

**Why**: Content assigned to variables is not traced.

```typescript
// ❌ NOT DETECTED - Content from variable
const html = userInput;
element.innerHTML = html;
```

**Mitigation**: Always sanitize before assignment to any variable.

### Custom Sanitizer Not Recognized

**Why**: Non-standard sanitizer names may not be detected.

```typescript
// ❌ NOT DETECTED - Custom sanitizer
element.innerHTML = myCustomEscape(userInput);
```

**Mitigation**: Configure `trustedSanitizers` with custom function names.

### Framework Bindings

**Why**: Framework-specific binding may not be recognized.

```typescript
// ❌ NOT DETECTED - jQuery html()
$element.html(userInput);

// ❌ NOT DETECTED - Angular [innerHTML]
<div [innerHTML]="userContent"></div>
```

**Mitigation**: Use framework-specific security rules.

### Dynamic Property Assignment

**Why**: Dynamic property access is not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic property
const prop = 'innerHTML';
element[prop] = userInput;
```

**Mitigation**: Avoid dynamic property assignment for DOM manipulation.

## Resources

- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
