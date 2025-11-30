# performance Configuration

Detect performance anti-patterns and optimization opportunities.

## Overview

The `performance` configuration identifies common performance issues including React re-render problems, memory leaks, N+1 queries, and blocking operations. It helps maintain fast, efficient applications.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.performance,
];
```

## Rules Included

| Rule | Severity | Description |
|------|----------|-------------|
| `performance/react-no-inline-functions` | warn | Detect inline functions causing re-renders |
| `performance/detect-n-plus-one-queries` | warn | Detect N+1 query patterns |
| `performance/react-render-optimization` | warn | Suggest useMemo/useCallback optimizations |
| `performance/no-unnecessary-rerenders` | warn | Detect patterns causing unnecessary re-renders |
| `performance/no-memory-leak-listeners` | warn | Detect missing event listener cleanup |
| `performance/no-blocking-operations` | warn | Detect blocking operations in async code |
| `performance/no-unbounded-cache` | warn | Detect unbounded cache growth |

## When to Use

**Use `performance` when:**
- Building performance-critical applications
- Working on data-heavy dashboards
- Optimizing React applications
- Diagnosing slow application behavior
- Preparing for production deployment

**Combine with other configs:**

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.performance,
];
```

## Rule Details

### react-no-inline-functions

Detects inline functions in JSX that cause unnecessary re-renders:

```jsx
// ❌ Bad: Inline function creates new reference each render
<Button onClick={() => handleClick(id)} />

// ❌ Bad: Inline arrow in render
<List items={items.map(item => ({ ...item, selected: true }))} />

// ✅ Good: Use useCallback for event handlers
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id, handleClick]);
<Button onClick={handleButtonClick} />

// ✅ Good: Memoize computed values
const processedItems = useMemo(() => 
  items.map(item => ({ ...item, selected: true })),
  [items]
);
<List items={processedItems} />
```

### detect-n-plus-one-queries

Detects N+1 query patterns in loops:

```javascript
// ❌ Bad: N+1 queries - fetches once per item
for (const user of users) {
  const posts = await fetchPosts(user.id);  // N queries!
}

// ✅ Good: Batch fetch
const userIds = users.map(u => u.id);
const allPosts = await fetchPostsForUsers(userIds);  // 1 query
```

### react-render-optimization

Suggests optimization opportunities:

```jsx
// ❌ Flagged: Complex computation in render
function ProductList({ products, filters }) {
  // Expensive filtering runs every render
  const filteredProducts = products.filter(p => 
    matchesAllFilters(p, filters)
  );
  
  return <List items={filteredProducts} />;
}

// ✅ Suggested: Use useMemo
function ProductList({ products, filters }) {
  const filteredProducts = useMemo(() => 
    products.filter(p => matchesAllFilters(p, filters)),
    [products, filters]
  );
  
  return <List items={filteredProducts} />;
}
```

### no-memory-leak-listeners

Detects missing cleanup in useEffect:

```javascript
// ❌ Bad: Memory leak - listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ Good: Cleanup function removes listener
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### no-blocking-operations

Detects blocking operations in async contexts:

```javascript
// ❌ Bad: Blocking file read in async handler
app.get('/file', async (req, res) => {
  const data = fs.readFileSync('/large-file.txt');  // Blocks!
  res.send(data);
});

// ✅ Good: Non-blocking async read
app.get('/file', async (req, res) => {
  const data = await fs.promises.readFile('/large-file.txt');
  res.send(data);
});
```

### no-unbounded-cache

Detects caches that can grow without limit:

```javascript
// ❌ Bad: Cache grows forever
const cache = new Map();
function memoizedFetch(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => r.json()));
  }
  return cache.get(url);
}

// ✅ Good: Use LRU cache with size limit
import LRU from 'lru-cache';
const cache = new LRU({ max: 100 });
```

## Configuration Examples

### React Performance Focus

```javascript
export default [
  llmOptimized.configs['react-modern'],
  llmOptimized.configs.performance,
  {
    rules: {
      // Stricter for critical components
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
      '@forge-js/llm-optimized/performance/no-unnecessary-rerenders': 'error',
    },
  },
];
```

### Backend API Performance

```javascript
export default [
  llmOptimized.configs.recommended,
  {
    files: ['src/api/**/*.ts', 'src/routes/**/*.ts'],
    rules: {
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'error',
      '@forge-js/llm-optimized/performance/no-blocking-operations': 'error',
    },
  },
];
```

### Per-Component Strictness

```javascript
export default [
  llmOptimized.configs.performance,
  {
    // Critical components - strictest rules
    files: ['src/components/critical/**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'error',
    },
  },
  {
    // Less critical components - warnings only
    files: ['src/components/admin/**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'warn',
    },
  },
];
```

## Profiling Integration

Use with React DevTools Profiler:

1. Enable performance rules
2. Run ESLint to find issues
3. Use React DevTools Profiler to verify fixes
4. Measure before/after render times

## Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [useMemo Documentation](https://react.dev/reference/react/useMemo)
- [useCallback Documentation](https://react.dev/reference/react/useCallback)
- [Web Performance Best Practices](https://web.dev/performance/)

