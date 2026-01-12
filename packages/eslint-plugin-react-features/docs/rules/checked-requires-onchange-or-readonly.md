# checked-requires-onchange-or-readonly

> **Keywords:** React, controlled input, checkbox, radio, onChange, readOnly, form handling, ESLint rule, LLM-optimized
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

Ensures controlled inputs with `checked` or `value` props have an `onChange` handler or `readOnly` attribute. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (React best practice)                                        |
| **Auto-Fix**   | ❌ No (requires handler implementation)                              |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React form handling, controlled components                           |

## Rule Details

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
flowchart TD
    A[🔍 Check input/textarea/select] --> B{Has checked or value?}
    B -->|❌ No| C[✅ Pass]
    B -->|✅ Yes| D{Has onChange?}
    D -->|✅ Yes| C
    D -->|❌ No| E{Has readOnly?}
    E -->|✅ Yes| C
    E -->|❌ No| F[⚠️ Report: Missing handler]
    
    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    classDef processNode fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1f2937
    
    class A startNode
    class F errorNode
    class C processNode
```

### Why This Matters

| Issue                   | Impact                          | Solution                       |
| ----------------------- | ------------------------------- | ------------------------------ |
| 🚫 **Uncontrolled**     | User can't interact with input  | Add onChange handler           |
| ⚠️ **React Warning**    | Console warnings in development | Properly handle controlled state |
| 🐛 **Silent Failures**  | Form doesn't work as expected   | Use readOnly for display-only  |
| 📋 **State Sync**       | State and UI out of sync        | Implement proper handlers      |

## Examples

### ❌ Incorrect

```jsx
// Missing onChange - user can't toggle checkbox
<input type="checkbox" checked={isChecked} />

// Missing onChange - user can't type
<input type="text" value={name} />

// Missing handler on textarea
<textarea value={description} />

// Select without handler
<select value={selectedOption}>
  <option value="a">A</option>
</select>
```

### ✅ Correct

```jsx
// With onChange handler
<input 
  type="checkbox" 
  checked={isChecked} 
  onChange={(e) => setIsChecked(e.target.checked)} 
/>

// With onChange for text input
<input 
  type="text" 
  value={name} 
  onChange={(e) => setName(e.target.value)} 
/>

// With readOnly for display-only
<input type="text" value={displayValue} readOnly />

// Properly controlled textarea
<textarea 
  value={description} 
  onChange={(e) => setDescription(e.target.value)} 
/>

// Using onInput as alternative
<input 
  type="text" 
  value={search} 
  onInput={(e) => setSearch(e.target.value)} 
/>
```

## Configuration

```javascript
{
  rules: {
    'react-features/checked-requires-onchange-or-readonly': 'error'
  }
}
```

## When to Use readOnly

| Scenario                       | Use `readOnly` | Use `onChange`  |
| ------------------------------ | -------------- | --------------- |
| Display calculated values      | ✅             | ❌              |
| Show server-provided data      | ✅             | ❌              |
| User-editable forms            | ❌             | ✅              |
| Toggle checkboxes              | ❌             | ✅              |

## Related Rules

- [`jsx-no-bind`](./jsx-no-bind.md) - Prevent binding in JSX props
- [`no-direct-mutation-state`](./no-direct-mutation-state.md) - Prevent direct state mutation

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

- **[Controlled Components](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable)** - React documentation
- **[Forms in React](https://react.dev/learn/responding-to-events)** - React forms guide
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration
