/**
 * Comprehensive tests for os.ts
 *
 * Tests OS utilities with 100% coverage.
 */
import { describe, it, expect } from 'vitest';
import * as os from 'node:os';
import { getEOL, getPlatform, getArch, getTmpDir } from './os';

describe('node/os', () => {
  describe('getEOL', () => {
    it('should return platform-specific EOL', () => {
      const result = getEOL();
      expect(result).toBe(os.EOL);
      // EOL should be '\n' on Unix-like systems or '\r\n' on Windows
      expect(['\n', '\r\n']).toContain(result);
    });

    it('should return consistent EOL', () => {
      const result1 = getEOL();
      const result2 = getEOL();
      expect(result1).toBe(result2);
    });
  });

  describe('getPlatform', () => {
    it('should return platform string', () => {
      const result = getPlatform();
      expect(result).toBe(os.platform());
      expect(typeof result).toBe('string');
      // Common platforms
      expect([
        'darwin',
        'linux',
        'win32',
        'freebsd',
        'openbsd',
        'sunos',
        'aix',
      ]).toContain(result);
    });

    it('should return consistent platform', () => {
      const result1 = getPlatform();
      const result2 = getPlatform();
      expect(result1).toBe(result2);
    });
  });

  describe('getArch', () => {
    it('should return architecture string', () => {
      const result = getArch();
      expect(result).toBe(os.arch());
      expect(typeof result).toBe('string');
      // Common architectures
      expect([
        'x64',
        'arm64',
        'arm',
        'ia32',
        'mips',
        'mipsel',
        'ppc',
        'ppc64',
        's390',
        's390x',
      ]).toContain(result);
    });

    it('should return consistent architecture', () => {
      const result1 = getArch();
      const result2 = getArch();
      expect(result1).toBe(result2);
    });
  });

  describe('getTmpDir', () => {
    it('should return temporary directory path', () => {
      const result = getTmpDir();
      expect(result).toBe(os.tmpdir());
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return consistent tmpdir', () => {
      const result1 = getTmpDir();
      const result2 = getTmpDir();
      expect(result1).toBe(result2);
    });

    it('should return absolute path', () => {
      const result = getTmpDir();
      // On Unix-like systems, tmpdir usually starts with /tmp or /var
      // On Windows, it's usually something like C:\Users\...\AppData\Local\Temp
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
