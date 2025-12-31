/**
 * Tests for prefer-modern-api
 * Suggests modern replacements for deprecated or outdated libraries
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferModernApi } from '../rules/prefer-modern-api';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-modern-api', preferModernApi, {
  valid: [
    // ✅ Modern alternatives
    {
      code: `import { format } from 'date-fns';`,
      options: [{}],
    },

    // ✅ Modern HTTP client
    {
      code: `import axios from 'axios';`,
      options: [{}],
    },

    // ✅ Modern state management
    {
      code: `import { create } from 'zustand';`,
      options: [{}],
    },

    // ✅ Modern validation
    {
      code: `import { z } from 'zod';`,
      options: [{}],
    },

    // ✅ Modern bundler
    {
      code: `import { defineConfig } from 'vite';`,
      options: [{}],
    },

    // ✅ Relative import (not a package)
    {
      code: `import { helper } from './moment-utils';`,
      options: [{}],
    },

    // ✅ Built-in disabled
    {
      code: `import moment from 'moment';`,
      options: [{ disableBuiltIn: true }],
    },
  ],

  invalid: [
    // ❌ moment.js (built-in)
    {
      code: `import moment from 'moment';`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ moment subpath
    {
      code: `import { utc } from 'moment/utc';`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ request (deprecated)
    {
      code: `import request from 'request';`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ node-sass
    {
      code: `const sass = require('node-sass');`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ underscore
    {
      code: `import _ from 'underscore';`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ bcrypt-nodejs
    {
      code: `import bcrypt from 'bcrypt-nodejs';`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ Custom mapping
    {
      code: `import { legacy } from 'legacy-lib';`,
      options: [{
        customMappings: [
          {
            deprecated: 'legacy-lib',
            modern: 'modern-lib',
            reason: 'legacy-lib is no longer maintained',
            difficulty: 'easy',
          },
        ],
      }],
      errors: [{ messageId: 'preferModernApi' }],
    },

    // ❌ Dynamic import with outdated package
    {
      code: `const m = await import('moment');`,
      options: [{}],
      errors: [{ messageId: 'preferModernApi' }],
    },
  ],
});
