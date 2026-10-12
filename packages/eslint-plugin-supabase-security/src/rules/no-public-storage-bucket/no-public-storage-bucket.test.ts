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
    // 2026-10-12 FP/FN audit
    {
      name: 'a spread after public: true may turn it back off',
      code: `${IMPORT}\nawait db.storage.createBucket('a', { public: true, ...overrides });`,
    },
    {
      name: 'a spread argument is unreadable',
      code: `${IMPORT}\nawait db.storage.createBucket(...args);`,
    },
    {
      name: 'a const options object that keeps the bucket private',
      code: `${IMPORT}\nconst foo = { public: false };\nawait db.storage.createBucket('a', foo);`,
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
    {
      name: 'FN: the options object held in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nconst foo = { public: true, fileSizeLimit: 1024 };\nawait db.storage.createBucket('a', foo);`,
      errors: [{ messageId: 'publicBucket' }],
    },
    {
      name: 'FN: public: true arriving through a same-file spread, the flag in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-supabase-security.md)
      code: `${IMPORT}\nconst yes = true;\nconst base = { public: yes };\nawait db.storage.updateBucket('a', { ...base, allowedMimeTypes: ['image/png'] });`,
      errors: [{ messageId: 'publicBucket' }],
    },
  ],
});
