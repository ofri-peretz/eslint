/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests for no-cycle.
 *
 * The devkit dependency-analysis helpers are mocked (same approach as
 * no-cycle.test.ts) so every strategy/message/listener path of the rule can
 * be exercised deterministically without touching the file system.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cache = {
    reportedCycles: new Set<string>(),
    nonCyclicFiles: new Set<string>(),
    dependencies: new Map(),
    fileExists: new Map(),
    fileHashes: new Map(),
    compiledPatterns: new Map(),
    sccIndex: new Map<string, string>(),
    sccs: [] as string[][],
    sccComputed: false,
    graphHash: '',
    resolvedPaths: new Map(),
    pendingCycleReports: new Map(),
  };
  return {
    cache,
    clearCache: vi.fn(),
    shouldIgnoreFile: vi.fn((filename: string) => filename.includes('ignored')),
    isBarrelExport: vi.fn((file: string) => file.includes('barrel')),
    hasOnlyTypeImports: vi.fn((cycle: string[]) =>
      cycle.some((f) => f.includes('typesonly')),
    ),
    resolveImportPath: vi.fn((source: string) => {
      if (source.startsWith('./unresolvable')) return null;
      return `/repo/${source.replace('./', '')}.ts`;
    }),
    computeSCCsFromFile: vi.fn(
      (file: string, opts: { cache: { sccIndex: Map<string, string> } }) => {
        // Files containing 'lonely' never get an SCC assignment;
        // files containing 'othercomp' land in a different SCC.
        if (file.includes('lonely')) return;
        opts.cache.sccIndex.set(
          file,
          file.includes('othercomp') ? 'scc-other' : 'scc-0',
        );
      },
    ),
    findShortestCyclePath: vi.fn((src: string, tgt: string) => {
      if (tgt.includes('nopath')) return null;
      if (tgt.includes('offpath')) return ['/repo/off-1.ts', '/repo/off-2.ts'];
      return [src, tgt];
    }),
  };
});

vi.mock('@interlace/eslint-devkit', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRule: (data: any) => data,
  formatLLMMessage: () => 'mocked message {{cycle}}',
  MessageIcons: { ARCHITECTURE: 'ARCHITECTURE', WARNING: 'WARNING' },
  formatCycleDisplay: (cycle: string[]) => cycle.join(' -> '),
  getModuleNames: () => ['modA', 'modB'],
  getRelativeImportPath: () => './modB',
  getBasename: (p: string) => p.split('/').pop(),
  isBarrelExport: mocks.isBarrelExport,
  shouldIgnoreFile: mocks.shouldIgnoreFile,
  createFileSystemCache: () => mocks.cache,
  clearCache: mocks.clearCache,
  resolveImportPath: mocks.resolveImportPath,
  hasOnlyTypeImports: mocks.hasOnlyTypeImports,
  computeSCCsFromFile: mocks.computeSCCsFromFile,
  findShortestCyclePath: mocks.findShortestCyclePath,
}));

import { noCycle, clearCircularDependencyCache } from '../rules/no-cycle';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

beforeAll(() => {
  mocks.cache.nonCyclicFiles.add('/repo/noncyclic.ts');
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ruleTester.run('no-cycle (coverage)', noCycle as any, {
  valid: [
    {
      name: 'ignored files produce no listeners',
      code: `import a from './cyclic';`,
      filename: '/repo/ignored/file.ts',
    },
    {
      name: 'type-only imports are skipped',
      code: `import type { A } from './cyclic';`,
      filename: '/repo/source.ts',
    },
    {
      name: 'unresolvable imports are skipped',
      code: `import a from './unresolvable';`,
      filename: '/repo/source.ts',
    },
    {
      name: 'known non-cyclic targets short-circuit',
      code: `import a from './noncyclic';`,
      filename: '/repo/source.ts',
    },
    {
      name: 'target in a different SCC cannot form a cycle',
      code: `import a from './othercomp';`,
      filename: '/repo/source.ts',
    },
    {
      name: 'source without SCC assignment is skipped',
      code: `import a from './cyclic';`,
      filename: '/repo/lonely-source.ts',
    },
    {
      name: 'same SCC but no concrete cycle path found',
      code: `import a from './nopath';`,
      filename: '/repo/source.ts',
    },
    {
      name: 'local export without source is not a re-export',
      code: `export const x = 1;`,
      filename: '/repo/source.ts',
    },
    {
      name: 're-export of unresolvable module is skipped',
      code: `export { x } from './unresolvable';`,
      filename: '/repo/source.ts',
    },
    {
      name: 're-export of known non-cyclic target is skipped',
      code: `export { x } from './noncyclic';`,
      filename: '/repo/source.ts',
    },
    {
      name: 're-export into a different SCC is skipped',
      code: `export { x } from './othercomp';`,
      filename: '/repo/source.ts',
    },
    {
      name: 're-export when source has no SCC assignment is skipped',
      code: `export { x } from './cyclic';`,
      filename: '/repo/lonely-exporter.ts',
    },
  ],
  invalid: [
    {
      name: 'explicit module-split strategy',
      code: `import a from './cyclic';`,
      filename: '/repo/source.ts',
      options: [{ fixStrategy: 'module-split' }],
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'numbered module naming convention',
      code: `import a from './cyclic';`,
      filename: '/repo/source.ts',
      options: [
        { fixStrategy: 'module-split', moduleNamingConvention: 'numbered' },
      ],
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'explicit dependency-injection strategy',
      code: `import a from './cyclic';`,
      filename: '/repo/source.ts',
      options: [{ fixStrategy: 'dependency-injection' }],
      errors: [{ messageId: 'dependencyInjection' }],
    },
    {
      name: 'explicit extract-shared strategy',
      code: `import a from './cyclic';`,
      filename: '/repo/source.ts',
      options: [{ fixStrategy: 'extract-shared' }],
      errors: [{ messageId: 'extractShared' }],
    },
    {
      name: 'auto strategy picks direct-import for 2-file barrel cycles',
      code: `import a from './barrel-target';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'directImport' }],
    },
    {
      name: 'auto strategy picks extract-shared for type-only cycles',
      code: `import a from './typesonly-target';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'extractShared' }],
    },
    {
      name: 'auto strategy falls back to module-split',
      code: `import a from './cyclic';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'duplicate import statements each hit the warm SCC index',
      code: `import a from './cyclic';\nimport b from './cyclic';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }, { messageId: 'moduleSplit' }],
    },
    {
      name: 'cycle path that does not contain the source file is reported as-is',
      code: `import a from './offpath';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 're-exports close cycles too',
      code: `import a from './cyclic';\nexport { x } from './cyclic';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }, { messageId: 'moduleSplit' }],
    },
    {
      name: 're-export fast paths: import reports, nopath export does not',
      code: `import a from './cyclic';\nexport { x } from './nopath';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 're-export of a fresh target computes its SCC lazily',
      code: `import a from './cyclic';\nexport { x } from './fresh-tgt';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }, { messageId: 'moduleSplit' }],
    },
    {
      name: 're-export cycle path missing the source file is reported as-is',
      code: `import a from './cyclic';\nexport { x } from './offpath-exp';`,
      filename: '/repo/source.ts',
      errors: [{ messageId: 'moduleSplit' }, { messageId: 'moduleSplit' }],
    },
  ],
});

describe('no-cycle — Layer 2', () => {
  function mockContext(filename: string) {
    const reports: unknown[] = [];
    const context = {
      id: 'no-cycle',
      filename,
      physicalFilename: filename,
      cwd: '/repo',
      options: [{}],
      settings: {},
      sourceCode: { text: '' },
      getFilename: () => filename,
      getCwd: () => '/repo',
      report: (d: unknown) => {
        reports.push(d);
      },
    };
    return { context, reports };
  }

  it('clearCircularDependencyCache clears the shared cache', () => {
    mocks.clearCache.mockClear();
    clearCircularDependencyCache();
    expect(mocks.clearCache).toHaveBeenCalledTimes(1);
    expect(mocks.clearCache).toHaveBeenCalledWith(mocks.cache);
  });

  it('deduplicates repeat visits of the same import node', () => {
    const { context, reports } = mockContext('/repo/dedup-source.ts');
    const listeners = (
      noCycle as unknown as {
        create(c: unknown): Record<string, (n: unknown) => void>;
      }
    ).create(context);
    const node = {
      type: 'ImportDeclaration',
      importKind: 'value',
      source: { type: 'Literal', value: './cyclic' },
    };
    listeners.ImportDeclaration(node);
    listeners.ImportDeclaration(node);
    expect(reports).toHaveLength(1);
  });

  it('deduplicates repeat visits of the same re-export node', () => {
    const { context, reports } = mockContext('/repo/dedup-export-source.ts');
    const listeners = (
      noCycle as unknown as {
        create(c: unknown): Record<string, (n: unknown) => void>;
      }
    ).create(context);
    // Prime the source SCC through an import first.
    listeners.ImportDeclaration({
      type: 'ImportDeclaration',
      importKind: 'value',
      source: { type: 'Literal', value: './cyclic' },
    });
    const exportNode = {
      type: 'ExportNamedDeclaration',
      source: { type: 'Literal', value: './cyclic' },
    };
    listeners.ExportNamedDeclaration(exportNode);
    listeners.ExportNamedDeclaration(exportNode);
    expect(reports).toHaveLength(2); // 1 import + 1 export, dedup blocked the repeat
  });

  it('Program listener is a no-op', () => {
    const { context, reports } = mockContext('/repo/source.ts');
    const listeners = (
      noCycle as unknown as {
        create(c: unknown): Record<string, (n: unknown) => void>;
      }
    ).create(context);
    listeners.Program({ type: 'Program' });
    expect(reports).toEqual([]);
  });
});
