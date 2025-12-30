
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, vi, beforeEach } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noRelativePackages } from '../rules/no-relative-packages';
import * as fs from 'node:fs';

// Mock fs
vi.mock('node:fs');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

describe('no-relative-packages - Unit Tests', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should report error for cross-package import', () => {
        // Mock file system structure
        // /app/packages/pkg-a/src/index.ts (Current)
        // /app/packages/pkg-b/src/index.ts (Target)

        const currentFile = '/app/packages/pkg-a/src/index.ts';
        
        // fs.existsSync
        vi.mocked(fs.existsSync).mockImplementation((p) => {
            const pStr = p as string;
            // The rule calls findPackageJson which walks up the tree checking for package.json
            if (pStr === '/app/packages/pkg-a/package.json') return true;
            if (pStr === '/app/packages/pkg-b/package.json') return true;
            return false;
        });

        // fs.readFileSync
        vi.mocked(fs.readFileSync).mockImplementation((p) => {
           const pStr = p as string;
           if (pStr === '/app/packages/pkg-a/package.json') return JSON.stringify({ name: 'pkg-a' });
           if (pStr === '/app/packages/pkg-b/package.json') return JSON.stringify({ name: 'pkg-b' });
           // Default return for other files
           return '';
        });

        ruleTester.run('no-relative-packages-unit', noRelativePackages, {
            valid: [],
            invalid: [
                {
                    code: "import { b } from '../../pkg-b/src/index';",
                    // RuleTester creates a temp file. We need to override context.getFilename().
                    // But we can't easily.
                    // HOWEVER, createRule allows us to pass filename in options!
                    filename: currentFile,
                    errors: [{
                        messageId: 'relativePackage',
                        data: {
                            importPath: '../../pkg-b/src/index',
                            packageName: 'pkg-b'
                        }
                    }]
                }
            ]
        });
    });
});
