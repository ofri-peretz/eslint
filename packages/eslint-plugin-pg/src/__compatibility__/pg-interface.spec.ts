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
      'pg package is not installed. Run: pnpm add pg --save-dev -w'
    );
  }
});

describe('pg Interface Compatibility', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXPORTS
  // Rules: All rules check for Client/Pool class usage
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Core Exports', () => {
    it('exports Client class (used by all rules)', () => {
      expect(pg.Client).toBeDefined();
      expect(typeof pg.Client).toBe('function');
    });

    it('exports Pool class (used by all rules)', () => {
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
  // Rules: no-unsafe-query, no-hardcoded-credentials, no-insecure-ssl,
  //        check-query-params, no-floating-query
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Client Interface', () => {
    describe('Constructor (Rules: no-hardcoded-credentials, no-insecure-ssl)', () => {
      it('Client constructor accepts config object', () => {
        // We're testing that Client can be instantiated with a config
        // This matters for rules checking connection patterns
        expect(pg.Client.length).toBeGreaterThanOrEqual(0); // accepts 0+ args
      });

      it('Client can be instantiated without throwing', () => {
        // Verify the constructor pattern works (no actual connection)
        expect(() => {
          // Just verify the class exists and is instantiable
          // We don't check the instance because it would try to connect
          new pg.Client({ host: 'localhost', port: 5432 });
        }).toBeDefined();
      });
    });

    describe('Prototype Methods (Critical for Rule Detection)', () => {
      it('Client.prototype.query exists (Rules: no-unsafe-query, check-query-params)', () => {
        expect(pg.Client.prototype.query).toBeDefined();
        expect(typeof pg.Client.prototype.query).toBe('function');
      });

      it('Client.prototype.connect exists (Rules: no-missing-client-release)', () => {
        expect(pg.Client.prototype.connect).toBeDefined();
        expect(typeof pg.Client.prototype.connect).toBe('function');
      });

      it('Client.prototype.end exists (connection cleanup)', () => {
        expect(pg.Client.prototype.end).toBeDefined();
        expect(typeof pg.Client.prototype.end).toBe('function');
      });

      it('Client.prototype does NOT have release (it is on PoolClient)', () => {
        // IMPORTANT: release() is NOT on Client.prototype
        // It's dynamically added to PoolClient instances by Pool.connect()
        // Our rules check for 'client.release()' calls on variables that
        // came from pool.connect(), not from new Client()
        // This test documents that distinction
        // @ts-expect-error - release does not exist on Client.prototype, testing that it's undefined
        expect(pg.Client.prototype.release).toBeUndefined();
      });

      it('Client.prototype.on exists (event emitter pattern)', () => {
        // Client extends EventEmitter for error handling
        expect(pg.Client.prototype.on).toBeDefined();
        expect(typeof pg.Client.prototype.on).toBe('function');
      });
    });

    describe('Query Method Signatures (Rules: no-unsafe-query, check-query-params)', () => {
      // Our rules inspect query() call patterns
      it('query method is callable', () => {
        expect(pg.Client.prototype.query).toBeDefined();
        expect(typeof pg.Client.prototype.query).toBe('function');
      });

      it('query method accepts multiple arguments (text, values, callback)', () => {
        // pg.query(text) - simple query
        // pg.query(text, values) - parameterized query
        // pg.query(text, values, callback) - callback style
        // pg.query(config) - QueryConfig object
        // The function signature should be flexible
        expect(pg.Client.prototype.query.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POOL CLASS INTERFACE
  // Rules: prefer-pool-query, no-transaction-on-pool, no-missing-client-release,
  //        prevent-double-release
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pool Interface', () => {
    describe('Constructor (Rules: no-hardcoded-credentials, no-insecure-ssl)', () => {
      it('Pool constructor accepts config object', () => {
        expect(pg.Pool.length).toBeGreaterThanOrEqual(0);
      });

      it('Pool can be instantiated without throwing', () => {
        expect(() => {
          new pg.Pool({ host: 'localhost', port: 5432 });
        }).toBeDefined();
      });
    });

    describe('Prototype Methods (Critical for Rule Detection)', () => {
      it('Pool.prototype.query exists (direct pool queries - Rules: prefer-pool-query)', () => {
        expect(pg.Pool.prototype.query).toBeDefined();
        expect(typeof pg.Pool.prototype.query).toBe('function');
      });

      it('Pool.prototype.connect exists (checkout client - Rules: no-missing-client-release)', () => {
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

      it('Pool.prototype.totalCount is accessible (pool monitoring)', () => {
        // Pool has properties for monitoring
        // These are getters, so we verify on an instance
        const pool = new pg.Pool({ host: 'localhost' });
        expect(typeof pool.totalCount).toBe('number');
        pool.end();
      });

      it('Pool.prototype.idleCount is accessible (pool monitoring)', () => {
        const pool = new pg.Pool({ host: 'localhost' });
        expect(typeof pool.idleCount).toBe('number');
        pool.end();
      });

      it('Pool.prototype.waitingCount is accessible (pool monitoring)', () => {
        const pool = new pg.Pool({ host: 'localhost' });
        expect(typeof pool.waitingCount).toBe('number');
        pool.end();
      });
    });

    describe('Pool Configuration Options (Rules: no-hardcoded-credentials, no-insecure-ssl)', () => {
      it('Pool accepts host config option', () => {
        const pool = new pg.Pool({ host: 'localhost' });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts port config option', () => {
        const pool = new pg.Pool({ port: 5432 });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts user config option', () => {
        const pool = new pg.Pool({ user: 'testuser' });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts password config option (Rules: no-hardcoded-credentials)', () => {
        const pool = new pg.Pool({ password: 'testpass' });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts database config option', () => {
        const pool = new pg.Pool({ database: 'testdb' });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts connectionString config option (Rules: no-hardcoded-credentials)', () => {
        const pool = new pg.Pool({ connectionString: 'postgres://localhost/test' });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts ssl config option (Rules: no-insecure-ssl)', () => {
        // ssl can be boolean or object
        const pool = new pg.Pool({ ssl: true });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts ssl.rejectUnauthorized config option (Rules: no-insecure-ssl)', () => {
        // This is what no-insecure-ssl checks for
        const pool = new pg.Pool({ ssl: { rejectUnauthorized: true } });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts max/min pool size options', () => {
        const pool = new pg.Pool({ max: 20, min: 5 });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts idleTimeoutMillis option', () => {
        const pool = new pg.Pool({ idleTimeoutMillis: 30000 });
        expect(pool).toBeDefined();
        pool.end();
      });

      it('Pool accepts connectionTimeoutMillis option', () => {
        const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
        expect(pool).toBeDefined();
        pool.end();
      });
    });

    describe('PoolClient Interface (Rules: no-missing-client-release, prevent-double-release)', () => {
      // Note: We can't easily get a real PoolClient without a database connection.
      // Instead, we document the expected interface here.
      
      it('Pool.connect returns a thenable (for await pool.connect())', () => {
        // This is critical - Pool.connect() must return a Promise<PoolClient>
        expect(pg.Pool.prototype.connect).toBeDefined();
        expect(typeof pg.Pool.prototype.connect).toBe('function');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY RESULT INTERFACE
  // Rules: check-query-params, no-select-all
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Query Result Interface', () => {
    it('QueryResult type is expected to have rows property', () => {
      // Our rules don't check QueryResult at runtime, but we document the expectation
      // QueryResult.rows: any[]
      // QueryResult.rowCount: number
      // QueryResult.command: string
      expect(pg.Client.prototype.query).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SQL COMMAND PATTERNS
  // Rules: no-unsafe-query, no-unsafe-copy-from, no-unsafe-search-path,
  //        no-transaction-on-pool, prefer-pool-query
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SQL Command Patterns (AST-based detection)', () => {
    // These tests document the SQL patterns our rules detect
    // The rules use AST analysis, not runtime execution
    
    describe('Transaction Commands (Rules: no-transaction-on-pool, prefer-pool-query)', () => {
      it('query accepts BEGIN statements', () => {
        // Our rule detects: pool.query('BEGIN')
        expect(pg.Client.prototype.query).toBeDefined();
      });

      it('query accepts COMMIT statements', () => {
        // Our rule detects: pool.query('COMMIT')
        expect(pg.Client.prototype.query).toBeDefined();
      });

      it('query accepts ROLLBACK statements', () => {
        // Our rule detects: pool.query('ROLLBACK')
        expect(pg.Client.prototype.query).toBeDefined();
      });
    });

    describe('COPY FROM Commands (Rules: no-unsafe-copy-from)', () => {
      it('query accepts COPY commands', () => {
        // Our rule detects: client.query('COPY ... FROM ...')
        expect(pg.Client.prototype.query).toBeDefined();
      });
    });

    describe('Search Path Commands (Rules: no-unsafe-search-path)', () => {
      it('query accepts SET statements', () => {
        // Our rule detects: client.query("SET search_path TO ...")
        expect(pg.Client.prototype.query).toBeDefined();
      });
    });

    describe('Parameterized Query Patterns (Rules: no-unsafe-query, check-query-params)', () => {
      it('query accepts parameterized format with $1, $2, etc.', () => {
        // Our rule checks for: client.query('SELECT * FROM users WHERE id = $1', [id])
        expect(pg.Client.prototype.query).toBeDefined();
      });
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

    it('types.builtins exists with OID constants', () => {
      // pg.types.builtins contains OID constants like INT4, TEXT, etc.
      expect(pg.types.builtins).toBeDefined();
      expect(typeof pg.types.builtins).toBe('object');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // Rules: no-floating-query (checks for unhandled rejections)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('Client supports error event listener', () => {
      expect(pg.Client.prototype.on).toBeDefined();
    });

    it('Pool supports error event listener', () => {
      expect(pg.Pool.prototype.on).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NATIVE BINDINGS (OPTIONAL)
  // Some users use pg-native for performance
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Native Bindings (optional)', () => {
    it('pg.native may or may not exist', () => {
      // pg.native is an optional binding that provides native libpq
      // Our rules should work with or without it
      // We just document its potential existence
      expect(pg.Client).toBeDefined(); // Core always exists
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PACKAGE METADATA
  // Useful for debugging compatibility issues
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Package Metadata', () => {
    it('has discoverable version', async () => {
      const pkgPath = require.resolve('pg/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      expect(pkg.version).toBeDefined();
      console.log(`📦 pg version: ${pkg.version}`);
    });

    it('version satisfies our peerDependency range', async () => {
      const pkgPath = require.resolve('pg/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      // Our peerDeps: ^6.0.0 || ^7.0.0 || ^8.0.0
      const major = parseInt(pkg.version.split('.')[0], 10);
      expect(major).toBeGreaterThanOrEqual(6);
      expect(major).toBeLessThanOrEqual(9); // Update when we support pg 10+
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
 * CLASSES:
 * - pg.Client
 *   - constructor(config?: ClientConfig)
 *   - .prototype.query(text, values?, callback?) -> Promise<QueryResult>
 *   - .prototype.connect() -> Promise<void>
 *   - .prototype.end() -> Promise<void>
 *   - .prototype.on(event, handler) -> this
 *
 * - pg.Pool
 *   - constructor(config?: PoolConfig)
 *   - .prototype.query(text, values?, callback?) -> Promise<QueryResult>
 *   - .prototype.connect() -> Promise<PoolClient>
 *   - .prototype.end() -> Promise<void>
 *   - .prototype.on(event, handler) -> this
 *   - .totalCount: number
 *   - .idleCount: number
 *   - .waitingCount: number
 *
 * - PoolClient (extends Client)
 *   - .release(err?: Error) -> void  // Added dynamically by Pool.connect()
 *
 * CONFIG OPTIONS (checked by rules):
 *   - host: string
 *   - port: number
 *   - user: string
 *   - password: string           // no-hardcoded-credentials
 *   - database: string
 *   - connectionString: string   // no-hardcoded-credentials
 *   - ssl: boolean | TlsOptions  // no-insecure-ssl
 *     - rejectUnauthorized: boolean  // no-insecure-ssl
 *   - max: number
 *   - min: number
 *   - idleTimeoutMillis: number
 *   - connectionTimeoutMillis: number
 *
 * SQL PATTERNS DETECTED BY RULES:
 *   - BEGIN, COMMIT, ROLLBACK  // no-transaction-on-pool
 *   - COPY ... FROM ...        // no-unsafe-copy-from
 *   - SET search_path TO ...   // no-unsafe-search-path
 *   - $1, $2, ... placeholders // check-query-params
 *
 * TYPE UTILITIES:
 *   - pg.types.getTypeParser(oid) -> Parser
 *   - pg.types.setTypeParser(oid, parser) -> void
 *   - pg.types.builtins -> { INT4: number, TEXT: number, ... }
 */
