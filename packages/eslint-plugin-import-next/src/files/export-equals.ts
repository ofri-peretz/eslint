/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

// TS `export =` / CJS-interop module, the same shape as Node's own builtins
// (@types/node declares `declare module 'node:process' { ... export = process; }`)
// which is what makes packages/burgee/src/commander-command.ts:19,
// packages/flagstaff/src/cursor.ts:19, packages/flagstaff/src/log-update.ts:21
// and packages/flagstaff/src/ora.ts:18 (all `import process from 'node:process'`)
// false positives under the unfixed rule.
class Widget {
  render(): string {
    return 'widget';
  }
}

export = Widget;
