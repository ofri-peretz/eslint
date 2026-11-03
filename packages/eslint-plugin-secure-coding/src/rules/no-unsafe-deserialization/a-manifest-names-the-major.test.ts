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
        name: 'js-yaml v3 load on request input is unsafe deserialization',
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

/** A directory whose `package.json` is exactly `manifest`. */
function projectWith(manifest: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), 'js-yaml-manifest-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  return root;
}

/** A workspace package at `root/packages/app` with its own manifest. */
function workspacePackage(root: string, manifest: Record<string, unknown>) {
  const pkg = join(root, 'packages', 'app');
  mkdirSync(join(pkg, 'src'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify(manifest));
  return pkg;
}

const devOnly = projectWith({ devDependencies: { 'js-yaml': '^4.1.0' } });
const peerOnly = projectWith({
  dependencies: {},
  peerDependencies: { 'js-yaml': '^4.1.0' },
});
const twoDigitMajor = projectWith({ dependencies: { 'js-yaml': '^10.0.0' } });
const hoisted = projectWith({ devDependencies: { 'js-yaml': '^4.1.0' } });
const hoistedApp = workspacePackage(hoisted, {
  dependencies: { express: '^4.0.0' },
});
const workspaceRange = projectWith({
  devDependencies: { 'js-yaml': '^4.1.0' },
});
const workspaceRangeApp = workspacePackage(workspaceRange, {
  dependencies: { 'js-yaml': 'workspace:*' },
});
const farAbove = projectWith({ dependencies: { 'js-yaml': '^4.1.0' } });
// The manifest that pins v4 is the thirteenth directory up: one past the walk.
const farBelow = join(farAbove, ...'abcdefghijkl'.split(''));
mkdirSync(farBelow, { recursive: true });

afterAll(() => {
  for (const dir of [
    devOnly,
    peerOnly,
    twoDigitMajor,
    hoisted,
    workspaceRange,
    farAbove,
  ]) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SERIALIZE = [
  "import { unserialize } from 'node-serialize';",
  'export function restore(req) { return unserialize(req.body.session); }',
].join('\n');

ruleTester.run(
  'no-unsafe-deserialization — which manifest field and which manifest',
  noUnsafeDeserialization,
  {
    valid: [
      {
        name: 'a devDependencies-only declaration still names the major',
        code: LOAD,
        filename: join(devOnly, 'i18n.js'),
      },
      {
        name: 'a peerDependencies declaration is read when dependencies names other packages',
        code: LOAD,
        filename: join(peerOnly, 'i18n.js'),
      },
      {
        name: 'a two-digit major is read whole',
        code: LOAD,
        filename: join(twoDigitMajor, 'i18n.js'),
      },
      {
        name: 'a workspace package that does not name js-yaml reads the hoisted root declaration',
        code: LOAD,
        filename: join(hoistedApp, 'src', 'i18n.js'),
      },
    ],
    invalid: [
      {
        name: 'a digit-less workspace: range names no major, even under a root that pins v4',
        code: LOAD,
        filename: join(workspaceRangeApp, 'src', 'i18n.js'),
        errors: [{ messageId: 'unsafeYamlParsing' as const }],
      },
      {
        name: 'the walk gives up twelve directories above the file',
        code: LOAD,
        filename: join(farBelow, 'i18n.js'),
        errors: [{ messageId: 'unsafeYamlParsing' as const }],
      },
      {
        name: 'a js-yaml v4 pin does not make node-serialize safe',
        code: SERIALIZE,
        filename: join(v4, 'src', 'session.js'),
        errors: [{ messageId: 'unsafeDeserialization' as const }],
      },
    ],
  },
);
