/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A migration class name is words plus the epoch timestamp its generator
 * appended. ToolJet (server/src/migration-helpers/migration-mode.ts) lists
 * about sixty of them as strings to order an upgrade:
 *
 *   'AddMfaColumnsToUsers1784073600000',
 *   'MakeAppVersionBranchIdNotNullAndGitSyncFlags1781741000000',
 *
 * Every one cleared the random-key shape test (mixed case, digits, no ascending
 * run, 32+ characters) and was reported at CWE-798 / CVSS 9.8 with no
 * credential-named slot anywhere near it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — a migration name is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a list of TypeORM migration names (ToolJet)',
        code: `const MIGRATIONS = [
          'AddMfaColumnsToUsers1784073600000',
          'MakeAppVersionBranchIdNotNullAndGitSyncFlags1781741000000',
          'GeneralizeUserPersonalAccessTokens1787724102950',
        ];`,
      },
      {
        name: 'a migration name bound to a constant',
        code: `export const LEGACY_BRANCH_MIGRATION = 'MakeAppVersionBranchIdNotNullAndGitSyncFlags1781741000000';`,
      },
      {
        name: 'a migration name inside a tuple',
        code: `const steps = [['DropOrganizationGitSshTable1782900000000', noOp]];`,
      },
      {
        name: 'a generator that appends seconds, not milliseconds',
        code: `const MIGRATIONS = ['AddWorkflowFolderGranularPermissionsToAdmins1784112371'];`,
      },
    ],
    invalid: [
      {
        name: 'digits at the end do not excuse an opaque prefix',
        code: `const MIGRATIONS = ['KxQvTzWpRmNbYcLdHgFjSs1784073600000'];`,
        errors: 1,
      },
      {
        name: 'a 13-digit tail that is not a date in this century is not a timestamp',
        code: `const MIGRATIONS = ['AddMfaColumnsToUsersAndGroups9999999999999'];`,
        errors: 1,
      },
      {
        name: 'a 10-digit tail before 2000 is not a timestamp either',
        code: `const MIGRATIONS = ['AddMfaColumnsToUsersAndGroups0938475610'];`,
        errors: 1,
      },
      {
        name: 'a random key with digits spread through it still reports',
        code: `const MIGRATIONS = ['aB3dE5fG7hJ9kL1mN3pQ5rS7tV9wX1yZq'];`,
        errors: 1,
      },
    ],
  },
);
