/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression fixtures taken verbatim from a real-codebase dry run.
 *
 * Source: mikemajesty/nestjs-microservice-boilerplate-api (393★, NestJS 11 +
 * Mongoose ^9.1.5, 253 files). `configs.recommended` produced 145 findings on
 * it, of which 138 were false positives across four rules. Each `valid` case
 * below is one of those false positives; each `invalid` case is the true
 * positive the same rule must keep firing on, so the fix cannot go inert.
 */
import { describe } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';

import { noBypassMiddleware } from './rules/no-bypass-middleware/index';
import { noSelectSensitiveFields } from './rules/no-select-sensitive-fields/index';
import { noUnboundedFind } from './rules/no-unbounded-find/index';
import { requireAuthMechanism } from './rules/require-auth-mechanism/index';
import { requireTlsConnection } from './rules/require-tls-connection/index';

const ruleTester = new RuleTester();

// ---------------------------------------------------------------------------
// require-auth-mechanism — 7 findings, none of them MongoDB.
// ---------------------------------------------------------------------------

describe('real-world FP regressions', () => {
  ruleTester.run('require-auth-mechanism', requireAuthMechanism, {
    valid: [
      // src/infra/cache/redis/module.ts:18 — a Redis client.
      `import { createClient, RedisClientType } from 'redis';
       const client = createClient({ url: REDIS_URL }) as RedisClientType;
       const cacheService = new RedisService(logger, client);
       await cacheService.connect();`,
      // src/infra/cache/redis/service.ts:46 — the same client, one layer down.
      `import { createClient } from 'redis';
       class RedisService { async connect() { await this.client.connect(); } }`,
      // src/infra/repository/postgres/repository.ts:42 — TypeORM query runner.
      `import { Repository } from 'typeorm';
       const queryRunner = this.repository.manager.connection.createQueryRunner();
       await queryRunner.connect();`,
      // src/infra/logger/module.ts:16 — a pino logger transport.
      `await logger.connect(LogLevelEnum[LOG_LEVEL]);`,
      // src/utils/test/e2e/containers.ts — testcontainers helper. Real
      // Mongoose, but test infrastructure lives in a `test/` directory rather
      // than behind a `.test.ts` suffix.
      {
        code: `import mongoose from 'mongoose';
               mongoose.createConnection(container.getConnectionString(), { directConnection: true });`,
        filename: '/repo/src/utils/test/e2e/containers.ts',
      },
    ],
    invalid: [
      // Still fires on the real thing: a Mongoose connection with no mechanism.
      {
        code: `import mongoose from 'mongoose';
               await mongoose.connect(MONGO_URL, { tls: true });`,
        errors: [{ messageId: 'requireAuthMechanism' }],
      },
      // …and on the native driver held in a local variable.
      {
        code: `import { MongoClient } from 'mongodb';
               const client = new MongoClient(uri);
               await client.connect();`,
        errors: [{ messageId: 'requireAuthMechanism' }],
      },
    ],
  });

  // -------------------------------------------------------------------------
  // require-tls-connection — same receiver confusion.
  // -------------------------------------------------------------------------

  ruleTester.run('require-tls-connection', requireTlsConnection, {
    valid: [
      `await logger.connect(LogLevelEnum[LOG_LEVEL]);`,
      {
        code: `import mongoose from 'mongoose';
               mongoose.createConnection(container.getConnectionString(), { directConnection: true });`,
        filename: '/repo/src/utils/test/e2e/containers.ts',
      },
    ],
    invalid: [
      {
        code: `import mongoose from 'mongoose';
               await mongoose.connect(MONGO_URL, { authMechanism: 'SCRAM-SHA-256' });`,
        errors: [{ messageId: 'requireTls' }],
      },
    ],
  });

  // -------------------------------------------------------------------------
  // no-unbounded-find — 15 of 41 findings were Array.prototype.find.
  // -------------------------------------------------------------------------

  ruleTester.run('no-unbounded-find', noUnboundedFind, {
    valid: [
      // src/infra/logger/service.ts:48,82,119 — array literal + `.find(Boolean)`.
      `const level = [logLevel, 'trace']?.find(Boolean)?.toString();`,
      `this.logger.logger.debug([obj, gray(message)].find(Boolean), gray(message));`,
      `const messages = [message, ObjectUtil.reach(response, (o) => o.message, error.message)].find(Boolean);`,
      // src/utils/entity.ts:13 — array literal inside a call argument.
      `Object.assign(entity, { id: [entity?.id, entity?._id, null].find(Boolean) });`,
      // src/core/role/entity/role.ts:43 — named array + predicate callback.
      `if (this.permissions.find((p) => p.name === permission.name)) { return; }`,
      // src/utils/object.ts:32 — the predicate argument is the discriminator.
      `return values.find((v) => v !== null && v !== undefined);`,
      // src/infra/repository/postgres/repository.ts:123 — TypeORM, not Mongo.
      `return this.repository.find();`,
      `return this.repository.find({ where: filter });`,
    ],
    invalid: [
      // Still fires on a Mongoose model and on the native driver.
      {
        code: `const results = await this.model.find(filter);`,
        errors: [{ messageId: 'unboundedFind' }],
      },
      {
        code: `User.find({ active: true });`,
        errors: [{ messageId: 'unboundedFind' }],
      },
      {
        code: `db.collection('users').find({ active: true }).toArray();`,
        errors: [{ messageId: 'unboundedFind' }],
      },
    ],
  });

  // -------------------------------------------------------------------------
  // no-select-sensitive-fields — 80 findings, over half the total, none of
  // which involved a model that has a sensitive field.
  // -------------------------------------------------------------------------

  ruleTester.run('no-select-sensitive-fields', noSelectSensitiveFields, {
    valid: [
      // src/core/bird/use-cases/* — demo entities with no credential field.
      `const bird = await this.birdRepository.findById(id);`,
      `const cat = await this.catRepository.findById(id);`,
      // src/infra/repository/postgres/repository.ts — generic TypeORM wrapper.
      `return this.repository.findOne({ where: { id } });`,
      `return this.repository.find({ where: filter });`,
      // src/infra/repository/mongo/repository.ts — a Mongoose model, but
      // `T` is generic: nothing here says the document has a password.
      `const data = await this.model.findOne(filter);`,
      // Array.prototype.find shares the method name.
      `const allowed = sortList.find((s) => s.name === key);`,
      `const status = [error.getStatus(), error['status']].find(Boolean);`,
    ],
    invalid: [
      // Schema in view names a sensitive field — the claim is now grounded.
      {
        code: `const userSchema = new Schema({ email: String, password: String });
               const user = await User.findOne({ email });`,
        errors: [{ messageId: 'selectSensitiveFields' }],
      },
      // The query itself names the sensitive field: no schema lookup needed.
      {
        code: `db.users.find({}, { projection: { password: 1 } });`,
        errors: [{ messageId: 'selectSensitiveFields' }],
      },
      {
        code: `User.find({}).select('name password email');`,
        errors: [{ messageId: 'selectSensitiveFields' }],
      },
      // Opting out of the schema-visibility gate restores the old behaviour.
      {
        code: `const user = await User.findOne({ email });`,
        options: [{ requireVisibleSensitiveField: false }],
        errors: [{ messageId: 'selectSensitiveFields' }],
      },
    ],
  });

  // -------------------------------------------------------------------------
  // no-bypass-middleware — 11 findings, 4 on a repository wrapper with no
  // Mongoose middleware to bypass.
  // -------------------------------------------------------------------------

  ruleTester.run('no-bypass-middleware', noBypassMiddleware, {
    valid: [
      // src/core/bird/use-cases/bird-update.ts:30 and siblings.
      `await this.birdRepository.updateOne({ id: entity.id }, entity.toObject());`,
      `await this.permissionRepository.updateOne({ id: entity.id }, entity.toObject());`,
      // TypeORM repository.
      `await this.repository.updateOne({ id }, patch);`,
    ],
    invalid: [
      // src/infra/repository/mongo/repository.ts:207 — a real Mongoose model.
      {
        code: `const model = await this.model.findOneAndUpdate(filter, updated);`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
      {
        code: `await User.updateMany({ active: false }, { $set: { archived: true } });`,
        errors: [{ messageId: 'bypassMiddleware' }],
      },
    ],
  });
});
