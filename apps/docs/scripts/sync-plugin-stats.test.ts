
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countRulesInPackage, getPackageMetadata, getCategory, firstSentence } from './sync-plugin-stats.ts';
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
  
  describe('firstSentence', () => {
    it('keeps dotted terms intact', () => {
      expect(
        firstSentence(
          'Security-focused ESLint plugin for Node.js built-in modules (fs, child_process). Detects command injection.',
        ),
      ).toBe('Security-focused ESLint plugin for Node.js built-in modules (fs, child_process)');
      expect(
        firstSentence('Security-focused ESLint plugin for Express.js applications. Detects insecure cookies.'),
      ).toBe('Security-focused ESLint plugin for Express.js applications');
    });

    it('handles a single sentence, a trailing period, and no description', () => {
      expect(firstSentence('ESLint rules for team conventions.')).toBe('ESLint rules for team conventions');
      expect(firstSentence('No trailing period here')).toBe('No trailing period here');
      expect(firstSentence(undefined)).toBe('');
    });
  });

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
