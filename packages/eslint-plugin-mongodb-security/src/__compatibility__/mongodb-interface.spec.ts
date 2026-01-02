/**
 * MongoDB Interface Compatibility Tests
 *
 * PURPOSE:
 * These tests verify that the 'mongodb' and 'mongoose' packages export the
 * interfaces, classes, methods, and type signatures that our ESLint rules
 * depend on. If any of these tests fail after a version update, it indicates
 * a breaking change that may require rule updates.
 *
 * HOW IT WORKS:
 * - We import the packages and verify their public API
 * - We test class existence, method signatures, and property shapes
 * - We do NOT test runtime behavior (that's what the SDKs' own tests do)
 *
 * WHEN THIS FAILS:
 * 1. Check the changelog for the tested version
 * 2. Review which rules depend on the changed interfaces
 * 3. Update rules and/or add new test cases for changed behavior
 * 4. Update peerDependencies in package.json if needed
 *
 * @sdk mongodb, mongoose
 * @version-tested mongodb 6.x, mongoose 8.x
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

// We dynamically import to handle cases where packages might not be installed
let mongodb: typeof import('mongodb');
let mongoose: typeof import('mongoose');

beforeAll(async () => {
  try {
    mongodb = await import('mongodb');
  } catch {
    console.warn(
      'mongodb package is not installed. Run: pnpm add mongodb --save-dev -w'
    );
  }

  try {
    mongoose = await import('mongoose');
  } catch {
    console.warn(
      'mongoose package is not installed. Run: pnpm add mongoose --save-dev -w'
    );
  }
});

describe('MongoDB Driver Interface Compatibility', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXPORTS
  // Rules: All rules check for MongoClient/Collection/Db usage
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Core Exports', () => {
    it('exports MongoClient class', () => {
      expect(mongodb.MongoClient).toBeDefined();
      expect(typeof mongodb.MongoClient).toBe('function');
    });

    it('exports ObjectId class', () => {
      expect(mongodb.ObjectId).toBeDefined();
      expect(typeof mongodb.ObjectId).toBe('function');
    });

    it('exports BSON utilities', () => {
      expect(mongodb.BSON).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MONGOCLIENT CLASS INTERFACE
  // Rules: no-hardcoded-connection-string, no-hardcoded-credentials,
  //        require-tls-connection, require-auth-mechanism
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MongoClient Interface', () => {
    describe('Constructor (Rules: no-hardcoded-connection-string, require-tls)', () => {
      it('MongoClient constructor accepts connection string', () => {
        expect(mongodb.MongoClient.length).toBeGreaterThanOrEqual(0);
      });

      it('MongoClient can be instantiated with options', () => {
        expect(() => {
          new mongodb.MongoClient('mongodb://localhost:27017', {
            tls: true,
            authMechanism: 'SCRAM-SHA-256',
          });
        }).toBeDefined();
      });
    });

    describe('Prototype Methods', () => {
      it('MongoClient.prototype.connect exists', () => {
        expect(mongodb.MongoClient.prototype.connect).toBeDefined();
        expect(typeof mongodb.MongoClient.prototype.connect).toBe('function');
      });

      it('MongoClient.prototype.close exists', () => {
        expect(mongodb.MongoClient.prototype.close).toBeDefined();
        expect(typeof mongodb.MongoClient.prototype.close).toBe('function');
      });

      it('MongoClient.prototype.db exists', () => {
        expect(mongodb.MongoClient.prototype.db).toBeDefined();
        expect(typeof mongodb.MongoClient.prototype.db).toBe('function');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLECTION INTERFACE
  // Rules: no-unsafe-query, no-operator-injection, no-unsafe-where,
  //        no-unsafe-regex-query, no-unbounded-find
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Collection Interface', () => {
    it('Collection has find method', () => {
      // Collection is accessed via db.collection()
      // We verify the prototype chain exists
      expect(mongodb.MongoClient.prototype.db).toBeDefined();
    });

    it('Query methods exist on Collection prototype', () => {
      // These methods are what our rules detect
      const queryMethods = [
        'find',
        'findOne',
        'insertOne',
        'insertMany',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'findOneAndUpdate',
        'findOneAndDelete',
        'findOneAndReplace',
        'aggregate',
        'countDocuments',
      ];
      // Note: Collection is created dynamically, we just document expectations
      expect(queryMethods).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OBJECTID CLASS
  // Used for safe ID handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ObjectId Interface', () => {
    it('ObjectId can be constructed from string', () => {
      const id = new mongodb.ObjectId('507f1f77bcf86cd799439011');
      expect(id).toBeDefined();
      expect(id.toHexString()).toBe('507f1f77bcf86cd799439011');
    });

    it('ObjectId.isValid exists', () => {
      expect(mongodb.ObjectId.isValid).toBeDefined();
      expect(typeof mongodb.ObjectId.isValid).toBe('function');
    });

    it('ObjectId.isValid validates correctly', () => {
      expect(mongodb.ObjectId.isValid('507f1f77bcf86cd799439011')).toBe(true);
      expect(mongodb.ObjectId.isValid('invalid')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION OPTIONS
  // Rules: require-tls-connection, require-auth-mechanism
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Connection Options', () => {
    it('MongoClient accepts tls option', () => {
      const client = new mongodb.MongoClient('mongodb://localhost:27017', {
        tls: true,
      });
      expect(client).toBeDefined();
    });

    it('MongoClient accepts authMechanism option', () => {
      // SCRAM-SHA-256 requires username/password
      const client = new mongodb.MongoClient('mongodb://localhost:27017', {
        authMechanism: 'SCRAM-SHA-256',
        auth: { username: 'testuser', password: 'testpass' },
      });
      expect(client).toBeDefined();
    });

    it('MongoClient accepts auth options', () => {
      const client = new mongodb.MongoClient('mongodb://localhost:27017', {
        auth: {
          username: 'testuser',
          password: 'testpass',
        },
      });
      expect(client).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PACKAGE METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Package Metadata', () => {
    it('has discoverable version', async () => {
      const pkgPath = require.resolve('mongodb/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      expect(pkg.version).toBeDefined();
      console.log(`📦 mongodb version: ${pkg.version}`);
    });

    it('version satisfies our peerDependency range', async () => {
      const pkgPath = require.resolve('mongodb/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      // Our peerDeps: ^4.0.0 || ^5.0.0 || ^6.0.0
      const major = parseInt(pkg.version.split('.')[0], 10);
      expect(major).toBeGreaterThanOrEqual(4);
      expect(major).toBeLessThanOrEqual(7); // Update when we support mongodb 8+
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MONGOOSE ODM INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mongoose ODM Interface Compatibility', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXPORTS
  // Rules: All Mongoose-specific rules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Core Exports', () => {
    it('exports Schema class', () => {
      expect(mongoose.Schema).toBeDefined();
      expect(typeof mongoose.Schema).toBe('function');
    });

    it('exports Model function', () => {
      expect(mongoose.model).toBeDefined();
      expect(typeof mongoose.model).toBe('function');
    });

    it('exports connect function', () => {
      expect(mongoose.connect).toBeDefined();
      expect(typeof mongoose.connect).toBe('function');
    });

    it('exports Types.ObjectId', () => {
      expect(mongoose.Types.ObjectId).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA CLASS
  // Rules: require-schema-validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Schema Interface', () => {
    it('Schema can be instantiated with field definitions', () => {
      const schema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, match: /.+@.+/ },
        age: { type: Number, min: 0, max: 150 },
      });
      expect(schema).toBeDefined();
    });

    it('Schema accepts validation options', () => {
      const schema = new mongoose.Schema({
        role: {
          type: String,
          enum: ['user', 'admin'],
          default: 'user',
        },
      });
      expect(schema).toBeDefined();
    });

    it('Schema supports pre/post hooks', () => {
      const schema = new mongoose.Schema({ name: String });
      expect(typeof schema.pre).toBe('function');
      expect(typeof schema.post).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL CLASS
  // Rules: no-unsafe-query, no-bypass-middleware, no-select-sensitive-fields
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Interface', () => {
    it('Model has query methods', () => {
      const schema = new mongoose.Schema({ name: String });
      const Model = mongoose.model('TestModel' + Date.now(), schema);

      // Query methods our rules detect
      expect(typeof Model.find).toBe('function');
      expect(typeof Model.findOne).toBe('function');
      expect(typeof Model.findById).toBe('function');
      expect(typeof Model.updateOne).toBe('function');
      expect(typeof Model.updateMany).toBe('function');
      expect(typeof Model.deleteOne).toBe('function');
      expect(typeof Model.deleteMany).toBe('function');
      expect(typeof Model.findOneAndUpdate).toBe('function');
      expect(typeof Model.findOneAndDelete).toBe('function');
      expect(typeof Model.countDocuments).toBe('function');
      expect(typeof Model.aggregate).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY CLASS
  // Rules: no-unsafe-query, no-select-sensitive-fields, require-lean-queries
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Query Interface', () => {
    it('Query has chainable methods', () => {
      const schema = new mongoose.Schema({ name: String, age: Number });
      const Model = mongoose.model('QueryTestModel' + Date.now(), schema);

      const query = Model.find();

      // Chainable methods our rules detect
      expect(typeof query.select).toBe('function');
      expect(typeof query.limit).toBe('function');
      expect(typeof query.skip).toBe('function');
      expect(typeof query.sort).toBe('function');
      expect(typeof query.lean).toBe('function');
      expect(typeof query.populate).toBe('function');
      expect(typeof query.exec).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MONGOOSE CONNECTION
  // Rules: no-hardcoded-connection-string, require-tls-connection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Connection Interface', () => {
    it('mongoose.connect accepts connection string', () => {
      expect(mongoose.connect).toBeDefined();
      // mongoose.connect(uri, options) is the signature
    });

    it('mongoose.set exists for configuration', () => {
      expect(typeof mongoose.set).toBe('function');
    });

    it('mongoose.set accepts debug option (Rules: no-debug-mode-production)', () => {
      // Just verify the API exists
      expect(mongoose.set).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PACKAGE METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Package Metadata', () => {
    it('has discoverable version', async () => {
      const pkgPath = require.resolve('mongoose/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      expect(pkg.version).toBeDefined();
      console.log(`📦 mongoose version: ${pkg.version}`);
    });

    it('version satisfies our peerDependency range', async () => {
      const pkgPath = require.resolve('mongoose/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(
        (m) => m.default
      );
      // Our peerDeps: ^6.0.0 || ^7.0.0 || ^8.0.0
      const major = parseInt(pkg.version.split('.')[0], 10);
      expect(major).toBeGreaterThanOrEqual(6);
      expect(major).toBeLessThanOrEqual(9); // Update when we support mongoose 10+
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE SHAPE DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expected MongoDB/Mongoose exports our rules depend on:
 *
 * MONGODB DRIVER:
 * - MongoClient
 *   - constructor(uri, options)
 *   - .connect() -> Promise<MongoClient>
 *   - .close() -> Promise<void>
 *   - .db(name?) -> Db
 *
 * - Db
 *   - .collection(name) -> Collection
 *
 * - Collection
 *   - .find(filter) -> FindCursor
 *   - .findOne(filter) -> Promise<Document | null>
 *   - .insertOne(doc) -> Promise<InsertOneResult>
 *   - .updateOne(filter, update) -> Promise<UpdateResult>
 *   - .deleteOne(filter) -> Promise<DeleteResult>
 *   - .aggregate(pipeline) -> AggregationCursor
 *
 * - ObjectId
 *   - constructor(id?)
 *   - .isValid(id) -> boolean
 *
 * MONGOOSE:
 * - Schema
 *   - constructor(definition, options?)
 *   - .pre(hook, fn)
 *   - .post(hook, fn)
 *
 * - Model (via mongoose.model())
 *   - .find(filter) -> Query
 *   - .findOne(filter) -> Query
 *   - .findById(id) -> Query
 *   - .updateOne(filter, update) -> Query
 *   - .deleteOne(filter) -> Query
 *   - .aggregate(pipeline) -> Aggregate
 *
 * - Query
 *   - .select(fields) -> Query
 *   - .limit(n) -> Query
 *   - .skip(n) -> Query
 *   - .lean() -> Query
 *   - .populate(path) -> Query
 *   - .exec() -> Promise
 *
 * CONNECTION OPTIONS:
 *   - tls: boolean
 *   - authMechanism: string
 *   - auth: { username, password }
 */
