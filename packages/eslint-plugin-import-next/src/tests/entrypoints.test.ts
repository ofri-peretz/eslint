/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Coverage for the auxiliary source entry points:
 * - src/oxlint.ts   (oxlint sub-export shim, `export = plugin`)
 * - src/files/*.ts  (tiny fixture modules that live under src/ and are
 *                    therefore part of the coverage universe)
 * - src/types/index.ts (type-only barrel — no runtime statements, but v8
 *                    counts the module until it is loaded once)
 */
import { describe, it, expect } from 'vitest';
import { plugin } from '../index';
import foo, { bar } from '../files/foo';
import { foo as noDefaultFoo } from '../files/no-default';
import * as typeBarrel from '../types/index';

describe('oxlint sub-export', () => {
  it('re-exports the plugin object (meta + rules at top level)', async () => {
    const oxlintModule = await import('../oxlint');
    const oxlintPlugin = (
      oxlintModule as unknown as { default: typeof plugin }
    ).default;
    expect(oxlintPlugin).toBeDefined();
    expect(oxlintPlugin.meta?.name).toBe('eslint-plugin-import-next');
    expect(Object.keys(oxlintPlugin.rules ?? {}).toSorted()).toEqual(
      Object.keys(plugin.rules ?? {}).toSorted(),
    );
  });

  it('passes rule references through unchanged (not copies)', async () => {
    const oxlintModule = await import('../oxlint');
    const oxlintPlugin = (
      oxlintModule as unknown as { default: typeof plugin }
    ).default;
    for (const ruleName of Object.keys(plugin.rules ?? {})) {
      expect(oxlintPlugin.rules?.[ruleName]).toBe(plugin.rules?.[ruleName]);
    }
  });
});

describe('src/files fixture modules', () => {
  it('foo.ts exposes a default function returning "bar" and a named const', () => {
    expect(foo()).toBe('bar');
    expect(bar).toBe('baz');
  });

  it('no-default.ts exposes only a named const', () => {
    expect(noDefaultFoo).toBe('bar');
  });
});

describe('src/types barrel', () => {
  it('is a type-only module with no runtime exports', () => {
    expect(Object.keys(typeBarrel)).toEqual([]);
  });
});
