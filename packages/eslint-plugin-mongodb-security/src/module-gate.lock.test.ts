/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file with no MongoDB in
 * it.
 *
 * Measured over the corpus, **47% of everything this plugin reported (1,663 of
 * 3,542 findings) was in a file with no Mongo import**. The plugin already
 * discriminated by *receiver* (`receiver.ts`), but that is a name heuristic:
 * `userModel.findOne()` reads the same in a TypeORM repository as in a
 * Mongoose one. This lock pins the file-level question.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/**
 * Shapes that drew findings from this plugin across the corpus while having no
 * MongoDB in them.
 *
 * The first three are real files: 73% of the off-SDK findings sat in
 * repositories with **zero** Mongo anywhere — twentyhq, strapi and cal.com are
 * TypeORM and Prisma. The last three are the operator/identifier collisions
 * that the gate deliberately refuses to treat as evidence.
 */
const NON_MONGO_SOURCES: ReadonlyArray<readonly [string, string]> = [
  [
    'a TypeORM repository',
    `import { Repository } from 'typeorm';
     export class UserService {
       constructor(private userModel: Repository<User>) {}
       find(id: string) { return this.userModel.findOne({ where: { id } }); }
     }`,
  ],
  [
    'a Prisma client call',
    `import { PrismaClient } from '@prisma/client';
     const prisma = new PrismaClient();
     export const get = (id: string) => prisma.user.findOne({ where: { id } });`,
  ],
  [
    'a generic repository wrapper with a mongo-shaped name',
    `export class Repo {
       constructor(private collection: unknown) {}
       async findOne(q: object) { return this.collection.findOne(q); }
     }`,
  ],
  [
    "react-addons-update's $push — not a Mongo operator",
    `import update from 'react-addons-update';
     const next = update(state, { items: { $push: [item] } });`,
  ],
  [
    "jQuery UI's $set — not a Mongo operator",
    `const options = { $set: { disabled: true }, $inc: { count: 1 } };
     export default options;`,
  ],
  [
    'a bare ObjectId type name from an unrelated library',
    `import type { ObjectId } from 'bson-objectid-lookalike';
     export function read(id: ObjectId) { return String(id); }`,
  ],
  [
    'a local module merely named mongoose',
    `import mongoose from './mongoose';
     export const db = mongoose.connect('localhost');`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` is explicit: the declared ESLint floor still defaults
  // `new Linter()` to eslintrc, where a flat config is ignored and every rule
  // silently skipped — the vacuous pass this lock exists to catch.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { xp: plugin as unknown as Linter.Plugin },
      rules: { [`xp/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry, so every rule is skipped and every negative passes vacuously. The
    // positive controls below are what catch that. `service.ts` rather than a
    // test path, because several rules allow themselves in test files.
    'service.ts',
  );
};

describe('MongoDB module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_MONGO_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('xp/%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also produces zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages).toHaveLength(0);
    });
  });

  describe('positive controls — the gate must open for real Mongo code', () => {
    // The shape no-hardcoded-connection-string keys on.
    const dsn = `const uri = 'mongodb://admin:hunter2@localhost:27017/app';`;

    it('reports once the file imports mongoose', () => {
      expect(
        lint(`import mongoose from 'mongoose';\n${dsn}`, 'no-hardcoded-connection-string')
          .length,
      ).toBeGreaterThan(0);
    });

    it('reports on a mongodb:// literal with no import at all', () => {
      // The DSN names the protocol; it is evidence in itself.
      expect(lint(dsn, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('opens on a mongoose PLUGIN import, not just mongoose itself', () => {
      // Eleven of the twelve corpus files holding `new Schema(` that a
      // four-package list placed "outside Mongo" were exactly this.
      expect(
        lint(`import paginate from 'mongoose-paginate';\n${dsn}`, 'no-hardcoded-connection-string')
          .length,
      ).toBeGreaterThan(0);
    });

    it('opens on new Schema({...}) with no mongo import', () => {
      const code = `const userSchema = new Schema({ name: String });\n${dsn}`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('opens on a .lean() query modifier', () => {
      const code = `export const all = () => Model.find({}).lean();\n${dsn}`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('opens on Types.ObjectId', () => {
      const code = `export const id = new Types.ObjectId();\n${dsn}`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it("opens on a dynamic await import('mongodb')", () => {
      // Lazily importing the driver inside a handler is idiomatic in
      // serverless code; a gate that only saw static imports would abstain on
      // exactly the files most likely to hold a connection string.
      const code = `export async function handler() {
        const { MongoClient } = await import('mongodb');
        return MongoClient;
      }
      ${dsn}`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('opens on a mongodb:// template literal', () => {
      const code = 'const uri = `mongodb://admin:hunter2@${host}:27017/app`;';
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it("opens on TypeScript's import-equals form", () => {
      // `import x = require('mongoose')` is a TSImportEqualsDeclaration, not a
      // require CallExpression. DefinitelyTyped writes nearly every CommonJS
      // type test this way; three corpus files were silenced until the recall
      // diff caught it.
      const code = `import mongoose = require('mongoose');\n${dsn}`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('opens on a DSN that is not at the start of the string', () => {
      // Env-file generators write `MONGODB_URL=mongodb://...`; anchoring the
      // match to the start of the literal silenced two corpus files.
      const code = `const line = 'MONGODB_URL=mongodb://admin:hunter2@127.0.0.1/db';`;
      expect(lint(code, 'no-hardcoded-connection-string').length).toBeGreaterThan(0);
    });

    it('and stays silent on that same DSN-free file with no Mongo evidence', () => {
      expect(
        lint(`const uri = 'postgres://localhost/app';`, 'no-hardcoded-connection-string'),
      ).toHaveLength(0);
    });
  });

  describe('a locally bound require is not module loading', () => {
    it('does not open the gate', () => {
      const code = `function wrap(require) { return require('mongoose'); }
      export const q = { user: 1 };`;
      expect(lint(code, 'no-hardcoded-connection-string')).toHaveLength(0);
    });

    it('but shadowing stays lexical — a real load elsewhere still opens it', () => {
      // The file-wide-flag bug (#483) silenced the whole plugin here.
      const code = `const mongoose = require('mongoose');
      function wrap(require) { return require('x'); }
      const uri = 'mongodb://admin:hunter2@localhost:27017/app';`;
      expect(
        lint(code, 'no-hardcoded-connection-string').length,
      ).toBeGreaterThan(0);
    });
  });
});
