
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, afterAll, vi, beforeAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noRelativePackages } from '../rules/no-relative-packages';
import * as fs from 'node:fs';

// Mock fs
vi.mock('node:fs');

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
// Note: RuleTester.it is intentionally not set - let RuleTester create its own tests

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

// Set up mocks before all tests run
beforeAll(() => {
    // Mock file system structure
    // /app/packages/pkg-a/src/index.ts (Current)
    // /app/packages/pkg-b/src/index.ts (Target)

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
});

// ruleTester.run() creates its own describe/it blocks - don't nest inside it()
ruleTester.run('no-relative-packages-unit', noRelativePackages, {
    valid: [],
    invalid: [
        {
            code: "import { b } from '../../pkg-b/src/index';",
            filename: '/app/packages/pkg-a/src/index.ts',
            errors: [{
                messageId: 'relativePackage',
                data: {
                    importPath: '../../pkg-b/src/index',
                    packageName: 'pkg-b'
                }
            }],
            output: "import { b } from 'pkg-b/src/index';"
        }
    ]
});
