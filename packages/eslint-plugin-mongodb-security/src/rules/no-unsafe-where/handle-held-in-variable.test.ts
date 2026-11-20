/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `$where` in a DAO that never imports a Mongo package.
 *
 * The usual layout hands the connected `db` to a constructor and keeps the
 * collection in a variable: `const col = db.collection('x')`, then
 * `col.find(q).toArray(cb)`. The file-level gate only recognised a
 * `.collection('x')` call chained directly into the query, so the whole plugin
 * abstained on that layout, including on a `$where` built from request data.
 *
 * Fixtures here are deliberately NOT wrapped with an `import 'mongoose'`: the
 * gate is the thing under test.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeWhere } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

describe('no-unsafe-where: handle held in a variable, no Mongo import', () => {
  ruleTester.run('no-unsafe-where', noUnsafeWhere, {
    valid: [
      {
        name: 'Firestore handle in a variable: no Mongo evidence, no report',
        code: `const Dao = function (db) {
          const col = db.collection('stocks');
          this.get = (t) => col.where('$where', '==', t).get();
        };`,
      },
      {
        name: 'a plain object key named $where in a file with no Mongo evidence',
        code: `const filter = { $where: 'x' }; render(filter);`,
      },
      {
        name: 'a Mongo-evidenced file without $where',
        code: `const Dao = function (db) {
          const col = db.collection('stocks');
          this.get = (id, cb) => col.find({ userId: id }).toArray(cb);
        };`,
      },
    ],
    invalid: [
      {
        name: 'template-literal $where over request data, handle in a variable',
        code: `const Dao = function (db) {
          const col = db.collection('allocations');
          this.search = (threshold, cb) => {
            const criteria = { $where: \`this.stocks > '\${threshold}'\` };
            col.find(criteria).toArray(cb);
          };
        };`,
        errors: [{ messageId: 'unsafeWhere' }],
      },
      {
        name: 'inline $where, handle assigned after declaration',
        code: `let items;
        items = db.collection('items');
        items.find({ $where: req.query.js }).toArray(cb);`,
        errors: [{ messageId: 'unsafeWhere' }],
      },
    ],
  });
});
