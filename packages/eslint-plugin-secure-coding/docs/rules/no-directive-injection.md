# no-directive-injection

> **Keywords:** directive injection, CWE-94, template injection, Angular, Vue, React, SSTI, XSS

Detects directive injection vulnerabilities in template systems. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-94 (Code Injection), CWE-96 (SSTI) |
| **Severity** | High (CVSS 8.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Injection Prevention |

## Rule Details

Directive injection occurs when user input is used to inject malicious directives into template systems (Angular, Vue, React, etc.). Attackers can:
- Execute arbitrary JavaScript code
- Manipulate the DOM and steal user data
- Perform cross-site scripting (XSS) attacks
- Bypass Content Security Policy (CSP)

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 💻 **Code Execution** | Full application compromise | Use static directives |
| 🎭 **XSS** | User session hijacking | Sanitize template input |
| 🔓 **CSP Bypass** | Security control evasion | Validate directive names |

## Examples

### ❌ Incorrect

```typescript
// Dynamic directive name from user input
const directive = userInput;
<div {...{[directive]: value}} />

// Template injection in Angular
const template = `<div ${userControlledDirective}>Content</div>`;
this.compile(template);

// dangerouslySetInnerHTML with user content
<div dangerouslySetInnerHTML={{__html: userHtml}} />

// Vue v-html with untrusted content
<div v-html="userContent"></div>
```

### ✅ Correct

```typescript
// Use hardcoded directive names
<div onClick={handleClick} />

// Sanitize HTML before rendering
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userHtml)}} />

// Use trusted templates only
const template = trustedTemplates[templateId];
this.compile(template);

// Validate directive names against whitelist
const allowedDirectives = ['onClick', 'onChange', 'onSubmit'];
if (allowedDirectives.includes(directive)) {
  <div {...{[directive]: value}} />
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-directive-injection': ['error', {
      trustedDirectives: ['onClick', 'onChange', 'onSubmit'],
      frameworks: ['react', 'angular', 'vue'],
      allowDynamicInComponents: false
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trustedDirectives` | `string[]` | `[]` | Allowed directive names |
| `userInputVariables` | `string[]` | `['req', 'request', 'input']` | User input variable patterns |
| `frameworks` | `string[]` | `['react', 'angular', 'vue']` | Frameworks to check |
| `allowDynamicInComponents` | `boolean` | `false` | Allow dynamic directives in safe contexts |

## Error Message Format

```
🔒 CWE-94 OWASP:A03-Injection CVSS:8.8 | Directive Injection detected | HIGH [SOC2,PCI-DSS]
   Fix: Use hardcoded directive names or validate against whitelist | https://cwe.mitre.org/...
```

## Further Reading

- **[Angular Security](https://angular.io/guide/security)** - Angular security best practices
- **[React XSS Prevention](https://reactjs.org/docs/introducing-jsx.html#jsx-prevents-injection-attacks)** - React security
- **[CWE-94](https://cwe.mitre.org/data/definitions/94.html)** - Code injection documentation

## Related Rules

- [`no-unsanitized-html`](./no-unsanitized-html.md) - XSS via innerHTML
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection via eval

