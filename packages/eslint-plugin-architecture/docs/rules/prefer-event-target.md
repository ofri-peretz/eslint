# prefer-event-target

> **Keywords:** EventTarget, EventEmitter, browser, Node.js, events, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prefer `EventTarget` over `EventEmitter` for isomorphic code. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/prefer-event-target': 'warn'
  }
}
```

## Related Rules

- [`no-nodejs-modules`](./no-nodejs-modules.md) - Prevent Node.js imports in browser code

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[EventTarget - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)** - MDN reference
- **[Node.js EventTarget](https://nodejs.org/api/events.html#eventtarget-and-event-api)** - Node.js docs

