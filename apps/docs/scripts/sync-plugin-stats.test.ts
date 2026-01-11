
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countRulesInPackage, getPackageMetadata, getCategory } from './sync-plugin-stats.mjs';
import fs from 'fs';
import path from 'path';

// Mock fs and path
vi.mock('fs');
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal() as typeof path;
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
    dirname: (p: string) => p.substring(0, p.lastIndexOf('/'))
  };
});

describe('sync-plugin-stats', () => {
  
  describe('getCategory', () => {
    it('should classify framework plugins', () => {
      expect(getCategory('eslint-plugin-express-security')).toBe('framework');
      expect(getCategory('eslint-plugin-nestjs-security')).toBe('framework');
      expect(getCategory('eslint-plugin-lambda-security')).toBe('framework');
    });

    it('should classify architecture plugins', () => {
      expect(getCategory('eslint-plugin-architecture')).toBe('architecture');
      expect(getCategory('eslint-plugin-import-next')).toBe('architecture');
    });
    
    it('should classify quality plugins', () => {
        expect(getCategory('eslint-plugin-quality')).toBe('quality');
    });

    it('should classify react plugins', () => {
        expect(getCategory('eslint-plugin-react-features')).toBe('react');
    });

    it('should default to security', () => {
      expect(getCategory('eslint-plugin-random')).toBe('security');
      expect(getCategory('eslint-plugin-secure-coding')).toBe('security');
    });
  });

  describe('countRulesInPackage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return 0 if index.ts does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(countRulesInPackage('/fake/path')).toBe(0);
    });

    it('should count rules correctly based on regex', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const mockContent = `
        export const rules = {
          'rule-one': ruleOne,
          'rule-two': ruleTwo,
          'rule-three': ruleThree,
        };
      `;
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);
      expect(countRulesInPackage('/fake/path')).toBe(3);
    });

    it('should handle empty rules object', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const mockContent = `export const rules = {};`;
        vi.mocked(fs.readFileSync).mockReturnValue(mockContent);
        expect(countRulesInPackage('/fake/path')).toBe(0);
    });
  });

  describe('getPackageMetadata', () => {
      beforeEach(() => {
          vi.resetAllMocks();
      });

      it('should return null if package.json missing', () => {
          vi.mocked(fs.existsSync).mockReturnValue(false);
          expect(getPackageMetadata('/fake/path')).toBeNull();
      });

      it('should parse metadata correctly', () => {
          vi.mocked(fs.existsSync).mockReturnValue(true);
          const mockJson = JSON.stringify({
              name: 'pkg-name',
              description: 'pkg desc',
              version: '1.0.0',
              private: true
          });
          vi.mocked(fs.readFileSync).mockReturnValue(mockJson);
          
          const metadata = getPackageMetadata('/fake/path');
          expect(metadata).toEqual({
              name: 'pkg-name',
              description: 'pkg desc',
              version: '1.0.0',
              private: true
          });
      });
  });
});
