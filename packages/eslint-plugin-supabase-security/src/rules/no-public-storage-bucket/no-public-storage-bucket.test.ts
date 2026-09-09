/**
 * @fileoverview Tests for no-public-storage-bucket
 *
 * Coverage intent: both bucket methods, every way `public` can be written and
 * missed, and the litmus that the rule keys on the option rather than on names.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noPublicStorageBucket } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { createClient } from '@supabase/supabase-js';`;

ruleTester.run('no-public-storage-bucket', noPublicStorageBucket, {
  valid: [
    {
      name: 'private by default',
      code: `${IMPORT}\nawait db.storage.createBucket('avatars');`,
    },
    {
      name: 'public explicitly false',
      code: `${IMPORT}\nawait db.storage.createBucket('avatars', { public: false });`,
    },
    {
      name: 'a computed key is unreadable',
      code: `${IMPORT}\nawait db.storage.createBucket('a', { [key]: true });`,
    },
    {
      name: 'public set to something that is not the literal true',
      code: `${IMPORT}\nawait db.storage.createBucket('a', { public: isPublic });`,
    },
    {
      name: 'a spread carries options this node cannot see',
      code: `${IMPORT}\nawait db.storage.createBucket('a', { ...opts });`,
    },
    {
      name: 'a different method',
      code: `${IMPORT}\nawait db.storage.emptyBucket('a');`,
    },
    {
      name: 'a computed member is not createBucket',
      code: `${IMPORT}\nawait db.storage[m]('a');`,
    },
    {
      name: 'a bare call',
      code: `${IMPORT}\ncreateBucket('a', { public: true });`,
    },
    {
      name: 'no options object',
      code: `${IMPORT}\nawait db.storage.createBucket('a', 1);`,
    },
    {
      name: 'no Supabase import',
      code: `await db.storage.createBucket('a', { public: true });`,
    },
  ],
  invalid: [
    {
      name: 'createBucket public',
      code: `${IMPORT}\nawait db.storage.createBucket('avatars', { public: true });`,
      errors: [{ messageId: 'publicBucket' }],
    },
    {
      name: 'updateBucket public',
      code: `${IMPORT}\nawait db.storage.updateBucket('avatars', { public: true });`,
      errors: [{ messageId: 'publicBucket' }],
    },
    {
      name: 'a quoted key is the same key',
      code: `${IMPORT}\nawait db.storage.createBucket('a', { 'public': true });`,
      errors: [{ messageId: 'publicBucket' }],
    },
    {
      name: 'still fires with every identifier renamed to foo and bar',
      code: `import { foo } from '@supabase/supabase-js';\nconst bar = foo();\nawait bar.baz.createBucket('qux', { public: true });`,
      errors: [{ messageId: 'publicBucket' }],
    },
  ],
});
