/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every documented option must exist, and every option must be documented.
 *
 * Rule docs drift the moment an option is added or removed, and the drift is
 * invisible: nothing imports the markdown. `require-class-validator.md`
 * advertised `checkResponseDtos` and `responseDtoPattern` — both removed —
 * while omitting `validatorDecorators` and `checkGraphqlInputs`, so a reader
 * following the docs would have configured two keys that
 * `additionalProperties: false` rejects outright.
 *
 * The schema is the source of truth here, because it is what ESLint enforces.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { rules } from './index';

const DOCS = path.resolve(import.meta.dirname, '../docs/rules');

/** Option names the rule's JSON schema actually accepts. */
function schemaOptions(rule: string): string[] {
  const schema = rules[rule].meta.schema;
  if (!Array.isArray(schema) || schema.length === 0) return [];
  const first = schema[0] as { properties?: Record<string, unknown> };
  return Object.keys(first.properties ?? {}).sort();
}

/**
 * Option names the doc's `## Options` section declares.
 *
 * Two heading names and two body shapes are in use across the pages, and all
 * are accepted: `## Options` or `## ⚙️ Configuration`, holding either a
 * TypeScript block of `name?: type;` lines or a markdown table whose first
 * column is a back-ticked option name. Requiring one house style would be a
 * docs cleanup, not a correctness check, and this test is about correctness.
 */
function documentedOptions(rule: string): string[] {
  const file = path.join(DOCS, `${rule}.md`);
  const body = fs.readFileSync(file, 'utf8');
  // Pages use either `## Options` or `## ⚙️ Configuration` for this.
  const section =
    body.split('\n## Options')[1] ?? body.split(/\n## [^\n]*Configuration/)[1];
  if (!section) return [];
  // Stop at the next heading so a later section's table is not counted.
  const scope = section.split(/\n## /)[0];

  const fromBlock = (scope.split('```')[1] ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) => !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'),
    )
    .flatMap((l) => {
      const m = /^([A-Za-z_$][\w$]*)\??\s*:/.exec(l);
      return m ? [m[1]] : [];
    });

  const fromTable = scope.split('\n').flatMap((l) => {
    const m = /^\|\s*`([A-Za-z_$][\w$]*)`\s*\|/.exec(l.trim());
    return m ? [m[1]] : [];
  });

  return [...new Set([...fromBlock, ...fromTable])].sort();
}

describe('rule docs list exactly the options the schema accepts', () => {
  const names = Object.keys(rules);

  it.each(names)('%s has a doc page', (rule) => {
    expect(fs.existsSync(path.join(DOCS, `${rule}.md`))).toBe(true);
  });

  it.each(names)('%s documents every schema option, and no others', (rule) => {
    expect(documentedOptions(rule)).toEqual(schemaOptions(rule));
  });
});
