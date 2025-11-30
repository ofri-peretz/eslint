# migration Configuration

Help teams migrate to modern patterns and APIs.

## Overview

The `migration` configuration assists teams in modernizing their codebase by detecting deprecated patterns and suggesting modern alternatives. It provides actionable migration paths rather than just flagging issues.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.migration,
];
```

## Rules Included

| Rule | Severity | Description |
|------|----------|-------------|
| `migration/react-class-to-hooks` | warn | Suggest migrating React class components to hooks |
| `deprecation/no-deprecated-api` | warn | Detect deprecated API usage with migration paths |

## When to Use

**Use `migration` when:**
- Actively modernizing a legacy codebase
- Planning a major version upgrade
- Preparing for breaking API changes
- Onboarding new team members to modern patterns

**Note:** This config is focused on migration suggestions. For ongoing code quality, combine with `recommended`:

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.migration,
];
```

## Migration Guidance

### React Class to Hooks

The `migration/react-class-to-hooks` rule detects class components and provides detailed migration guidance:

```jsx
// Detected: Class component with state and lifecycle
class UserProfile extends React.Component {
  state = { user: null, loading: true };
  
  componentDidMount() {
    this.fetchUser();
  }
  
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }
  
  componentWillUnmount() {
    this.abortController?.abort();
  }
  
  fetchUser = async () => {
    // ...
  };
  
  render() {
    // ...
  }
}

// Suggested migration:
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    async function fetchUser() {
      // ...
    }
    
    fetchUser();
    
    return () => abortController.abort();
  }, [userId]);
  
  // ...
}
```

### Deprecated API Detection

The `deprecation/no-deprecated-api` rule detects deprecated patterns:

```javascript
// ❌ Deprecated patterns detected
import { render } from 'react-dom';  // Deprecated in React 18
render(<App />, document.getElementById('root'));

// ✅ Modern alternative suggested
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);
```

## Configuration Examples

### Phased Migration

```javascript
export default [
  llmOptimized.configs.migration,
  {
    // Phase 1: Warn on all legacy code
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
      '@forge-js/llm-optimized/deprecation/no-deprecated-api': 'warn',
    },
  },
  {
    // Phase 2: Error on new features (no new class components)
    files: ['src/features/new-*/**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'error',
    },
  },
];
```

### Migration Sprint Setup

```javascript
// Use during dedicated migration sprints
export default [
  {
    files: ['src/components/legacy/**/*.tsx'],
    ...llmOptimized.configs.migration,
    rules: {
      // Make migration issues more visible
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'error',
    },
  },
];
```

### Track Migration Progress

```bash
# Count remaining class components
npx eslint src --rule '@forge-js/llm-optimized/migration/react-class-to-hooks: error' \
  --format json | jq '.length'

# List files needing migration
npx eslint src --rule '@forge-js/llm-optimized/migration/react-class-to-hooks: error' \
  --format compact
```

## Best Practices

### 1. Start with Warnings

Begin with warnings to understand the scope of migration:

```javascript
rules: {
  '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
}
```

### 2. Migrate Incrementally

Don't try to migrate everything at once:

```javascript
// Week 1: Migrate simple components
files: ['src/components/ui/**/*.tsx'],

// Week 2: Migrate feature components
files: ['src/features/**/*.tsx'],

// Week 3: Migrate page components
files: ['src/pages/**/*.tsx'],
```

### 3. Use AI Assistance

The LLM-optimized error messages work well with AI coding assistants:

```bash
# AI assistants can understand and apply the migration suggestions
# Error: 🔄 CWE-1078 | React class component detected | MEDIUM
#        Fix: Use functional component with useEffect/useState
```

## Related Configs

- [`react`](./react.md) - Includes migration rules plus React-specific rules
- [`react-modern`](./react-modern.md) - For codebases that have completed migration

