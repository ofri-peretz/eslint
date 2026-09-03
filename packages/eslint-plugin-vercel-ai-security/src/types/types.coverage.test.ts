/**
 * @fileoverview Coverage test for the type-only module.
 *
 * `src/types/index.ts` is part of the public API (re-exported from the plugin
 * entry via `export type *`). It must stay a pure type module: importing it at
 * runtime must yield zero runtime exports. This test pins that contract and
 * loads the module so v8 records it.
 */

import { describe, it, expect } from 'vitest';
import * as types from './index';

describe('types module', () => {
  it('is a pure type module with no runtime exports', () => {
    expect(Object.keys(types)).toEqual([]);
  });
});
