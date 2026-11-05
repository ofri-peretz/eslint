/**
 * Tests for prefer-direct-import
 * Suggests direct imports over barrel imports with autofix
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferDirectImport } from '../rules/prefer-direct-import';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-direct-import', preferDirectImport, {
  valid: [
    // ✅ Direct import (already using component path)
    {
      name: 'an import of the module itself',
      code: `import { Button } from '@/components/Button';`,
    },

    // ✅ Non-matching barrel path (not configured)
    {
      code: `import { something } from '@/services';`,
    },

    // ✅ External package (not a barrel)
    {
      code: `import React from 'react';`,
    },

    // ✅ Default import from barrel (not flagged - might be intentional)
    {
      code: `import components from '@/components';`,
    },

    // ✅ Namespace import from barrel (handled by prefer-tree-shakeable-imports)
    {
      code: `import * as Components from '@/components';`,
    },

    // ✅ Side-effect import
    {
      code: `import '@/styles/global.css';`,
    },

    // ✅ Type-only import (often valid from barrels)
    {
      code: `import type { ButtonProps } from '@/components';`,
    },

    // ✅ Path not in mappings
    {
      code: `import { helper } from './utils';`,
    },
  ],

  invalid: [
    // ❌ Single named import from barrel
    {
      name: 'an import through the barrel',
      code: `import { Button } from '@/components';`,
      output: `import { Button } from '@/components/Button';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from hooks barrel
    {
      code: `import { useAuth } from '@/hooks';`,
      output: `import { useAuth } from '@/hooks/useAuth';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from utils barrel
    {
      code: `import { formatDate } from '@/utils';`,
      output: `import { formatDate } from '@/utils/formatDate';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from lib barrel
    {
      code: `import { fetcher } from '@/lib';`,
      output: `import { fetcher } from '@/lib/fetcher';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Tilde alias barrel
    {
      code: `import { Modal } from '~/components';`,
      output: `import { Modal } from '~/components/Modal';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Multiple named imports (reports on each specifier)
    {
      code: `import { Button, Modal } from '@/components';`,
      errors: [
        { messageId: 'preferDirectImport' },
        { messageId: 'preferDirectImport' },
      ],
    },

    // ❌ Custom mapping via configuration
    {
      code: `import { DataTable } from '@acme/ui';`,
      output: `import { DataTable } from '@acme/ui/DataTable';`,
      options: [
        {
          mappings: [{ barrel: '^@acme/ui$', directPath: '@acme/ui/{name}' }],
        },
      ],
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ With autoFix disabled (suggestion only, no fix applied)
    {
      code: `import { Icon } from '@/components';`,
      options: [
        {
          autoFix: false,
          mappings: [{ barrel: '^@/components$', directPath: '@/components/{name}' }],
        },
      ],
      errors: [
        {
          messageId: 'preferDirectImport',
          suggestions: [{ messageId: 'preferDirectImport', output: `import { Icon } from '@/components/Icon';` }],
        },
      ],
    },
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
// prefer_direct_import): inline `type` specifiers were reported though they
// are erased, and `export { X } from` the barrel was not read.
const ui = [{ mappings: [{ barrel: '^@/ui$', directPath: '@/ui/{name}' }] }];
ruleTester.run('prefer-direct-import - fidelity', preferDirectImport, {
  valid: [
    { name: 'inline type imports only', code: "import { type Props } from '@/ui';", options: ui },
    { name: 'export type from a barrel', code: "export type { Props } from '@/ui';", options: ui },
    { name: 'export { type P } from a barrel', code: "export { type Props } from '@/ui';", options: ui },
    { name: 'a local export list', code: 'const a = 1;\nexport { a };', options: ui },
    { name: 'export * has no name to map', code: "export * from '@/ui';", options: ui },
  ],
  invalid: [
    {
      name: 'export { Button } from a barrel',
      code: "export { Button } from '@/ui';",
      output: "export { Button } from '@/ui/Button';",
      options: ui,
      errors: [{ messageId: 'preferDirectImport' }],
    },
    {
      name: 'a value specifier beside an inline type one is reported, not fixed',
      code: "import { type Props, Button } from '@/ui';",
      options: ui,
      errors: [
        {
          messageId: 'preferDirectImport',
          // Several specifiers: the split is manual, so no rewrite is offered.
          suggestions: [],
        },
      ],
    },
  ],
});
