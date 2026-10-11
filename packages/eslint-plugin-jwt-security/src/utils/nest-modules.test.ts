/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file `JwtModule` registration reading (`nest-modules.ts`).
 *
 * Each case builds a throwaway package on disk — a `package.json` and the
 * `*.module.ts` files under it — and asks what its registrations say about
 * `signOptions.expiresIn`. The answer must be `unknown` whenever any part of
 * it cannot be read, and the reader must never throw.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as tsParser from '@typescript-eslint/parser';
import * as espree from 'espree';
import { nestModuleExpiry } from './nest-modules';

const project = (files: Record<string, string>): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-nest-unit-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}');
  for (const [file, source] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), source);
  }
  return path.join(root, 'src', 'auth.service.ts');
};

const IMPORT = "import { JwtModule } from '@nestjs/jwt';\n";

afterEach(() => {
  vi.restoreAllMocks();
});

describe('nestModuleExpiry', () => {
  it.each([
    [
      'a namespace import binds no JwtModule name',
      "import * as nest from '@nestjs/jwt';\nnest.JwtModule.register({ secret: 's' });",
      'unknown',
    ],
    [
      'a string-named import of JwtModule',
      "import { 'JwtModule' as JM } from '@nestjs/jwt';\nJM.register({ secret: 's' });",
      'missing',
    ],
    [
      'another export of @nestjs/jwt is not JwtModule',
      "import { JwtService } from '@nestjs/jwt';\nJwtService.register({ secret: 's' }); // JwtModule",
      'unknown',
    ],
    [
      'a CommonJS destructure with a rest and another key',
      "const { JwtService, JwtModule: JM, ...rest } = require('@nestjs/jwt');\nconst whole = require('@nestjs/jwt');\nJM.register({ signOptions: { expiresIn: 60 } });",
      'set',
    ],
    [
      'options from a destructured or non-object const',
      IMPORT +
        'const { a } = x;\nconst opts = load();\nconst other = { signOptions: {} };\nJwtModule.register(opts);',
      'unknown',
    ],
    [
      'a spread that may carry signOptions',
      IMPORT + 'JwtModule.register({ ...base });',
      'unknown',
    ],
    [
      'signOptions that cannot be read',
      IMPORT + 'JwtModule.register({ signOptions: shared });',
      'unknown',
    ],
    [
      'signOptions with a spread that may carry expiresIn',
      IMPORT + 'JwtModule.register({ signOptions: { ...defaults } });',
      'unknown',
    ],
    [
      'signOptions without expiresIn',
      IMPORT + "JwtModule.register({ signOptions: { algorithm: 'HS256' } });",
      'missing',
    ],
    ['register with no arguments', IMPORT + 'JwtModule.register();', 'unknown'],
    [
      'registerAsync with options it cannot read',
      IMPORT + 'JwtModule.registerAsync(asyncOptions);',
      'unknown',
    ],
    [
      'registerAsync with a factory that is not a function',
      IMPORT + 'JwtModule.registerAsync({ useFactory: makeOptions });',
      'unknown',
    ],
  ])('%s', (_name, source, expected) => {
    expect(
      nestModuleExpiry(project({ 'src/app.module.ts': source }), tsParser),
    ).toBe(expected);
  });

  it('caches the verdict per package root', () => {
    const file = project({
      'src/app.module.ts':
        IMPORT + "JwtModule.register({ signOptions: { expiresIn: '1h' } });",
    });
    expect(nestModuleExpiry(file, tsParser)).toBe('set');
    fs.rmSync(path.join(path.dirname(file), 'app.module.ts'));
    expect(nestModuleExpiry(file, tsParser)).toBe('set');
  });

  it('falls back to @typescript-eslint/parser when the configured parser cannot read TypeScript', () => {
    const file = project({
      'src/app.module.ts':
        IMPORT +
        'class A { constructor(private readonly x: string) {} }\nJwtModule.register({ secret: "s" });',
    });
    expect(nestModuleExpiry(file, espree)).toBe('missing');
  });

  it('abstains when neither the configured parser nor the fallback can be loaded', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(os.tmpdir());
    const file = project({
      'src/app.module.ts': IMPORT + 'JwtModule.register({ secret: "s" });',
    });
    expect(nestModuleExpiry(file, undefined)).toBe('unknown');
  });

  it('skips a module file that cannot be read', () => {
    const file = project({
      'src/app.module.ts':
        IMPORT + "JwtModule.register({ signOptions: { expiresIn: '1h' } });",
    });
    fs.symlinkSync(
      path.join(path.dirname(file), 'missing-target.ts'),
      path.join(path.dirname(file), 'dangling.module.ts'),
    );
    expect(nestModuleExpiry(file, tsParser)).toBe('set');
  });

  it('skips a directory that cannot be listed', () => {
    const file = project({
      'src/app.module.ts':
        IMPORT + "JwtModule.register({ signOptions: { expiresIn: '1h' } });",
    });
    const locked = path.join(path.dirname(file), 'locked');
    fs.mkdirSync(locked);
    fs.chmodSync(locked, 0o000);
    try {
      expect(nestModuleExpiry(file, tsParser)).toBe('set');
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  });
});
