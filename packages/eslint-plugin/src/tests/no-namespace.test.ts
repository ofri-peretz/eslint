import { RuleTester } from '@typescript-eslint/rule-tester';
import { noNamespace } from '../rules/react/no-namespace';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

ruleTester.run('no-namespace', noNamespace, {
  valid: [
    // Valid - named imports
    {
      name: 'named import from react',
      code: `import { Component } from 'react';`,
    },
    {
      name: 'multiple named imports',
      code: `import { Component, useState, useEffect } from 'react';`,
    },
    {
      name: 'named import with alias',
      code: `import { Component as ReactComponent } from 'react';`,
    },
    // Valid - default import
    {
      name: 'default import',
      code: `import React from 'react';`,
    },
    {
      name: 'default import with alias',
      code: `import ReactLib from 'react';`,
    },
    // Valid - default and named imports
    {
      name: 'default and named imports',
      code: `import React, { Component, useState } from 'react';`,
    },
    // Valid - type imports (TypeScript)
    {
      name: 'type import',
      code: `import type { FC, ReactNode } from 'react';`,
    },
    // Valid - side-effect import
    {
      name: 'side-effect import',
      code: `import 'react';`,
    },
    // Valid - other modules
    {
      name: 'named import from lodash',
      code: `import { map, filter } from 'lodash';`,
    },
    {
      name: 'default import from lodash',
      code: `import _ from 'lodash';`,
    },
    // Valid - dynamic import
    {
      name: 'dynamic import',
      code: `const React = await import('react');`,
    },
    // Valid - require statement
    {
      name: 'require statement',
      code: `const React = require('react');`,
    },
  ],
  invalid: [
    // Invalid - namespace import from react
    {
      name: 'namespace import from react',
      code: `import * as React from 'react';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    {
      name: 'namespace import with different name',
      code: `import * as R from 'react';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    // Invalid - namespace import from other modules
    {
      name: 'namespace import from lodash',
      code: `import * as _ from 'lodash';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    {
      name: 'namespace import from local module',
      code: `import * as utils from './utils';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    {
      name: 'namespace import from package',
      code: `import * as Axios from 'axios';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    // Invalid - default with namespace import
    {
      name: 'default with namespace import',
      code: `import React, * as ReactAll from 'react';`,
      errors: [{ messageId: 'noNamespace' }],
    },
    // Invalid - multiple namespace imports
    {
      name: 'multiple namespace imports in file',
      code: `
        import * as React from 'react';
        import * as Lodash from 'lodash';
      `,
      errors: [
        { messageId: 'noNamespace' },
        { messageId: 'noNamespace' },
      ],
    },
  ],
});

