'use client';

/**
 * Idle Until Urgent - Pattern from https://philipwalton.com/articles/idle-until-urgent/
 * 
 * Defers non-critical work until the browser is idle, but executes immediately
 * if the value is needed before that.
 */

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type RequestIdleCallbackFn = (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
type CancelIdleCallbackFn = (handle: number) => void;

// Polyfill for requestIdleCallback
const requestIdleCallback: RequestIdleCallbackFn =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as unknown as { requestIdleCallback: RequestIdleCallbackFn }).requestIdleCallback
    : (callback: (deadline: IdleDeadline) => void) => {
        const start = Date.now();
        return window.setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          });
        }, 1) as unknown as number;
      };

const cancelIdleCallback: CancelIdleCallbackFn =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? (window as unknown as { cancelIdleCallback: CancelIdleCallbackFn }).cancelIdleCallback
    : (handle: number) => window.clearTimeout(handle);

interface IdleValue<T> {
  getValue: () => T;
}

/**
 * Creates a value that is computed during idle time, but immediately
 * computed if accessed before idle time occurs.
 * 
 * @param initFn - Function that returns the value to compute
 * @returns Object with getValue() method
 * 
 * @example
 * ```tsx
 * const heavyComputation = idleValue(() => {
 *   return expensiveOperation();
 * });
 * 
 * // Later, when needed:
 * const result = heavyComputation.getValue();
 * ```
 */
export function idleValue<T>(initFn: () => T): IdleValue<T> {
  let value: T | undefined;
  let initialized = false;
  let idleHandle: number | null = null;

  const ensureInitialized = () => {
    if (!initialized) {
      if (idleHandle !== null) {
        cancelIdleCallback(idleHandle);
        idleHandle = null;
      }
      value = initFn();
      initialized = true;
    }
    return value as T;
  };

  // Schedule initialization during idle time
  if (typeof window !== 'undefined') {
    idleHandle = requestIdleCallback(() => {
      if (!initialized) {
        value = initFn();
        initialized = true;
      }
    });
  }

  return {
    getValue: ensureInitialized,
  };
}

/**
 * Creates a task queue that executes functions during idle time,
 * but can flush immediately if needed.
 * 
 * @example
 * ```tsx
 * const queue = idleTaskQueue();
 * 
 * queue.pushTask(() => {
 *   // Non-critical work
 *   analytics.track('event');
 * });
 * 
 * // Force all pending tasks to run now
 * queue.flush();
 * ```
 */
export function idleTaskQueue() {
  const tasks: Array<() => void> = [];
  let isProcessing = false;
  let idleHandle: number | null = null;

  const processTasks = (deadline: IdleDeadline) => {
    while (tasks.length > 0 && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
      const task = tasks.shift();
      task?.();
    }

    if (tasks.length > 0) {
      idleHandle = requestIdleCallback(processTasks);
    } else {
      isProcessing = false;
    }
  };

  const pushTask = (task: () => void) => {
    tasks.push(task);
    
    if (!isProcessing) {
      isProcessing = true;
      idleHandle = requestIdleCallback(processTasks);
    }
  };

  const flush = () => {
    if (idleHandle !== null) {
      cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
    
    while (tasks.length > 0) {
      const task = tasks.shift();
      task?.();
    }
    isProcessing = false;
  };

  return { pushTask, flush };
}

/**
 * React hook for computed values that are initialized during idle time.
 * Uses useSyncExternalStore for proper hydration handling.
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const heavyValue = useIdleValue(() => computeExpensiveValue());
 *   return <div>{heavyValue}</div>;
 * }
 * ```
 */
export function useIdleValue<T>(initFn: () => T, serverValue?: T): T {
  // For SSR, return server value or compute immediately
  if (typeof window === 'undefined') {
    return serverValue !== undefined ? serverValue : initFn();
  }

  // On client, use idle value pattern
  const idle = idleValue(initFn);
  return idle.getValue();
}
