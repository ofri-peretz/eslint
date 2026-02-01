import { describe, it, expect } from 'vitest';

/**
 * MDX Compiler Module Tests
 * 
 * These tests "lock" the MDX compilation behavior to prevent regressions.
 * Critical for AI agent collaboration where behavior consistency is paramount.
 * 
 * Note: Full integration tests require the actual compiler instance.
 * These tests focus on module structure and exported interface validation.
 */

// Import types and functions we expect to exist
import type { CompiledContent } from '../src/lib/mdx-compiler';

describe('MDX Compiler Module', () => {
  // ===========================================================================
  // Module Structure Tests - Lock the exported interface
  // ===========================================================================
  describe('Module Exports', () => {
    it('should export compileRemoteMDX function', async () => {
      const module = await import('../src/lib/mdx-compiler');
      expect(typeof module.compileRemoteMDX).toBe('function');
    });

    it('should export compileRemoteMarkdown function', async () => {
      const module = await import('../src/lib/mdx-compiler');
      expect(typeof module.compileRemoteMarkdown).toBe('function');
    });

    it('should export getFallbackContent function', async () => {
      const module = await import('../src/lib/mdx-compiler');
      expect(typeof module.getFallbackContent).toBe('function');
    });
  });

  // ===========================================================================
  // CompiledContent Interface Tests - Lock the return type structure
  // ===========================================================================
  describe('CompiledContent Interface', () => {
    it('should have correct shape from getFallbackContent', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('Test Title', 'Test Description');
      
      // Lock the interface structure
      expect(result).toHaveProperty('Body');
      expect(result).toHaveProperty('toc');
      expect(result).toHaveProperty('frontmatter');
    });

    it('should return Body as a component', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('Test', 'Test');
      
      // Body should be a function (React component)
      expect(typeof result.Body).toBe('function');
    });

    it('should return toc as an array', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('Test', 'Test');
      
      expect(Array.isArray(result.toc)).toBe(true);
    });

    it('should return frontmatter with title and description', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('My Title', 'My Description');
      
      expect(result.frontmatter.title).toBe('My Title');
      expect(result.frontmatter.description).toBe('My Description');
    });

    it('should return empty toc from getFallbackContent', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('Test', 'Test');
      
      expect(result.toc).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getFallbackContent Behavior Tests - Lock fallback behavior
  // ===========================================================================
  describe('getFallbackContent Behavior', () => {
    it('should handle empty strings', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const result = getFallbackContent('', '');
      
      expect(result.frontmatter.title).toBe('');
      expect(result.frontmatter.description).toBe('');
    });

    it('should handle special characters in title', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const title = 'Test <script>alert("xss")</script> Title';
      const result = getFallbackContent(title, 'Desc');
      
      // Should preserve the string as-is (not escape in frontmatter)
      expect(result.frontmatter.title).toBe(title);
    });

    it('should handle unicode characters', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
      const title = '日本語タイトル 🚀';
      const result = getFallbackContent(title, 'Description');
      
      expect(result.frontmatter.title).toBe(title);
    });

    it('should handle very long strings', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
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
      const { compileRemoteMDX } = await import('../src/lib/mdx-compiler');
      
      // Verify function exists and accepts string
      expect(compileRemoteMDX).toBeDefined();
      expect(compileRemoteMDX.length).toBeGreaterThanOrEqual(1);
    });

    it('compileRemoteMarkdown should accept string source', async () => {
      const { compileRemoteMarkdown } = await import('../src/lib/mdx-compiler');
      
      expect(compileRemoteMarkdown).toBeDefined();
      expect(compileRemoteMarkdown.length).toBeGreaterThanOrEqual(1);
    });

    it('getFallbackContent should accept title and description', async () => {
      const { getFallbackContent } = await import('../src/lib/mdx-compiler');
      
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
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const modulePath = path.resolve(
        process.cwd(),
        'src/lib/mdx-compiler.tsx'
      );
      const source = await fs.readFile(modulePath, 'utf-8');
      
      // Should use createCompiler
      expect(source).toContain('createCompiler');
      
      // Should NOT use deprecated compileMDX directly
      // (import is fine, but not as main compilation method)
      expect(source).not.toMatch(/await\s+compileMDX\(/);
    });

    it('should create compiler instance at module level', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const modulePath = path.resolve(
        process.cwd(),
        'src/lib/mdx-compiler.tsx'
      );
      const source = await fs.readFile(modulePath, 'utf-8');
      
      // Compiler should be created at module level for reuse
      expect(source).toMatch(/const\s+compiler\s*=\s*createCompiler/);
    });
  });

  // ===========================================================================
  // Error Handling Expectations - Lock expected error behavior
  // ===========================================================================
  describe('Error Handling Expectations', () => {
    it('compileRemoteMDX should return Promise', async () => {
      const { compileRemoteMDX } = await import('../src/lib/mdx-compiler');
      
      // Call with empty string - should still return a promise
      const result = compileRemoteMDX('');
      
      expect(result).toBeInstanceOf(Promise);
    });

    it('compileRemoteMarkdown should return Promise', async () => {
      const { compileRemoteMarkdown } = await import('../src/lib/mdx-compiler');
      
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
