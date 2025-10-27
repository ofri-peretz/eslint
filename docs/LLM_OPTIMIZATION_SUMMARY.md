# Summary: LLM-Optimized Circular Dependency Detection

## What Makes It LLM-Optimized

### 1. **Structured Format** ✓
Every error message follows a predictable pattern:
```
[Emoji] [Title]

Cycle: [visualization]

ACTION: [concrete steps]

Result: [outcome]
```

**LLM Benefit:** Can parse and extract actions programmatically

---

### 2. **Visual Markers** ✓
- `⟷` = bidirectional dependency
- `→` = dependency direction  
- `✗` = code to remove
- `✓` = code to add
- `├─` = file structure tree

**LLM Benefit:** Clear semantic meaning without parsing text

---

### 3. **Actionable Steps** ✓
Max 4 numbered steps, always starting with a verb:
- "Create shared/types.ts"
- "Split UserService into 2 files"
- "Change import statement"

**LLM Benefit:** Direct mapping to file operations

---

### 4. **Strategy-Specific Messages** ✓
Different fixes for different contexts:
- **Barrel exports** → Direct import (1 line change)
- **Type cycles** → Extract shared (create new file)
- **Service cycles** → Module split (refactor architecture)
- **Infrastructure cycles** → Dependency injection (add interfaces)

**LLM Benefit:** Context determines approach, reducing ambiguity

---

## Comparison: Verbose vs Concise

### ❌ Old Approach (20+ lines)
```
🔄 **CIRCULAR DEPENDENCY DETECTED**

**Dependency Chain:**
  1. src/components/Button → src/components/Modal
  2. src/components/Modal → 🔄 src/components/Button

**⚠️ MEMORY IMPACT:**
Circular dependencies force bundlers (Rollup/Vite/Webpack) to create 
separate chunks for each module in the cycle. This prevents tree-shaking
and module deduplication, keeping all cycle modules in memory simultaneously.

**WHY THIS HAPPENS:**
When module A imports B, and B imports A (directly or transitively), the 
bundler cannot determine initialization order. Memory usage grows 
exponentially with cycle size.

**HOW TO FIX:**
1. Use direct imports to specific files instead of barrel exports (index.ts)
2. Extract shared code/types into a separate module
3. Use dependency injection to break the cycle
4. Consider if both modules should be merged into one
```

**Problems:**
- Too long for quick scanning
- Multiple fix strategies mixed together
- LLM must parse paragraphs to find actions
- Human gets overwhelmed with information

---

### ✅ New Approach (7 lines)
```
📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles
```

**Benefits:**
- Readable in 3 seconds
- One clear action with exact code
- LLM can extract ✗/✓ directly
- Human knows exactly what to change

---

## Strategy Examples

### Strategy 1: Module Split
```
🔄 Module Split Required

Cycle: UserService.ts ⟷ OrderService.ts

ACTION: Split UserService into 2 files
├─ user/UserService.core.ts (→ OrderService ✓)
└─ user/UserService.orders.ts (→ core + OrderService ✓)

Result: core → OrderService → orders (no cycle)
```

**When:** Two tightly-coupled modules  
**LLM Action:** Create 2 files, move code based on dependencies  
**Human Action:** Refactor one module into logical pieces

---

### Strategy 2: Direct Import
```
📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles
```

**When:** Barrel export cycles  
**LLM Action:** Replace one import statement  
**Human Action:** Use direct file path

---

### Strategy 3: Extract Shared
```
🔄 Extract Shared Types

Cycle: User.ts ⟷ Order.ts

ACTION: Create shared/types.ts with:
- export type UserId, OrderId
- export interface UserSummary, OrderSummary

Then: Both files import from shared/types.ts

Result: shared/types ← User, Order (no cycle)
```

**When:** Type-only dependencies  
**LLM Action:** Create new file, extract interfaces, update imports  
**Human Action:** Move shared types to common location

---

### Strategy 4: Dependency Injection
```
🚨 Use Dependency Injection

Cycle: Logger.ts ⟷ EventBus.ts

ACTION: 
1. Create interfaces/ILogger.ts, interfaces/IEventBus.ts
2. Both services implement their interface
3. Inject via constructor: constructor(private eventBus?: IEventBus)
4. Wire in container.ts

Result: Both depend on interfaces, not each other
```

**When:** Infrastructure/service cycles  
**LLM Action:** Create interfaces, update constructors, create container  
**Human Action:** Apply dependency inversion principle

---

## Configuration

```typescript
// eslint.config.js
{
  '@forge-js/llm-optimized/no-circular-dependencies': ['error', {
    // Strategy selection
    fixStrategy: 'auto',  // or 'module-split' | 'direct-import' | 'extract-shared' | 'dependency-injection'
    
    // For module-split strategy
    moduleNamingConvention: 'semantic',  // .core, .api, .domain OR 'numbered': .1, .2, .3
    
    // Message format
    verboseMessages: false,  // true = old format with explanations
    
    // Detection options
    maxDepth: 10,
    reportAllCycles: true,
    ignorePatterns: ['**/*.test.ts'],
    infrastructurePaths: ['src/services/**'],
    barrelExports: ['index.ts', 'index.tsx'],
  }]
}
```

---

## Auto-Strategy Selection

```typescript
function selectStrategy(cycle: CycleInfo): Strategy {
  // Priority order:
  
  if (cycle.hasInfrastructure) {
    return 'dependency-injection';  // Critical path, use proper DI
  }
  
  if (cycle.hasBarrelExport && cycle.length === 2) {
    return 'direct-import';  // Simplest fix, one line change
  }
  
  if (cycle.hasOnlyTypeImports) {
    return 'extract-shared';  // No runtime logic, just types
  }
  
  if (cycle.length === 2) {
    return 'module-split';  // Two modules, split the simpler one
  }
  
  return 'module-split';  // Default for complex cycles
}
```

---

## Implementation Checklist

- [ ] Add `fixStrategy` option to rule
- [ ] Implement strategy detection logic
- [ ] Create concise message templates
- [ ] Add strategy-specific message generators
- [ ] Update tests with new message formats
- [ ] Add documentation with examples
- [ ] Test with actual LLMs (Claude, GPT-4, etc.)

---

## Why This Matters

### For LLMs:
- **Predictable parsing**: Same format every time
- **Clear actions**: Can generate exact file operations
- **Visual markers**: `✗`/`✓` mean "replace this with that"
- **Tree notation**: `├─`/`└─` show file structure
- **Reduced tokens**: Concise = fewer tokens = faster processing

### For Humans:
- **Quick scanning**: Read in 3 seconds
- **No overwhelm**: One strategy, not four options
- **Copy-paste ready**: Exact code to change
- **Visual structure**: Tree diagrams are clear
- **Actionable**: Know exactly what to do

---

## Next Steps

1. **Implement strategy detection** in the rule
2. **Add message templates** for each strategy
3. **Test with LLMs** to verify fix-ability
4. **Gather feedback** from developers
5. **Iterate** on message format based on usage

---

## Example ESLint Output

```bash
$ eslint src/

src/components/Modal.tsx
  5:1  error  📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles  @forge-js/llm-optimized/no-circular-dependencies

✖ 1 problem (1 error, 0 warnings)
```

**Total lines:** 11 (including ESLint formatting)  
**Human scan time:** 3 seconds  
**LLM parse time:** Instant (clear markers)  
**Fix time:** 10 seconds (one import statement)

---

## Conclusion

The LLM optimization focuses on:
1. **Brevity** - No more than 10 lines per error
2. **Clarity** - Visual markers (✗, ✓, →, ⟷)
3. **Action** - Exact code changes, not abstract advice
4. **Strategy** - One approach per context, not multiple options

This makes fixes **easy for both humans and AI** to understand and implement.

