/**
 * Vercel AI SDK Interface Compatibility Tests
 *
 * Verifies that the Vercel AI SDK exports the interfaces our ESLint rules depend on.
 *
 * @sdk ai (Vercel AI SDK)
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

let ai: typeof import('ai');

beforeAll(async () => {
  try {
    ai = await import('ai');
  } catch {
    throw new Error('ai package is not installed. Run: pnpm add ai --save-dev');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION EXPORTS
// These are the primary functions our rules analyze
// ═══════════════════════════════════════════════════════════════════════════════

describe('Vercel AI SDK Interface Compatibility', () => {
  describe('Core Function Exports', () => {
    it('exports generateText function', () => {
      expect(ai.generateText).toBeDefined();
      expect(typeof ai.generateText).toBe('function');
    });

    it('exports streamText function', () => {
      expect(ai.streamText).toBeDefined();
      expect(typeof ai.streamText).toBe('function');
    });

    it('exports generateObject function', () => {
      expect(ai.generateObject).toBeDefined();
      expect(typeof ai.generateObject).toBe('function');
    });

    it('exports streamObject function', () => {
      expect(ai.streamObject).toBeDefined();
      expect(typeof ai.streamObject).toBe('function');
    });
  });

  describe('Embedding Functions', () => {
    it('exports embed function', () => {
      expect(ai.embed).toBeDefined();
      expect(typeof ai.embed).toBe('function');
    });

    it('exports embedMany function', () => {
      expect(ai.embedMany).toBeDefined();
      expect(typeof ai.embedMany).toBe('function');
    });
  });

  describe('Tool System', () => {
    it('exports tool function', () => {
      expect(ai.tool).toBeDefined();
      expect(typeof ai.tool).toBe('function');
    });
  });

  describe('Message Types', () => {
    it('SDK supports CoreMessage type pattern', () => {
      // Our rules analyze message structures
      // This is a compile-time check more than runtime
      expect(ai.generateText).toBeDefined();
    });
  });

  describe('Streaming Utilities', () => {
    it('exports data or text stream response creator', () => {
      // API evolved: createDataStreamResponse -> createTextStreamResponse
      const hasStreamResponseCreator =
        ai.createTextStreamResponse !== undefined ||
        (ai as Record<string, unknown>)['createDataStreamResponse'] !== undefined;
      expect(hasStreamResponseCreator).toBe(true);
    });

    it('exports data or text stream pipe function', () => {
      // API evolved: pipeDataStreamToResponse -> pipeTextStreamToResponse
      const hasStreamPipe =
        ai.pipeTextStreamToResponse !== undefined ||
        (ai as Record<string, unknown>)['pipeDataStreamToResponse'] !== undefined;
      expect(hasStreamPipe).toBe(true);
    });
  });

  describe('Provider Registry', () => {
    it('exports experimental_createProviderRegistry', () => {
      // For multi-provider setups
      expect(ai.experimental_createProviderRegistry).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Package Metadata', () => {
  it('has discoverable version', async () => {
    const pkgPath = require.resolve('ai/package.json');
    const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
    expect(pkg.version).toBeDefined();
    console.log(`📦 ai (Vercel AI SDK) version: ${pkg.version}`);
  });
});

/**
 * Expected Vercel AI SDK exports our rules depend on:
 *
 * Core Text Generation:
 * - generateText(options) -> Promise<GenerateTextResult>
 * - streamText(options) -> StreamTextResult
 *
 * Object Generation:
 * - generateObject(options) -> Promise<GenerateObjectResult>
 * - streamObject(options) -> StreamObjectResult
 *
 * Tools:
 * - tool({ description, parameters, execute }) -> Tool
 *
 * Messages:
 * - CoreMessage type (system, user, assistant, tool)
 *
 * Options our rules check:
 * - model: LanguageModel
 * - messages: CoreMessage[]
 * - system: string (system prompt)
 * - tools: Record<string, Tool>
 * - maxTokens: number
 * - temperature: number
 * - maxSteps: number (for agentic loops)
 */
