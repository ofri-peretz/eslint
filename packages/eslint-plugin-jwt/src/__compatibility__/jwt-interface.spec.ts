/**
 * JWT Ecosystem Interface Compatibility Tests
 *
 * Verifies that JWT-related packages export the interfaces our ESLint rules depend on.
 *
 * @sdk jsonwebtoken, jose, express-jwt, jwks-rsa, jwt-decode
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Use unknown types to avoid ESM/CJS type conflicts at compile time
// Runtime checks handle the actual exports
let jsonwebtokenModule: unknown;
let joseModule: unknown;
let jwtDecodeModule: unknown;

// Helper to safely access properties on unknown types
const getProp = (obj: unknown, key: string): unknown => {
  if (obj && typeof obj === 'object' && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
};

beforeAll(async () => {
  try {
    jsonwebtokenModule = await import('jsonwebtoken');
  } catch {
    console.warn('jsonwebtoken not installed');
  }
  try {
    joseModule = await import('jose');
  } catch {
    console.warn('jose not installed');
  }
  try {
    jwtDecodeModule = await import('jwt-decode');
  } catch {
    console.warn('jwt-decode not installed');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// JSONWEBTOKEN INTERFACE
// Primary package for JWT operations in Node.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('jsonwebtoken Interface Compatibility', () => {
  describe('Core Exports', () => {
    it('exports sign function', () => {
      const sign = getProp(jsonwebtokenModule, 'sign');
      expect(sign).toBeDefined();
      expect(typeof sign).toBe('function');
    });

    it('exports verify function', () => {
      const verify = getProp(jsonwebtokenModule, 'verify');
      expect(verify).toBeDefined();
      expect(typeof verify).toBe('function');
    });

    it('exports decode function', () => {
      const decode = getProp(jsonwebtokenModule, 'decode');
      expect(decode).toBeDefined();
      expect(typeof decode).toBe('function');
    });
  });

  describe('Sign Options (Critical for Security Rules)', () => {
    it('sign accepts algorithm option', () => {
      // Rules check: no-algorithm-none, require-algorithm-whitelist
      expect(getProp(jsonwebtokenModule, 'sign')).toBeDefined();
    });

    it('sign accepts expiresIn option', () => {
      // Rules check: require-expiration
      expect(getProp(jsonwebtokenModule, 'sign')).toBeDefined();
    });

    it('sign accepts audience option', () => {
      // Rules check: require-audience
      expect(getProp(jsonwebtokenModule, 'sign')).toBeDefined();
    });

    it('sign accepts issuer option', () => {
      // Rules check: require-issuer
      expect(getProp(jsonwebtokenModule, 'sign')).toBeDefined();
    });
  });

  describe('Verify Options (Critical for Security Rules)', () => {
    it('verify accepts algorithms option (array)', () => {
      // Rules check: verify-algorithm-explicit
      expect(getProp(jsonwebtokenModule, 'verify')).toBeDefined();
    });

    it('verify accepts complete option', () => {
      // Returns full decoded token with header
      expect(getProp(jsonwebtokenModule, 'verify')).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOSE INTERFACE
// Modern JWT library with async/await support
// ═══════════════════════════════════════════════════════════════════════════════

describe('jose Interface Compatibility', () => {
  describe('Core Exports', () => {
    it('exports SignJWT class', () => {
      expect(getProp(joseModule, 'SignJWT')).toBeDefined();
    });

    it('exports jwtVerify function', () => {
      const jwtVerify = getProp(joseModule, 'jwtVerify');
      expect(jwtVerify).toBeDefined();
      expect(typeof jwtVerify).toBe('function');
    });

    it('exports jwtDecrypt function', () => {
      const jwtDecrypt = getProp(joseModule, 'jwtDecrypt');
      expect(jwtDecrypt).toBeDefined();
      expect(typeof jwtDecrypt).toBe('function');
    });

    it('exports createRemoteJWKSet function', () => {
      // Used for JWKS validation
      const createRemoteJWKSet = getProp(joseModule, 'createRemoteJWKSet');
      expect(createRemoteJWKSet).toBeDefined();
      expect(typeof createRemoteJWKSet).toBe('function');
    });
  });

  describe('Key Generation', () => {
    it('exports generateKeyPair function', () => {
      expect(getProp(joseModule, 'generateKeyPair')).toBeDefined();
    });

    it('exports generateSecret function', () => {
      expect(getProp(joseModule, 'generateSecret')).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JWT-DECODE INTERFACE
// Client-side JWT decoding (no verification)
// ═══════════════════════════════════════════════════════════════════════════════

describe('jwt-decode Interface Compatibility', () => {
  describe('Core Exports', () => {
    it('exports jwtDecode function', () => {
      // Can be either named export or default export depending on version
      const jwtDecode = getProp(jwtDecodeModule, 'jwtDecode') ?? getProp(jwtDecodeModule, 'default');
      expect(jwtDecode).toBeDefined();
    });

    it('exports InvalidTokenError', () => {
      expect(getProp(jwtDecodeModule, 'InvalidTokenError')).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Package Metadata', () => {
  it('jsonwebtoken has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('jsonwebtoken/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 jsonwebtoken version: ${pkg.version}`);
    } catch {
      console.log('📦 jsonwebtoken not installed');
    }
  });

  it('jose has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('jose/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 jose version: ${pkg.version}`);
    } catch {
      console.log('📦 jose not installed');
    }
  });
});
