/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-unsafe-buffer-alloc: what the rule publishes besides its findings.
 *
 * The docs page, the oxlint port and editor integrations read `meta`, not the
 * rule's behaviour. A message that loses its CWE, a schema default that drifts
 * from the code's own default, or a schema that starts accepting unknown keys
 * changes what a user is told without failing any RuleTester case.
 */
import { describe, expect, it } from 'vitest';
import { noUnsafeBufferAlloc } from './index';

const meta = noUnsafeBufferAlloc.meta as unknown as {
  interop: { runtimes: string[] };
  docs: { description: string; cwe: string };
  messages: Record<string, string>;
  schema: Array<{
    additionalProperties: boolean;
    properties: Record<string, { default: string[]; items: { type: string } }>;
  }>;
};

describe('no-unsafe-buffer-alloc — the published contract', () => {
  it('runs on both linters', () => {
    expect(meta.interop.runtimes).toEqual(['eslint', 'oxlint']);
  });

  it('documents the weakness it reports', () => {
    expect(meta.docs.cwe).toBe('CWE-908');
    expect(meta.docs.description).toMatch(/allocUnsafe/);
  });

  it('names the CWE in each finding message', () => {
    expect(meta.messages.unsafeAlloc).toMatch(/CWE-908/);
    expect(meta.messages.unsafeAllocSlow).toMatch(/CWE-908/);
    expect(meta.messages.unsafeAllocSlow).toMatch(/allocUnsafeSlow/);
    expect(meta.messages.unboundedAllocation).toMatch(/CWE-789/);
  });

  it('publishes the same defaults the rule applies', () => {
    const { properties } = meta.schema[0];
    expect(properties.wireNames.default).toEqual(
      expect.arrayContaining(['chunk', 'buf', 'payload']),
    );
    expect(properties.requestRootNames.default).toEqual([
      'req',
      'request',
      'ctx',
      'event',
    ]);
    expect(properties.countNames.default).toEqual(
      expect.arrayContaining(['length', 'len', 'size']),
    );
    for (const option of Object.values(properties)) {
      expect(option.items).toEqual({ type: 'string' });
    }
  });

  it('rejects an option it does not know', () => {
    expect(meta.schema[0].additionalProperties).toBe(false);
  });
});
