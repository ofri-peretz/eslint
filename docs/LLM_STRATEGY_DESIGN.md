# LLM-Optimized Circular Dependency Strategies

## Strategy System Design

Add a `strategy` option to the rule that determines how the LLM should approach fixing the circular dependency.

```typescript
interface Options {
  maxDepth?: number;
  ignorePatterns?: string[];
  infrastructurePaths?: string[];
  barrelExports?: string[];
  reportAllCycles?: boolean;
  
  // NEW: Strategy options
  fixStrategy?: 'module-split' | 'direct-import' | 'dependency-injection' | 'extract-shared' | 'auto';
  moduleNamingConvention?: 'numbered' | 'semantic' | 'feature-based';
  suggestFileStructure?: boolean;
}
```

---

## Strategy 1: Module Split (Your Idea)

### Configuration

```typescript
{
  fixStrategy: 'module-split',
  moduleNamingConvention: 'semantic', // or 'numbered'
  suggestFileStructure: true
}
```

### LLM-Optimized Output

```
🔄 **CIRCULAR DEPENDENCY DETECTED**

**Dependency Chain:**
  1. src/services/UserService.ts → src/services/OrderService.ts
  2. src/services/OrderService.ts → 🔄 src/services/UserService.ts

**📋 RECOMMENDED STRATEGY: Module Split**

This cycle involves 2 tightly-coupled services. The recommended approach is to split 
one module into focused sub-modules to break the circular dependency.

**🎯 SPLIT PLAN FOR UserService:**

Split `UserService.ts` into logical sub-modules based on responsibilities:

```
src/services/
├── user/                          ← NEW folder (same name as module)
│   ├── UserService.core.ts       ← Core user operations (no OrderService dependency)
│   ├── UserService.orders.ts     ← Order-related user operations (depends on OrderService)
│   └── index.ts                  ← Barrel export (optional)
└── OrderService.ts               ← Unchanged
```

**📝 REFACTORING STEPS:**

1. **Create the user/ folder:**
   ```bash
   mkdir -p src/services/user
   ```

2. **Split UserService.ts:**
   
   **File: `src/services/user/UserService.core.ts`**
   ```typescript
   // Core user operations WITHOUT OrderService dependency
   export class UserServiceCore {
     getUser(id: string) { /* ... */ }
     createUser(data: UserData) { /* ... */ }
     updateUser(id: string, data: Partial<UserData>) { /* ... */ }
   }
   ```

   **File: `src/services/user/UserService.orders.ts`**
   ```typescript
   import { OrderService } from '../OrderService';
   import { UserServiceCore } from './UserService.core';
   
   // User operations that NEED OrderService
   export class UserServiceOrders {
     constructor(
       private core: UserServiceCore,
       private orderService: OrderService
     ) {}
     
     getUserWithOrders(userId: string) {
       const user = this.core.getUser(userId);
       const orders = this.orderService.getOrdersByUser(userId);
       return { ...user, orders };
     }
   }
   ```

   **File: `src/services/user/index.ts`** (optional barrel)
   ```typescript
   export * from './UserService.core';
   export * from './UserService.orders';
   ```

3. **Update OrderService.ts:**
   ```typescript
   // Change from:
   import { UserService } from './UserService';
   
   // To (only import what's needed):
   import { UserServiceCore } from './user/UserService.core';
   ```

4. **Update consumers:**
   ```typescript
   // If they need both:
   import { UserServiceCore, UserServiceOrders } from './services/user';
   
   // If they only need core:
   import { UserServiceCore } from './services/user/UserService.core';
   ```

**✅ RESULT:**

```
BEFORE (Circular):
UserService ⟷ OrderService

AFTER (Acyclic):
UserService.core → OrderService → UserService.orders
```

**⚠️ DEPENDENCY FLOW:**
- `OrderService` depends on `UserService.core` (no cycle)
- `UserService.orders` depends on both `OrderService` and `UserService.core` (no cycle)
- Dependency graph is now a DAG (Directed Acyclic Graph)

**🎓 NAMING CONVENTION:**
Based on your `moduleNamingConvention: 'semantic'` setting:
- `.core` = Core functionality with minimal dependencies
- `.orders` = Order-related functionality
- Alternative suffixes: `.api`, `.domain`, `.infrastructure`, `.helpers`
```

---

## Strategy 2: Direct Import (For Barrel Exports)

### Configuration

```typescript
{
  fixStrategy: 'direct-import',
  suggestFileStructure: false
}
```

### LLM-Optimized Output

```
📦 **BARREL EXPORT CIRCULAR DEPENDENCY**

**Dependency Chain:**
  1. src/components/Button/index.ts → src/components/Modal/index.ts
  2. src/components/Modal/index.ts → 🔄 src/components/Button/index.ts

**📋 RECOMMENDED STRATEGY: Direct Import**

The cycle is caused by barrel exports (index.ts files). Both components import 
through each other's barrel exports instead of importing directly.

**🎯 FIX APPROACH:**

Import directly from component files, bypassing the barrel exports.

**📝 REFACTORING STEPS:**

1. **In Modal/Modal.tsx:**
   ```typescript
   // ❌ BEFORE (causes cycle through barrel):
   import { Button } from '../Button';  // or '../Button/index'
   
   // ✅ AFTER (direct import, breaks cycle):
   import { Button } from '../Button/Button';
   ```

2. **In Button/Button.tsx:**
   ```typescript
   // ❌ BEFORE (causes cycle through barrel):
   import { Modal } from '../Modal';
   
   // ✅ AFTER (direct import, breaks cycle):
   import { Modal } from '../Modal/Modal';
   ```

**✅ RESULT:**

```
BEFORE:
Button/index.ts → Modal/index.ts → Button/index.ts (cycle)

AFTER:
Button/Button.tsx ← Modal/Modal.tsx (no cycle)
```

**💡 BEST PRACTICE:**
Keep barrel exports for external consumers, but use direct imports internally.
```

---

## Strategy 3: Dependency Injection (For Services)

### Configuration

```typescript
{
  fixStrategy: 'dependency-injection',
  suggestFileStructure: true
}
```

### LLM-Optimized Output

```
🚨 **CRITICAL: INFRASTRUCTURE CIRCULAR DEPENDENCY**

**Dependency Chain:**
  1. src/services/Logger.ts → src/services/EventBus.ts
  2. src/services/EventBus.ts → 🔄 src/services/Logger.ts

**📋 RECOMMENDED STRATEGY: Dependency Injection**

Infrastructure services should never have circular dependencies. Use dependency 
injection with interfaces to invert the dependency.

**🎯 INVERSION OF CONTROL PATTERN:**

```
BEFORE (Circular):
Logger → EventBus → Logger (cycle)

AFTER (Inverted):
Logger → IEventBus (interface)
EventBus implements IEventBus
EventBus → ILogger (interface)
Logger implements ILogger
```

**📝 REFACTORING STEPS:**

1. **Create interfaces folder:**
   ```bash
   mkdir -p src/services/interfaces
   ```

2. **Define interfaces:**
   
   **File: `src/services/interfaces/ILogger.ts`**
   ```typescript
   export interface ILogger {
     log(message: string): void;
     error(message: string): void;
     warn(message: string): void;
   }
   ```

   **File: `src/services/interfaces/IEventBus.ts`**
   ```typescript
   export interface IEventBus {
     emit(event: string, data: any): void;
     on(event: string, handler: Function): void;
   }
   ```

3. **Update Logger.ts:**
   ```typescript
   import { IEventBus } from './interfaces/IEventBus';
   import { ILogger } from './interfaces/ILogger';
   
   export class Logger implements ILogger {
     constructor(private eventBus?: IEventBus) {}  // Injected, not imported
     
     log(message: string) {
       console.log(message);
       this.eventBus?.emit('log', { message });  // Optional chaining
     }
   }
   ```

4. **Update EventBus.ts:**
   ```typescript
   import { ILogger } from './interfaces/ILogger';
   import { IEventBus } from './interfaces/IEventBus';
   
   export class EventBus implements IEventBus {
     constructor(private logger?: ILogger) {}  // Injected, not imported
     
     emit(event: string, data: any) {
       this.logger?.log(`Event emitted: ${event}`);
       // ... emit logic
     }
   }
   ```

5. **Setup dependency injection:**
   
   **File: `src/services/container.ts`**
   ```typescript
   import { Logger } from './Logger';
   import { EventBus } from './EventBus';
   
   // Create instances with injected dependencies
   export const eventBus = new EventBus();
   export const logger = new Logger(eventBus);
   
   // Wire up the circular dependency AFTER creation
   eventBus['logger'] = logger;  // Or use a setter method
   ```

**✅ RESULT:**

```
BEFORE:
Logger (imports EventBus) ⟷ EventBus (imports Logger)

AFTER:
Logger → IEventBus (interface)
EventBus → ILogger (interface)
container.ts → Logger, EventBus (wires at runtime)
```

**🎓 DEPENDENCY INVERSION PRINCIPLE:**
- Both Logger and EventBus depend on abstractions (interfaces)
- Neither depends on the concrete implementation of the other
- Dependencies are injected at runtime, not import time
```

---

## Strategy 4: Extract Shared (For Type/Utility Cycles)

### Configuration

```typescript
{
  fixStrategy: 'extract-shared',
  suggestFileStructure: true
}
```

### LLM-Optimized Output

```
🔄 **CIRCULAR DEPENDENCY DETECTED**

**Dependency Chain:**
  1. src/models/User.ts → src/models/Order.ts
  2. src/models/Order.ts → 🔄 src/models/User.ts

**📋 RECOMMENDED STRATEGY: Extract Shared Types**

Both modules import types from each other. Extract shared types to a separate module.

**🎯 EXTRACTION PLAN:**

```
src/models/
├── shared/                        ← NEW folder for shared types
│   ├── types.ts                  ← Shared type definitions
│   └── constants.ts              ← Shared constants
├── User.ts                       ← Updated to import from shared/
└── Order.ts                      ← Updated to import from shared/
```

**📝 REFACTORING STEPS:**

1. **Create shared folder:**
   ```bash
   mkdir -p src/models/shared
   ```

2. **Extract shared types:**
   
   **File: `src/models/shared/types.ts`**
   ```typescript
   // Shared types that both User and Order need
   export type UserId = string;
   export type OrderId = string;
   
   export interface UserSummary {
     id: UserId;
     name: string;
     email: string;
   }
   
   export interface OrderSummary {
     id: OrderId;
     total: number;
     status: 'pending' | 'completed';
   }
   ```

3. **Update User.ts:**
   ```typescript
   // ❌ BEFORE:
   import { Order, OrderId } from './Order';
   
   // ✅ AFTER:
   import { OrderId, OrderSummary } from './shared/types';
   
   export interface User {
     id: string;
     name: string;
     orders: OrderSummary[];  // Use summary type, not full Order
   }
   ```

4. **Update Order.ts:**
   ```typescript
   // ❌ BEFORE:
   import { User, UserId } from './User';
   
   // ✅ AFTER:
   import { UserId, UserSummary } from './shared/types';
   
   export interface Order {
     id: string;
     user: UserSummary;  // Use summary type, not full User
   }
   ```

**✅ RESULT:**

```
BEFORE:
User ⟷ Order (circular)

AFTER:
shared/types ← User
shared/types ← Order
```

**💡 PRINCIPLE:**
Shared types should live in their own module. Neither User nor Order should 
"own" types that the other needs.
```

---

## Strategy 5: Auto (Context-Aware)

### Configuration

```typescript
{
  fixStrategy: 'auto'  // Analyzes the cycle and suggests best strategy
}
```

### LLM-Optimized Output

```
🔄 **CIRCULAR DEPENDENCY DETECTED**

**Dependency Chain:**
  1. src/components/Header.tsx → src/utils/helpers.ts
  2. src/utils/helpers.ts → 🔄 src/components/Header.tsx

**🤖 AUTO-DETECTED STRATEGY: Extract Shared**

**Analysis:**
- ✓ Cycle involves utility functions (src/utils/helpers.ts)
- ✓ Component depends on utils for helper functions
- ✓ Utils depends on component for type definitions
- ⚠ Types should not live in implementation files

**Recommendation:** Extract shared types to break the cycle.

[... continue with extract-shared strategy output ...]
```

---

## Implementation Architecture

```typescript
interface StrategyConfig {
  name: string;
  detectionRules: {
    hasBarrelExport?: boolean;
    hasInfrastructure?: boolean;
    hasUtilityModule?: boolean;
    hasTypeOnlyImports?: boolean;
  };
  messageTemplate: string;
  steps: StrategyStep[];
}

interface StrategyStep {
  title: string;
  description: string;
  codeExample?: {
    before: string;
    after: string;
    files?: FileStructure[];
  };
}

interface FileStructure {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}
```

---

## Benefits for LLMs

1. **Clear Strategy Intent**: LLM knows which approach to use
2. **Step-by-Step Instructions**: Numbered, actionable steps
3. **Before/After Examples**: Concrete code snippets
4. **File Structure Visualization**: ASCII tree showing new structure
5. **Dependency Flow Diagrams**: Shows how cycle is broken
6. **Naming Conventions**: Consistent patterns (`.core`, `.api`, etc.)

---

## Benefits for Humans

1. **Multiple Valid Solutions**: Choose based on project architecture
2. **Opinionated Guidance**: Best practices baked in
3. **Copy-Paste Ready**: All code examples are complete
4. **Visual Understanding**: Tree diagrams and flow charts
5. **Learning Tool**: Explains WHY each strategy works

---

## Example Usage

```typescript
// .eslintrc.js or eslint.config.js
export default [
  {
    rules: {
      '@forge-js/llm-optimized/no-circular-dependencies': ['error', {
        fixStrategy: 'module-split',  // or 'auto' for smart detection
        moduleNamingConvention: 'semantic',
        suggestFileStructure: true,
        maxDepth: 10,
        reportAllCycles: true,
      }],
    },
  },
];
```

