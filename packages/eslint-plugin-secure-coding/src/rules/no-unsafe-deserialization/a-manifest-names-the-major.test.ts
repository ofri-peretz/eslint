/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * js-yaml v4 made `load` inert, and the manifest says which major is installed.
 *
 * The rule's own comment used to claim it "cannot see which major is
 * installed", so `yaml.load(file)` reported on every repository pinned to v4 —
 * including dwp/govuk-casa, the UK Department for Work and Pensions' service
 * framework, where it was the single finding across 156 files.
 *
 * These cases need a real directory because the lookup walks up from the linted
 * file to the nearest `package.json`. A RuleTester `filename` alone would not
 * do it: there has to be a manifest on disk to read.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { afterAll, describe, it } from 'vitest';

import { noUnsafeDeserialization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

/** A project directory whose manifest declares js-yaml at `range`. */
function projectPinnedTo(range: string | null): string {
  const root = mkdtempSync(join(tmpdir(), 'js-yaml-major-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(
      range === null
        ? { name: 'fixture', dependencies: { express: '^4.0.0' } }
        : { name: 'fixture', dependencies: { 'js-yaml': range } },
    ),
  );
  return root;
}

const v4 = projectPinnedTo('^4.1.0');
const v3 = projectPinnedTo('3.14.1');
const unstated = projectPinnedTo(null);
const wildcard = projectPinnedTo('*');

afterAll(() => {
  for (const dir of [v4, v3, unstated, wildcard]) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const LOAD = [
  "import yaml from 'js-yaml';",
  'export function parseUpload(req) { return yaml.load(req.body.document); }',
].join('\n');

ruleTester.run(
  'no-unsafe-deserialization — the manifest names the major',
  noUnsafeDeserialization,
  {
    valid: [
      // v4: `load` is what v3 called `safeLoad`.
      { code: LOAD, filename: join(v4, 'src', 'i18n.js') },
      // Nested one directory deeper — the walk finds the same manifest.
      { code: LOAD, filename: join(v4, 'src', 'deep', 'nested', 'i18n.js') },
    ],
    invalid: [
      // v3: `load` builds JS objects from `!!js/function` tags.
      {
        code: LOAD,
        filename: join(v3, 'src', 'i18n.js'),
        errors: [{ messageId: 'unsafeYamlParsing' as const }],
      },
      // A range with no digits in it — `*` or `latest` — names no major, so
      // nothing is known and the finding stands.
      {
        code: LOAD,
        filename: join(wildcard, 'src', 'i18n.js'),
        errors: [{ messageId: 'unsafeYamlParsing' as const }],
      },
      // Nothing declares js-yaml, so nothing is known and the finding stands.
      {
        code: LOAD,
        filename: join(unstated, 'src', 'i18n.js'),
        errors: [{ messageId: 'unsafeYamlParsing' as const }],
      },
    ],
  },
);
