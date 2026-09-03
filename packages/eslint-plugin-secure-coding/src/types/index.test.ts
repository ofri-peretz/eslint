/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
// Value import (not `import type`) so the module is actually loaded and
// instrumented by the coverage provider — the barrel re-exports types only,
// so there is nothing to assert beyond "the module loads".
import * as types from './index';

describe('types/index barrel', () => {
  it('loads as a module (type-only barrel, no runtime exports)', () => {
    expect(types).toBeDefined();
  });
});
