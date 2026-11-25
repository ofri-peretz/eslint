/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The export map without TypeScript installed, and with a TypeScript that
 * throws reading the tsconfig: `esModuleInterop` reads as off, and a plain
 * JavaScript module is read as ever. `typescript` is an optional peer.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, describe, expect, it, vi } from 'vitest';

const peer = vi.hoisted(() => ({ ts: null as unknown }));
vi.mock('./typescript-peer', () => ({ loadTypeScript: () => peer.ts }));

import { clearExportMapCache, exportMapOf } from './export-map';

const espree = createRequire(__filename)('espree');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'import-next-no-ts-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));
fs.writeFileSync(path.join(ROOT, 'm.js'), 'export const a = 1;');

const read = () =>
  exportMapOf('./m', {
    filename: path.join(ROOT, 'x.js'),
    settings: {},
    languageOptions: {
      parser: espree,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  } as never);

describe('export map without a working TypeScript', () => {
  it('no TypeScript: no default is added', () => {
    clearExportMapCache();
    peer.ts = null;
    expect([...read()!.namespace.keys()]).toEqual(['a']);
  });

  it('a TypeScript that throws: no default is added', () => {
    clearExportMapCache();
    peer.ts = {
      sys: {},
      findConfigFile: () => {
        throw new Error('unreadable');
      },
    };
    expect([...read()!.namespace.keys()]).toEqual(['a']);
  });
});
