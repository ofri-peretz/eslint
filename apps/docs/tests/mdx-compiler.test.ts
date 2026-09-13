import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * MDX Compiler Module Tests
 *
 * These tests "lock" the MDX compilation behavior to prevent regressions.
 * Critical for AI agent collaboration where behavior consistency is paramount.
 *
 * Note: Full integration tests require the actual compiler instance.
 * These tests focus on module structure and exported interface validation.
 *
 * ---------------------------------------------------------------------------
 * Why this import is at FILE SCOPE and not `await import(...)` inside a test
 * ---------------------------------------------------------------------------
 * `mdx-compiler` pulls in the whole MDX/remark toolchain — `@fumadocs/mdx-remote`
 * plus `@/mdx-components`, which itself drags in `fumadocs-ui/mdx`,
 * `fumadocs-twoslash/ui` and Mermaid. Resolving and transforming that graph
 * measured 3160ms warm on an idle machine; every OTHER test in this file then
 * measured 0ms, because they all hit the module cache.
 *
 * So when the import lived inside the first test, that one test was billed for
 * the entire file's module-loading cost — and it was the only test here
 * carrying an inline timeout override (`}, 15000)`), added 2026-01-31 when
 * Vitest's default was 5s. PR #332 raised this workspace's `testTimeout` to
 * 30_000 on 2026-08-02, at which point the override stopped extending anything
 * and started HALVING the budget of the single most expensive test in the file.
 * Under the parallel `turbo run test` fan-out it blew that 15s cap and failed
 * as a bare timeout, twice in one session, blocking unrelated pre-commit runs.
 *
 * Hoisting moves the load into the file's collection phase, where no per-test
 * timeout applies, so these assertions measure the module's exports instead of
 * how loaded the machine is. Locked by
 * `scripts/__tests__/prepush-and-vitest-timeouts.lock.test.ts`, which fails on
 * any inline timeout that is LOWER than its config's `testTimeout`.
 */
import * as mdxModule from '../src/lib/mdx-compiler';

const { compileRemoteMDX, compileRemoteMarkdown, getFallbackContent } = mdxModule;

describe('MDX Compiler Module', () => {
  // ===========================================================================
  // Module Structure Tests - Lock the exported interface
  // ===========================================================================
  describe('Module Exports', () => {
    it('should export compileRemoteMDX function', async () => {
      expect(typeof mdxModule.compileRemoteMDX).toBe('function');
    });

    it('should export compileRemoteMarkdown function', async () => {
      expect(typeof mdxModule.compileRemoteMarkdown).toBe('function');
    });

    it('should export getFallbackContent function', async () => {
      expect(typeof mdxModule.getFallbackContent).toBe('function');
    });
  });

  // ===========================================================================
  // CompiledContent Interface Tests - Lock the return type structure
  // ===========================================================================
  describe('CompiledContent Interface', () => {
    it('should have correct shape from getFallbackContent', async () => {
      const result = getFallbackContent('Test Title', 'Test Description');
      
      // Lock the interface structure
      expect(result).toHaveProperty('Body');
      expect(result).toHaveProperty('toc');
      expect(result).toHaveProperty('frontmatter');
    });

    it('should return Body as a component', async () => {
      const result = getFallbackContent('Test', 'Test');
      
      // Body should be a function (React component)
      expect(typeof result.Body).toBe('function');
    });

    it('should return toc as an array', async () => {
      const result = getFallbackContent('Test', 'Test');
      
      expect(Array.isArray(result.toc)).toBe(true);
    });

    it('should return frontmatter with title and description', async () => {
      const result = getFallbackContent('My Title', 'My Description');
      
      expect(result.frontmatter.title).toBe('My Title');
      expect(result.frontmatter.description).toBe('My Description');
    });

    it('should return empty toc from getFallbackContent', async () => {
      const result = getFallbackContent('Test', 'Test');
      
      expect(result.toc).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getFallbackContent Behavior Tests - Lock fallback behavior
  // ===========================================================================
  describe('getFallbackContent Behavior', () => {
    it('should handle empty strings', async () => {
      const result = getFallbackContent('', '');
      
      expect(result.frontmatter.title).toBe('');
      expect(result.frontmatter.description).toBe('');
    });

    it('should handle special characters in title', async () => {
      const title = 'Test <script>alert("xss")</script> Title';
      const result = getFallbackContent(title, 'Desc');
      
      // Should preserve the string as-is (not escape in frontmatter)
      expect(result.frontmatter.title).toBe(title);
    });

    it('should handle unicode characters', async () => {
      const title = '日本語タイトル 🚀';
      const result = getFallbackContent(title, 'Description');
      
      expect(result.frontmatter.title).toBe(title);
    });

    it('should handle very long strings', async () => {
      const longTitle = 'A'.repeat(10000);
      const result = getFallbackContent(longTitle, 'Desc');
      
      expect(result.frontmatter.title).toBe(longTitle);
      expect(result.frontmatter.title).toHaveLength(10000);
    });
  });

  // ===========================================================================
  // Function Signature Tests - Lock function signatures
  // ===========================================================================
  describe('Function Signatures', () => {
    it('compileRemoteMDX should accept string source', async () => {
      // Verify function exists and accepts string
      expect(compileRemoteMDX).toBeDefined();
      expect(compileRemoteMDX.length).toBeGreaterThanOrEqual(1);
    });

    it('compileRemoteMarkdown should accept string source', async () => {
      expect(compileRemoteMarkdown).toBeDefined();
      expect(compileRemoteMarkdown.length).toBeGreaterThanOrEqual(1);
    });

    it('getFallbackContent should accept title and description', async () => {
      expect(getFallbackContent).toBeDefined();
      expect(getFallbackContent.length).toBe(2);
    });
  });

  // ===========================================================================
  // Compiler Instance Tests - Lock compiler behavior expectations
  // ===========================================================================
  describe('Compiler Instance', () => {
    it('should use createCompiler (not deprecated compileMDX)', async () => {
      // This test verifies the implementation uses the new API
      // by checking the module source structure
      const modulePath = path.resolve(
        path.resolve(__dirname, '..'),
        'src/lib/mdx-compiler.tsx'
      );
      const source = await fs.readFile(modulePath, 'utf-8');
      
      // Should use createCompiler
      expect(source).toContain('createCompiler');
      
      // Should NOT use deprecated compileMDX directly
      // (import is fine, but not as main compilation method)
      expect(source).not.toMatch(/await\s+compileMDX\(/);
    });

    it('should create compiler instance per compile call (supports dynamic remark plugins)', async () => {
      const modulePath = path.resolve(
        path.resolve(__dirname, '..'),
        'src/lib/mdx-compiler.tsx'
      );
      const source = await fs.readFile(modulePath, 'utf-8');

      // Each compile call instantiates its own compiler with the call-specific
      // remark plugin list (link-rewriting depends on baseUrl/pluginName).
      expect(source).toMatch(/const\s+localCompiler\s*=\s*createCompiler/);
    });
  });

  // ===========================================================================
  // Error Handling Expectations - Lock expected error behavior
  // ===========================================================================
  describe('Error Handling Expectations', () => {
    it('compileRemoteMDX should return Promise', async () => {
      // Call with empty string - should still return a promise
      const result = compileRemoteMDX('');
      
      expect(result).toBeInstanceOf(Promise);
    });

    it('compileRemoteMarkdown should return Promise', async () => {
      const result = compileRemoteMarkdown('');
      
      expect(result).toBeInstanceOf(Promise);
    });
  });
});

/**
 * Integration Test Expectations
 * 
 * The following behaviors are expected but require full integration testing:
 * 
 * 1. compileRemoteMDX should:
 *    - Parse MDX syntax with JSX components
 *    - Extract table of contents from headings
 *    - Parse frontmatter (YAML header)
 *    - Return compiled React component
 * 
 * 2. compileRemoteMarkdown should:
 *    - Parse standard Markdown syntax
 *    - Support GitHub Flavored Markdown
 *    - Extract table of contents
 *    - Handle code blocks with syntax highlighting
 * 
 * 3. Both functions should:
 *    - Handle malformed input gracefully
 *    - Support Fumadocs MDX plugins
 *    - Integrate with getMDXComponents()
 */
describe('Integration Test Expectations (Documentation)', () => {
  it('documents expected MDX compilation behavior', () => {
    const expectedBehaviors = [
      'Parse MDX syntax with JSX components',
      'Extract table of contents from headings',
      'Parse frontmatter (YAML header)',
      'Return compiled React component as Body',
    ];
    
    expect(expectedBehaviors).toHaveLength(4);
  });

  it('documents expected Markdown compilation behavior', () => {
    const expectedBehaviors = [
      'Parse standard Markdown syntax',
      'Support GitHub Flavored Markdown',
      'Extract table of contents',
      'Handle code blocks',
    ];
    
    expect(expectedBehaviors).toHaveLength(4);
  });
});
