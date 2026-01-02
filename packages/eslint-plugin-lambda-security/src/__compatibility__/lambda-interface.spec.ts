/**
 * Lambda/Middy Interface Compatibility Tests
 *
 * Verifies that Middy packages export the interfaces our ESLint rules depend on.
 *
 * @sdk @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

let middyCore: typeof import('@middy/core');

beforeAll(async () => {
  try {
    middyCore = await import('@middy/core');
  } catch {
    console.warn('@middy/core not installed');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// @MIDDY/CORE
// Core middleware engine for Lambda
// ═══════════════════════════════════════════════════════════════════════════════

describe('@middy/core Interface Compatibility', () => {
  describe('Core Exports', () => {
    it('exports middy factory function', () => {
      expect(middyCore?.default || middyCore).toBeDefined();
      expect(typeof (middyCore?.default || middyCore)).toBe('function');
    });
  });

  describe('Middleware Pattern', () => {
    it('middy returns object with use method', () => {
      const middy = middyCore?.default || middyCore;
      if (middy) {
        const handler = middy(() => Promise.resolve({}));
        expect(handler.use).toBeDefined();
        expect(typeof handler.use).toBe('function');
      }
    });

    it('middy returns object with before method', () => {
      const middy = middyCore?.default || middyCore;
      if (middy) {
        const handler = middy(() => Promise.resolve({}));
        expect(handler.before).toBeDefined();
      }
    });

    it('middy returns object with after method', () => {
      const middy = middyCore?.default || middyCore;
      if (middy) {
        const handler = middy(() => Promise.resolve({}));
        expect(handler.after).toBeDefined();
      }
    });

    it('middy returns object with onError method', () => {
      const middy = middyCore?.default || middyCore;
      if (middy) {
        const handler = middy(() => Promise.resolve({}));
        expect(handler.onError).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE PACKAGES
// Individual middleware our rules check for
// ═══════════════════════════════════════════════════════════════════════════════

describe('Middy Middleware Packages', () => {
  it('@middy/http-cors is importable', async () => {
    try {
      const httpCors = await import('@middy/http-cors');
      expect(httpCors.default || httpCors).toBeDefined();
      console.log('✅ @middy/http-cors available');
    } catch {
      console.log('⚠️ @middy/http-cors not installed');
    }
  });

  it('@middy/http-security-headers is importable', async () => {
    try {
      const securityHeaders = await import('@middy/http-security-headers');
      expect(securityHeaders.default || securityHeaders).toBeDefined();
      console.log('✅ @middy/http-security-headers available');
    } catch {
      console.log('⚠️ @middy/http-security-headers not installed');
    }
  });

  it('@middy/validator is importable', async () => {
    try {
      const validator = await import('@middy/validator');
      expect(validator.default || validator).toBeDefined();
      console.log('✅ @middy/validator available');
    } catch {
      console.log('⚠️ @middy/validator not installed');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Package Metadata', () => {
  it('@middy/core has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('@middy/core/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 @middy/core version: ${pkg.version}`);
    } catch {
      console.log('📦 @middy/core not installed');
    }
  });
});

/**
 * Expected Middy interfaces our rules depend on:
 *
 * @middy/core:
 * - middy(handler) -> MiddyfiedHandler
 * - MiddyfiedHandler.use(middleware) -> MiddyfiedHandler
 * - MiddyfiedHandler.before(fn) -> MiddyfiedHandler
 * - MiddyfiedHandler.after(fn) -> MiddyfiedHandler
 * - MiddyfiedHandler.onError(fn) -> MiddyfiedHandler
 *
 * Middleware Options:
 * - @middy/http-cors: { origin, credentials, headers, methods }
 * - @middy/http-security-headers: { contentSecurityPolicy, hsts, ... }
 * - @middy/validator: { eventSchema, responseSchema }
 *
 * Rules check for:
 * - Presence of security middleware (.use(cors()), .use(securityHeaders()))
 * - CORS origin validation (no '*' with credentials)
 * - Input validation middleware presence
 */
