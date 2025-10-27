# LLM-Optimized Circular Dependency Messages

## Design Principles

1. **Brevity**: Max 15 lines per error message
2. **Actionable**: Start with concrete action, not explanation
3. **Scannable**: Use clear visual markers (→, ✓, ✗)
4. **Strategy-First**: Lead with the fix approach

---

## Strategy 1: Module Split

```
🔄 Module Split Required

Cycle: UserService.ts ⟷ OrderService.ts

ACTION: Split UserService into 2 files
├─ user/UserService.core.ts (→ OrderService ✓)
└─ user/UserService.orders.ts (→ core + OrderService ✓)

Result: core → OrderService → orders (no cycle)
```

**For LLM:**
- Clear structure with tree notation
- Shows what depends on what (→)
- Shows valid dependencies (✓)

---

## Strategy 2: Direct Import

```
📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles
```

**For LLM:**
- One-line change with ✗/✓ markers
- Exact import paths to replace

---

## Strategy 3: Extract Shared

```
🔄 Extract Shared Types

Cycle: User.ts ⟷ Order.ts

ACTION: Create shared/types.ts with:
- export type UserId, OrderId
- export interface UserSummary, OrderSummary

Then: Both files import from shared/types.ts

Result: shared/types ← User, Order (no cycle)
```

**For LLM:**
- Lists exact exports to extract
- Shows dependency direction with ←

---

## Strategy 4: Dependency Injection

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

**For LLM:**
- Numbered steps (max 4)
- Shows pattern with actual code
- Explains the result

---

## Implementation Example

```typescript
// Concise message generation
function generateModuleSplitMessage(cycle: string[], moduleToSplit: string): string {
  const [module1, module2] = getModuleNames(cycle);
  
  return `🔄 Module Split Required

Cycle: ${module1} ⟷ ${module2}

ACTION: Split ${moduleToSplit} into 2 files
├─ ${moduleToSplit}/core.ts (→ ${module2} ✓)
└─ ${moduleToSplit}/extended.ts (→ core + ${module2} ✓)

Result: core → ${module2} → extended (no cycle)`;
}

function generateDirectImportMessage(cycle: string[], barrelFile: string, targetFile: string): string {
  const oldImport = `import { ... } from '${getRelativePath(barrelFile)}'`;
  const newImport = `import { ... } from '${getRelativePath(targetFile)}'`;
  
  return `📦 Use Direct Import

Cycle: ${formatCycle(cycle)}

ACTION: In ${getCurrentFile()}, change:
✗ ${oldImport}
✓ ${newImport}

Why: Barrel exports (index.ts) create cycles`;
}

function generateExtractSharedMessage(cycle: string[], sharedTypes: string[]): string {
  const [module1, module2] = getModuleNames(cycle);
  
  return `🔄 Extract Shared Types

Cycle: ${module1} ⟷ ${module2}

ACTION: Create shared/types.ts with:
${sharedTypes.map(t => `- export ${t}`).join('\n')}

Then: Both files import from shared/types.ts

Result: shared/types ← ${module1}, ${module2} (no cycle)`;
}

function generateDependencyInjectionMessage(cycle: string[]): string {
  const [service1, service2] = getModuleNames(cycle);
  
  return `🚨 Use Dependency Injection

Cycle: ${service1} ⟷ ${service2}

ACTION: 
1. Create interfaces/I${service1}.ts, interfaces/I${service2}.ts
2. Both services implement their interface
3. Inject via constructor: constructor(private dep?: IDep)
4. Wire in container.ts

Result: Both depend on interfaces, not each other`;
}
```

---

## Strategy Selection Logic

```typescript
function selectStrategy(cycle: string[], options: Options): StrategyType {
  const hasBarrel = cycle.some(isBarrelExport);
  const hasInfrastructure = cycle.some(isInfrastructure);
  const hasTypeImports = analyzeImports(cycle).onlyTypes;
  const cycleSize = cycle.length;
  
  // Priority order for auto-detection
  if (hasInfrastructure) {
    return 'dependency-injection';
  }
  
  if (hasBarrel && cycleSize === 2) {
    return 'direct-import';  // Simplest fix
  }
  
  if (hasTypeImports) {
    return 'extract-shared';  // No runtime dependencies
  }
  
  if (cycleSize === 2) {
    return 'module-split';  // Clean separation
  }
  
  // Override with user preference
  return options.fixStrategy ?? 'module-split';
}
```

---

## Complete Message Structure

```typescript
interface ErrorMessage {
  emoji: string;           // 🔄 📦 🚨 (1 char for quick scan)
  title: string;           // Max 4 words
  cycle: string;           // "A ⟷ B" or "A → B → C → A"
  action: string[];        // Max 4 bullet points or steps
  result: string;          // One-line outcome
}

// Example output:
const message = `${emoji} ${title}

Cycle: ${cycle}

ACTION: ${formatAction(action)}

Result: ${result}`;
```

---

## Real-World Examples

### Example 1: Simple Barrel Export
```
📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles
```

### Example 2: Service Cycle
```
🔄 Module Split Required

Cycle: UserService.ts ⟷ OrderService.ts

ACTION: Split UserService into 2 files
├─ user/UserService.core.ts (→ OrderService ✓)
└─ user/UserService.orders.ts (→ core + OrderService ✓)

Result: core → OrderService → orders (no cycle)
```

### Example 3: Type Cycle
```
🔄 Extract Shared Types

Cycle: User.ts ⟷ Order.ts

ACTION: Create shared/types.ts with:
- export type UserId, OrderId
- export interface UserSummary, OrderSummary

Then: Both files import from shared/types.ts

Result: shared/types ← User, Order (no cycle)
```

### Example 4: Infrastructure Cycle
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

---

## Configuration

```typescript
{
  fixStrategy?: 'module-split' | 'direct-import' | 'extract-shared' | 'dependency-injection' | 'auto';
  verboseMessages?: boolean;  // Default: false (concise mode)
}
```

---

## LLM Parsing Hints

The concise format enables LLMs to:

1. **Extract action type** from first line emoji + title
2. **Identify files** from "Cycle:" line
3. **Get exact changes** from ACTION section (✗/✓ markers)
4. **Understand outcome** from Result line

**Pattern Recognition:**
- `⟷` = bidirectional cycle (need split or DI)
- `→ ... →` = chain cycle (need extract or direct import)
- `✗`/`✓` = exact code to replace
- `├─`/`└─` = file structure to create
- `←` = dependency direction after fix

---

## Benefits

### For Humans:
- ✓ Scan in 3 seconds
- ✓ Know exactly what to change
- ✓ Visual tree structure is clear
- ✓ No information overload

### For LLMs:
- ✓ Consistent format for parsing
- ✓ Clear markers (✗, ✓, →, ⟷)
- ✓ Actionable steps (1-4 items max)
- ✓ Before/after implicit in ✗/✓

---

## Comparison

### Before (Verbose):
```
🔄 **CIRCULAR DEPENDENCY DETECTED**

**Dependency Chain:**
  1. src/components/Button → src/components/Modal
  2. src/components/Modal → 🔄 src/components/Button

**⚠️ MEMORY IMPACT:**
Circular dependencies force bundlers (Rollup/Vite/Webpack) to create 
separate chunks for each module in the cycle. This prevents tree-shaking...

**WHY THIS HAPPENS:**
When module A imports B, and B imports A...

**HOW TO FIX:**
1. Use direct imports to specific files instead of barrel exports
2. Extract shared code/types into a separate module
3. Use dependency injection to break the cycle
4. Consider if both modules should be merged into one
```
**Length:** ~20 lines, multiple strategies mixed

### After (Concise):
```
📦 Use Direct Import

Cycle: Button/index.ts → Modal/index.ts → Button/index.ts

ACTION: In Modal.tsx, change:
✗ import { Button } from '../Button'
✓ import { Button } from '../Button/Button'

Why: Barrel exports (index.ts) create cycles
```
**Length:** 7 lines, one clear action

