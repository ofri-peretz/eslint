/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: every rule runs with its DOCUMENTED default options.
 *
 * devkit's `createRule` merges `defaultOptions` and passes the result as the
 * second argument of `create(context, [options])`; `context.options` stays the
 * raw user config, which is `[]` for anyone using a preset. Until the
 * 2026-10-10 FP/FN audit, 18 of 19 rules read `context.options` and fell back to
 * a shorter hard-coded list — so `require-tool-confirmation` documented `send`,
 * `pay` and `exec` as destructive but never checked them.
 *
 * The behavioural half of this lock is in the require-tool-confirmation suite
 * ("documented default patterns apply: sendEmail is flagged"). This half fails
 * the moment any rule goes back to reading `context.options`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RULES_DIR = join(__dirname, 'rules');
const rules = readdirSync(RULES_DIR);

describe('rule options come from the merged defaults', () => {
  it('scans every rule directory', () => {
    expect(rules).toHaveLength(19);
  });

  it.each(rules)('%s does not destructure context.options', (rule) => {
    const source = readFileSync(join(RULES_DIR, rule, 'index.ts'), 'utf8');
    expect(source).not.toMatch(/=\s*context\.options\b/);
  });
});
