/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `prefer-event-target` reports but never rewrites.
 *
 * Its fixers renamed the BINDING and nothing else, and both halves of that
 * were wrong. `events` does not export `EventTarget` — it is a global in
 * Node 15+ — so the rewritten import resolved to `undefined`; and the use site
 * was left alone, so `extends EventEmitter` referred to a name no longer
 * bound. `--fix` over working code produced a file that could not run.
 *
 * These tests assert the OUTPUT of `verifyAndFix`, not the presence of a
 * `fix` property. A fixer that returns a broken edit still satisfies "has a
 * fixer"; only running it shows what it does.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { preferEventTarget } from './prefer-event-target';

const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
    plugins: { m: { rules: { 'prefer-event-target': preferEventTarget as never } } },
    rules: { 'm/prefer-event-target': 'error' as const },
  },
];

const fixed = (code: string): string =>
  new Linter({ configType: 'flat' }).verifyAndFix(code, config, 'subject.ts').output;

const reports = (code: string): number =>
  new Linter({ configType: 'flat' })
    .verify(code, config, 'subject.ts')
    .filter((m) => m.ruleId === 'm/prefer-event-target').length;

const IMPORT_FORM = 'import { EventEmitter } from "events";\nexport class Bus extends EventEmitter {}\n';
const REQUIRE_FORM = 'const { EventEmitter } = require("events");\nclass Bus extends EventEmitter {}\n';

describe('never rewrites the source', () => {
  it('leaves the import form byte-for-byte unchanged', () => {
    expect(fixed(IMPORT_FORM)).toBe(IMPORT_FORM);
  });

  it('leaves the require form byte-for-byte unchanged', () => {
    expect(fixed(REQUIRE_FORM)).toBe(REQUIRE_FORM);
  });

  it('never writes EventTarget into an import, which resolves to undefined', () => {
    // The precise breakage: `events` has no `EventTarget` export.
    expect(fixed(IMPORT_FORM)).not.toContain('EventTarget');
  });

  it('never leaves EventEmitter unbound at its use site', () => {
    // Asserted as two plain facts rather than one compound condition: a `&&`
    // here short-circuits, leaving a branch the coverage gate counts as unhit.
    const out = fixed(IMPORT_FORM);
    expect(out).toMatch(/extends EventEmitter\b/);
    expect(out).toMatch(/import \{[^}]*\bEventEmitter\b[^}]*\}/);
  });
});

describe('reporting is unaffected — this is not a demotion', () => {
  it('still reports the import form', () => {
    expect(reports(IMPORT_FORM)).toBeGreaterThan(0);
  });

  it('still reports the require form', () => {
    expect(reports(REQUIRE_FORM)).toBeGreaterThan(0);
  });
});

describe('an events import that is not EventEmitter', () => {
  /**
   * These cover the negative arms of the two "did this bring in EventEmitter"
   * checks, and they were previously covered only by accident: RuleTester
   * re-lints a fixer's output, and the broken fixer emitted
   * `import { EventTarget } from "events"` — an events import WITHOUT
   * EventEmitter, which happens to exercise the same path. Deleting the fixer
   * removed that accidental coverage and revealed there was no deliberate case.
   */
  it('ignores a named import from events that is not EventEmitter', () => {
    expect(reports('import { once } from "events";\nonce(x, "y");\n')).toBe(0);
  });

  it('ignores a require from events that is not EventEmitter', () => {
    expect(reports('const { once } = require("events");\nonce(x, "y");\n')).toBe(0);
  });
});
