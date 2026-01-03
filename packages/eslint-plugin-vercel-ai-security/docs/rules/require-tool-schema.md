# `require-tool-schema`

> Ensures all AI tools have Zod schema validation for input parameters.

## 📊 Rule Details

| Property           | Value                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                          |
| **Severity**       | 🟡 HIGH                                                                             |
| **OWASP Agentic**  | [ASI02: Tool Misuse & Exploitation](https://owasp.org)                              |
| **CWE**            | [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html) |
| **CVSS**           | 7.0                                                                                 |
| **Config Default** | `warn` (recommended), `error` (strict)                                              |

## 🔍 What This Rule Detects

This rule identifies AI tools that lack input schema validation. Without schema validation, AI models can pass arbitrary data to tool execute functions, enabling exploitation.

## ❌ Incorrect Code

```typescript
// No schema
const tools = {
  weather: {
    execute: async (params) => getWeather(params.location),
  },
};

// Missing inputSchema in tool() helper
const myTool = tool({
  description: 'Get weather',
  execute: async (params) => getWeather(params.location),
});
```

## ✅ Correct Code

```typescript
// With inputSchema
const tools = {
  weather: {
    inputSchema: z.object({
      location: z.string().max(100),
    }),
    execute: async ({ location }) => getWeather(location),
  },
};

// Using tool() helper with schema
const weatherTool = tool({
  description: 'Get weather',
  inputSchema: z.object({
    location: z.string().max(100),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, unit }) => getWeather(location, unit),
});
```

## ⚙️ Options

| Option                | Type       | Default                                   | Description                                |
| --------------------- | ---------- | ----------------------------------------- | ------------------------------------------ |
| `schemaPropertyNames` | `string[]` | `['inputSchema', 'parameters', 'schema']` | Property names considered as valid schemas |

## 🛡️ Why This Matters

Without input validation, AI agents can:

- **Pass malicious data** - Inject SQL, paths, or commands
- **Bypass business logic** - Skip validation rules
- **Cause DoS** - Pass extremely large or nested data
- **Exploit type confusion** - Pass unexpected data types

## 🔗 Related Rules

- [`require-tool-confirmation`](./require-tool-confirmation.md) - Require confirmation for destructive tools
- [`require-output-filtering`](./require-output-filtering.md) - Filter tool output

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Schema from Variable

**Why**: Schema stored in variables is not analyzed.

```typescript
// ❌ NOT DETECTED - Schema from variable
const schema = z.object({ location: z.string() });
const tools = { weather: { inputSchema: schema, execute: fn } };
```

**Mitigation**: Define schemas inline in tool definitions.

### Dynamic Tool Definitions

**Why**: Dynamically created tools are not checked.

```typescript
// ❌ NOT DETECTED - Dynamic tool creation
const tools = createTools(toolConfigs); // May not have schemas
```

**Mitigation**: Apply rule to tool factory functions.

### Weak Schema Validation

**Why**: Schema quality is not assessed.

```typescript
// ❌ NOT DETECTED - Overly permissive schema
const tools = {
  execute: {
    inputSchema: z.object({}).passthrough(), // Allows any extra fields!
    execute: fn,
  },
};
```

**Mitigation**: Use strict schemas. Avoid `.passthrough()`.

### Tool Helper Wrappers

**Why**: Custom tool helpers may not be recognized.

```typescript
// ❌ NOT DETECTED - Custom helper
const weatherTool = createTool({
  name: 'weather',
  handler: getWeather, // No schema visible
});
```

**Mitigation**: Configure `schemaPropertyNames` for custom helpers.

## 📚 References

- [OWASP ASI02: Tool Misuse & Exploitation](https://owasp.org)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [Vercel AI SDK Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools)
