# prefer-event-target

> **Keywords:** EventTarget, EventEmitter, browser, Node.js, events, ESLint rule, LLM-optimized

Prefer `EventTarget` over `EventEmitter` for isomorphic code. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (compatibility)                                              |
| **Auto-Fix**   | ❌ No (different API)                                                |
| **Category**   | Architecture                                                         |
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
    '@forge-js/prefer-event-target': 'warn'
  }
}
```

## Related Rules

- [`no-nodejs-modules`](./no-nodejs-modules.md) - Prevent Node.js imports in browser code

## Further Reading

- **[EventTarget - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)** - MDN reference
- **[Node.js EventTarget](https://nodejs.org/api/events.html#eventtarget-and-event-api)** - Node.js docs

