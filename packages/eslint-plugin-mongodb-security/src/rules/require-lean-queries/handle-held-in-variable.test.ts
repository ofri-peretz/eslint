/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.lean()` on a native-driver collection held in a variable.
 *
 * A migrate-mongo script opens the collection once and queries it through the
 * variable:
 *
 *   const assetsCollection = db.collection('assets');
 *   const assets = await assetsCollection.find({ … }).toArray();
 *
 * That is the native driver, which has no `.lean()`, so the rule's suggestion
 * would produce code that throws. The inline form
 * (`db.collection('assets').find(…)`) was already exempt; the bound form was
 * not. ILB-Corpus-Truth run 45474907652 measured five such findings in
 * the-mirror's migrations. Fixtures are not given a Mongo import: the gate is
 * part of what is under test.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireLeanQueries } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

// Reduced from the-mirror mirror-web-server/migrations/themirror/20240408063332-remove-GLB-endings-on-uploads.js.
const migration = (query: string) => `
module.exports = {
  async up(db, client) {
    const assetsCollection = db.collection('assets');
    const assets = await ${query};
    for (const asset of assets) {
      await assetsCollection.updateOne({ _id: asset._id }, { $set: { name: asset.name } });
    }
  },
};`;

describe('require-lean-queries: native collection held in a variable', () => {
  ruleTester.run('require-lean-queries', requireLeanQueries, {
    valid: [
      {
        name: 'migrate-mongo script querying a bound collection handle',
        code: migration(
          "assetsCollection.find({ name: { $regex: 'GLB', $options: 'i' } }).toArray()",
        ),
      },
      {
        name: 'the handle assigned after declaration, queried twice',
        code: `let users;
users = db.collection('users');
users.findOne({ email }).then(() => users.deleteOne({ email }));
users.find({ active: true }).toArray();`,
      },
    ],
    invalid: [
      {
        name: 'a Mongoose model in the same file still reports',
        code: `const mongoose = require('mongoose');
const Asset = mongoose.model('Asset', assetSchema);
const users = db.collection('users');
users.deleteOne({ email });
Asset.find({ owner });`,
        errors: [
          {
            messageId: 'useLean',
            suggestions: [
              {
                messageId: 'suggestionAddLean',
                output: `const mongoose = require('mongoose');
const Asset = mongoose.model('Asset', assetSchema);
const users = db.collection('users');
users.deleteOne({ email });
Asset.find({ owner }).lean();`,
              },
            ],
          },
        ],
      },
    ],
  });
});
