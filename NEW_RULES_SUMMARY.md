# New LLM-Optimized Rules - Summary

## 🎉 Successfully Implemented

### 1. Enhanced no-console-log Rule

**New Features:**

- **Auto-detect Logger**: Automatically finds logger imports in your file (e.g., `import logger from './logger'`)
- **Severity Mapping**: Map console methods to logger methods

**Configuration Example:**

```typescript
{
  rules: {
    '@forge-js/llm-optimized/no-console-log': ['error', {
      strategy: 'convert',
      customLogger: 'logger', // Fallback if not auto-detected
      autoDetectLogger: true, // Default: true
      severityMap: {
        'log': 'info',
        'debug': 'verbose',
        'error': 'error',
        'warn': 'warn',
        'info': 'info'
      }
    }]
  }
}
```

**What It Does:**

- Scans file for logger imports (`import logger`, `const logger = require()`)
- Uses detected logger or falls back to `customLogger`
- Converts `console.log()` → `logger.info()` based on severity map
- Converts `console.debug()` → `logger.verbose()` based on severity map
- LLM gets full context: detected logger + mapping info

**Example Output:**

```
⚠️ console.log | file.ts:42 | Strategy: convert | Logger: logger | log → info
```

### 2. New react/required-attributes Rule

**Purpose:** Enforce required attributes on React components with per-attribute ignore lists.

**Configuration Example:**

```typescript
{
  rules: {
    '@forge-js/llm-optimized/react/required-attributes': ['error', {
      attributes: [
        {
          attribute: 'data-testid',
          ignoreTags: ['Typography', 'Box', 'Divider'], // Don't require for these
          suggestedValue: 'auto-generated-from-component-name'
        },
        {
          attribute: 'aria-label',
          ignoreTags: ['div', 'span'], // Only require for interactive elements
          message: 'Required for screen reader accessibility'
        },
        {
          attribute: 'tabIndex',
          ignoreTags: ['button', 'a', 'input'], // Already focusable
          suggestedValue: '0'
        }
      ],
      ignoreComponents: ['Fragment', 'React.Fragment'] // Global ignore list
    }]
  }
}
```

**Features:**

- Per-attribute ignore lists
- Auto-generated suggested values (e.g., `data-testid="button"` from `<Button>`)
- LLM context includes:
  - Purpose (testing, accessibility, navigation)
  - Impact analysis
  - How to ignore this rule for specific cases
  - Links to relevant docs

**Example Output:**

```
♿ Missing required attribute: data-testid | Element: Button | Purpose: Testing & QA automation

LLM Context:
- Impact: Tests cannot reliably select this element
- Quick Fix: Add data-testid="button"
- To Ignore: Add "Button" to ignoreTags for data-testid
```

## 🎯 Use Cases

### Use Case 1: Team migrating from console to logger

```typescript
// Before:
console.log('User logged in');
console.debug('Request details:', data);
console.error('Failed to fetch');

// After auto-fix:
logger.info('User logged in');
logger.verbose('Request details:', data);
logger.error('Failed to fetch');
```

### Use Case 2: Enforcing test IDs everywhere except UI components

```typescript
{
  attributes: [{
    attribute: 'data-testid',
    ignoreTags: [
      // UI primitives that don't need test IDs
      'Typography',
      'Box',
      'Stack',
      'Divider',
      'Icon'
    ]
  }]
}

// ✅ Allowed (ignored):
<Typography>Hello</Typography>
<Box padding={2}>Content</Box>

// ❌ Error (requires data-testid):
<Button onClick={handleClick}>Click Me</Button>
<TextField label="Name" />
```

### Use Case 3: Accessibility for interactive elements

```typescript
{
  attributes: [
    {
      attribute: 'aria-label',
      ignoreTags: ['div', 'span', 'p'], // Text elements don't need labels
    },
    {
      attribute: 'tabIndex',
      ignoreTags: ['button', 'a', 'input', 'select', 'textarea'], // Already focusable
    },
  ];
}
```

## 📊 Benefits

### For Teams:

1. **Gradual Migration**: Map console methods incrementally
2. **Consistency**: Everyone uses the same logger methods
3. **Flexibility**: Ignore specific components without disabling rule
4. **Education**: LLM explains WHY each attribute is needed

### For LLMs:

1. **Rich Context**: Knows which logger is being used
2. **Mapping Awareness**: Understands console.debug → logger.verbose
3. **Component Context**: Knows which elements need what attributes
4. **Purpose-Driven**: Can explain testing vs accessibility vs navigation needs

## 🔧 How It Works

### Logger Detection Algorithm:

1. Scan AST for `ImportDeclaration` nodes
2. Check for imports with "log" in the name
3. Scan for `require()` calls with "log" in variable name
4. Fall back to `customLogger` if nothing found

### Required Attributes Flow:

1. Check element name (Button, TextField, etc.)
2. For each required attribute:
   - Check if element is in ignoreTags for this attribute
   - Check if attribute exists
   - If missing, generate context-aware fix
   - Suggest value based on attribute type and element name

## 📝 Configuration Matrix

| Scenario             | no-console-log Config           | required-attributes Config                      |
| -------------------- | ------------------------------- | ----------------------------------------------- |
| **Test IDs for E2E** | N/A                             | `data-testid` required, ignore UI primitives    |
| **A11y Compliance**  | N/A                             | `aria-label` on interactive elements            |
| **Logger Migration** | `severityMap` with auto-detect  | N/A                                             |
| **Mixed Approach**   | `convert` strategy with mapping | Multiple attributes with different ignore lists |

## 🚀 Next Steps

- ✅ Both rules implemented with full LLM context
- ✅ Exported in main index
- ✅ Added to React preset
- ⏳ Create comprehensive tests
- ⏳ Create detailed documentation

## 💡 Innovation

These rules showcase the power of **LLM-aware ESLint rules**:

1. **Context-Aware**: Rules understand the codebase (detected logger, component types)
2. **Flexible**: Per-attribute, per-component customization
3. **Educational**: LLM gets WHY, not just WHAT
4. **Practical**: Solves real team migration challenges

This is exactly the kind of tooling that makes LLMs more effective at helping teams maintain code quality!
