/**
 * ESM Compatibility Tests for CWE Analytics Engine
 *
 * These tests ensure that the sync module is properly configured for ESM
 * and doesn't use CommonJS-only globals like __dirname directly.
 *
 * Prevents regressions where:
 * - __dirname or __filename are used without ESM polyfill
 * - import.meta.url is missing when needed
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SYNC_FILE = path.join(__dirname, '../src/lib/sync.ts');

describe('ESM Compatibility', () => {
  let syncContent: string;

  beforeAll(() => {
    syncContent = fs.readFileSync(SYNC_FILE, 'utf-8');
  });

  it('should use ESM-compatible __dirname pattern', () => {
    // Check that file uses fileURLToPath pattern for ESM compatibility
    const hasFileURLToPath = syncContent.includes('fileURLToPath');
    const hasImportMetaUrl = syncContent.includes('import.meta.url');

    // If __dirname is used, it should be defined using the ESM pattern
    const usesRawDirname = /\b__dirname\b/.test(syncContent);

    if (usesRawDirname) {
      expect(hasFileURLToPath).toBe(true);
      expect(hasImportMetaUrl).toBe(true);
    }
  });

  it('should not use require() in ESM module', () => {
    // Skip if the file uses CommonJS (has require)
    const usesRequire = /\brequire\s*\(/.test(syncContent);
    const hasEsmImport = /^import\s+/m.test(syncContent);

    // If it's an ESM module (has import statements), it shouldn't use require
    if (hasEsmImport) {
      expect(usesRequire).toBe(false);
    }
  });

  it('should define __dirname before use in code statements', () => {
    const lines = syncContent.split('\n');
    let dirnameDefinedLine = -1;
    let firstDirnameUsageLine = -1;

    lines.forEach((line, idx) => {
      // Skip empty lines and comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
        return;
      }

      // Check for definition pattern: const __dirname = ...
      if (/const\s+__dirname\s*=/.test(line) && dirnameDefinedLine === -1) {
        dirnameDefinedLine = idx;
      }

      // Check for usage in path.join or other code (but not definition line)
      if (
        /__dirname/.test(line) &&
        !/const\s+__dirname/.test(line) &&
        !/\/\/.*__dirname/.test(line) && // Skip inline comments mentioning __dirname
        firstDirnameUsageLine === -1
      ) {
        firstDirnameUsageLine = idx;
      }
    });

    // If __dirname is used, it should be defined first
    if (firstDirnameUsageLine !== -1 && dirnameDefinedLine !== -1) {
      expect(dirnameDefinedLine).toBeLessThan(firstDirnameUsageLine);
    }

    // If __dirname is used but never defined, that's an error
    if (firstDirnameUsageLine !== -1 && dirnameDefinedLine === -1) {
      expect.fail('__dirname is used but never defined - ESM modules require explicit __dirname definition');
    }
  });
});
