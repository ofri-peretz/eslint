---
title: prefer-event-target
description: Prefer EventTarget over EventEmitter for isomorphic code
tags: ['architecture', 'modernization']
category: modernization
autofix: suggestions
---

> **Keywords:** EventTarget, EventEmitter, browser, Node.js, events, ESLint rule, LLM-optimized


<!-- @rule-summary -->
Prefer EventTarget over EventEmitter for isomorphic code
<!-- @/rule-summary -->

Prefer `EventTarget` over `EventEmitter` for isomorphic code. This rule is part of [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (compatibility)                                              |
| **Auto-Fix**   | ❌ No (different API)                                                |
| **Category**   | Modernization |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Isomorphic code, browser compatibility                               |

## Rule Details

`EventTarget` is available in both browsers and Node.js (v14.5+), while `EventEmitter` is Node.js-specific.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🌐 **Browser support**    | EventEmitter not in browsers    | Use EventTarget           |
| 📦 **Bundle size**        | Polyfills needed                | Native API                |
| 🔄 **Isomorphic code**    | Different APIs per environment  | Standardize on EventTarget|

## Examples

### ❌ Incorrect

```typescript
import { EventEmitter } from 'events';

class MyEmitter extends EventEmitter {
  emit(event: string) {
    super.emit(event);
  }
}
```

### ✅ Correct

```typescript
class MyEmitter extends EventTarget {
  dispatch(type: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// Usage
const emitter = new MyEmitter();
emitter.addEventListener('change', (e) => console.log(e));
emitter.dispatch('change', { value: 42 });
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'architecture/prefer-event-target': 'warn'
  }
}
```

## Related Rules

- [`no-nodejs-modules`](./no-nodejs-modules.md) - Prevent Node.js imports in browser code

## Further Reading

- **[EventTarget - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)** - MDN reference
- **[Node.js EventTarget](https://nodejs.org/api/events.html#eventtarget-and-event-api)** - Node.js docs
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = externalSource();
processValue(value); // Variable origin not tracked
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.