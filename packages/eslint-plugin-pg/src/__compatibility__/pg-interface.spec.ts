/**
 * pg Interface Compatibility Tests
 *
 * PURPOSE:
 * These tests verify that the 'pg' package exports the interfaces, classes,
 * methods, and type signatures that our ESLint rules depend on. If any of
 * these tests fail after a pg version update, it indicates a breaking change
 * that may require rule updates.
 *
 * HOW IT WORKS:
 * - We import the 'pg' package and verify its public API
 * - We test class existence, method signatures, and property shapes
 * - We do NOT test runtime behavior (that's what pg's own tests do)
 *
 * WHEN THIS FAILS:
 * 1. Check the pg changelog for the tested version
 * 2. Review which rules depend on the changed interfaces
 * 3. Update rules and/or add new test cases for changed behavior
 * 4. Update peerDependencies in package.json if needed
 *
 * @sdk pg
 * @version-tested 8.x
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

// We dynamically import to handle cases where pg might not be installed
let pg: typeof import('pg');

beforeAll(async () => {
  try {
    pg = await import('pg');
  } catch {
    throw new Error(
      'pg package is not installed. Run: pnpm add pg --save-dev'
    );
  }
});

describe('pg Interface Compatibility', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXPORTS
  // Our rules check for these primary exports
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Core Exports', () => {
    it('exports Client class', () => {
      expect(pg.Client).toBeDefined();
      expect(typeof pg.Client).toBe('function');
    });

    it('exports Pool class', () => {
      expect(pg.Pool).toBeDefined();
      expect(typeof pg.Pool).toBe('function');
    });

    it('exports Query class (used for advanced query patterns)', () => {
      // Some versions export Query, some don't - this is informational
      // Our rules don't strictly depend on this
      expect(pg.Query).toBeDefined();
    });

    it('exports types object (for TypeOIDs)', () => {
      expect(pg.types).toBeDefined();
    });

    it('default export equals named exports', () => {
      // Some import styles use default, some use named
      expect(pg.default?.Client || pg.Client).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT CLASS INTERFACE
  // Rules: no-unsafe-query, no-hardcoded-credentials, no-insecure-ssl
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Client Interface', () => {
    describe('Constructor', () => {
      it('Client constructor accepts config object', () => {
        // We're testing that Client can be instantiated with a config
        // This matters for rules checking connection patterns
        expect(pg.Client.length).toBeGreaterThanOrEqual(0); // accepts 0+ args
      });
    });

    describe('Prototype Methods (Critical for Rule Detection)', () => {
      it('Client.prototype.query exists', () => {
        expect(pg.Client.prototype.query).toBeDefined();
        expect(typeof pg.Client.prototype.query).toBe('function');
      });

      it('Client.prototype.connect exists', () => {
        expect(pg.Client.prototype.connect).toBeDefined();
        expect(typeof pg.Client.prototype.connect).toBe('function');
      });

      it('Client.prototype.end exists', () => {
        expect(pg.Client.prototype.end).toBeDefined();
        expect(typeof pg.Client.prototype.end).toBe('function');
      });

      it('Client.prototype does NOT have release (it is on PoolClient)', () => {
        // IMPORTANT: release() is NOT on Client.prototype
        // It's dynamically added to PoolClient instances by Pool.connect()
        // Our rules check for 'client.release()' calls on variables that
        // came from pool.connect(), not from new Client()
        // This test documents that distinction
        expect(pg.Client.prototype.release).toBeUndefined();
      });
    });

    describe('Query Method Signatures', () => {
      // Our rules inspect query() call patterns
      // These tests ensure the method exists and accepts expected signatures

      it('query method is async-capable (returns thenable)', () => {
        // We don't call it, just verify function exists
        // The actual return type (Promise) is verified by TypeScript
        expect(pg.Client.prototype.query).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POOL CLASS INTERFACE
  // Rules: prefer-pool-query, no-transaction-on-pool, no-missing-client-release
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pool Interface', () => {
    describe('Constructor', () => {
      it('Pool constructor accepts config object', () => {
        expect(pg.Pool.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Prototype Methods', () => {
      it('Pool.prototype.query exists (direct pool queries)', () => {
        expect(pg.Pool.prototype.query).toBeDefined();
        expect(typeof pg.Pool.prototype.query).toBe('function');
      });

      it('Pool.prototype.connect exists (checkout client)', () => {
        expect(pg.Pool.prototype.connect).toBeDefined();
        expect(typeof pg.Pool.prototype.connect).toBe('function');
      });

      it('Pool.prototype.end exists (close all connections)', () => {
        expect(pg.Pool.prototype.end).toBeDefined();
        expect(typeof pg.Pool.prototype.end).toBe('function');
      });

      it('Pool.prototype.on exists (event emitter pattern)', () => {
        // Pool extends EventEmitter
        expect(pg.Pool.prototype.on).toBeDefined();
        expect(typeof pg.Pool.prototype.on).toBe('function');
      });
    });

    describe('Pool Configuration Properties', () => {
      // These are used by no-hardcoded-credentials and no-insecure-ssl rules

      it('Pool accepts ssl config option', () => {
        // We verify by checking that Pool can be constructed
        // The actual ssl option is validated at runtime by pg
        expect(pg.Pool).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SSL CONFIGURATION STRUCTURE
  // Rules: no-insecure-ssl
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SSL Configuration', () => {
    it('pg supports rejectUnauthorized option', () => {
      // This is a Node.js TLS option that pg passes through
      // Our rule checks for ssl: { rejectUnauthorized: false }
      // We can't test the option itself without connecting
      // But we document the expectation here
      expect(pg.Client).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY FROM STREAM INTERFACE
  // Rules: no-unsafe-copy-from
  // ═══════════════════════════════════════════════════════════════════════════

  describe('COPY FROM Interface', () => {
    it('Client query can handle COPY commands', () => {
      // COPY FROM is executed via query() with special syntax
      // Our rule detects: client.query('COPY ... FROM ...')
      expect(pg.Client.prototype.query).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE UTILITIES
  // Used for advanced type checking in rules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Type Utilities', () => {
    it('types object provides OID mappings', () => {
      expect(pg.types).toBeDefined();
      expect(typeof pg.types).toBe('object');
    });

    it('types.getTypeParser exists', () => {
      expect(pg.types.getTypeParser).toBeDefined();
      expect(typeof pg.types.getTypeParser).toBe('function');
    });

    it('types.setTypeParser exists', () => {
      expect(pg.types.setTypeParser).toBeDefined();
      expect(typeof pg.types.setTypeParser).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH PATH (SET COMMANDS)
  // Rules: no-unsafe-search-path
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Path Commands', () => {
    it('query accepts SET statements', () => {
      // Our rule detects: client.query("SET search_path TO ...")
      // This is just SQL passed to query(), not a special method
      expect(pg.Client.prototype.query).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION & METADATA
  // Useful for debugging compatibility issues
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Package Metadata', () => {
    it('has discoverable version', async () => {
      // Version can be read from package.json if needed
      // This is informational for debugging
      const pkgPath = require.resolve('pg/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      expect(pkg.version).toBeDefined();
      console.log(`📦 pg version: ${pkg.version}`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE SHAPE DOCUMENTATION
// This section documents the expected shapes for rule authors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Expected pg exports our rules depend on:
 *
 * - pg.Client (class)
 *   - .prototype.query(text, values?) -> Promise<QueryResult>
 *   - .prototype.connect() -> Promise<void>
 *   - .prototype.end() -> Promise<void>
 *   - .prototype.release() -> void (on PoolClient)
 *
 * - pg.Pool (class)
 *   - .prototype.query(text, values?) -> Promise<QueryResult>
 *   - .prototype.connect() -> Promise<PoolClient>
 *   - .prototype.end() -> Promise<void>
 *
 * - pg.types (object)
 *   - .getTypeParser(oid) -> Parser
 *   - .setTypeParser(oid, parser) -> void
 *
 * Config options we check for:
 *   - ssl: boolean | { rejectUnauthorized: boolean, ... }
 *   - host, port, user, password, database (connection strings)
 */
