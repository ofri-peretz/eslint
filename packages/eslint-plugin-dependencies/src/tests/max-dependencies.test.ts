/**
 * Comprehensive tests for max-dependencies rule
 * Enforce maximum number of dependencies a module can have
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { maxDependencies } from '../rules/max-dependencies';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('max-dependencies', () => {
  describe('Basic dependency counting', () => {
    ruleTester.run('count dependencies correctly', maxDependencies, {
      valid: [
        // Under limit (default max: 10)
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
          `,
          filename: '/test/file.ts',
        },
        // Exactly at limit
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
            import babel from 'babel-core';
            import jest from 'jest';
            import eslint from 'eslint';
            import prettier from 'prettier';
          `,
          filename: '/test/file.ts',
        },
      ],
      invalid: [
        // Over limit - just check messageId, skip suggestion verification
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
            import babel from 'babel-core';
            import jest from 'jest';
            import eslint from 'eslint';
            import prettier from 'prettier';
            import typescript from 'typescript';
          `,
          filename: '/test/file.ts',
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Different import types', () => {
    ruleTester.run('handle ES6 imports', maxDependencies, {
      valid: [
        {
          code: `
            import { useState } from 'react';
            import { map } from 'lodash';
            import { get } from 'axios';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('handle require() calls', maxDependencies, {
      valid: [
        {
          code: `
            const react = require('react');
            const lodash = require('lodash');
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
        },
      ],
      invalid: [
        {
          code: `
            const react = require('react');
            const lodash = require('lodash');
            const axios = require('axios');
            const moment = require('moment');
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('handle dynamic imports', maxDependencies, {
      valid: [
        {
          code: `
            const react = await import('react');
            const lodash = await import('lodash');
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
        },
      ],
      invalid: [
        {
          code: `
            const react = await import('react');
            const lodash = await import('lodash');
            const axios = await import('axios');
            const moment = await import('moment');
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('mixed import types', maxDependencies, {
      valid: [
        {
          code: `
            import react from 'react';
            const lodash = require('lodash');
            const axios = await import('axios');
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            const axios = require('axios');
            const moment = require('moment');
            const express = await import('express');
            const webpack = await import('webpack');
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Type-only imports', () => {
    ruleTester.run('ignore type-only imports by default', maxDependencies, {
      valid: [
        {
          code: `
            import type { FC } from 'react';
            import type { Dictionary } from 'lodash';
            import type { AxiosResponse } from 'axios';
            import type { Moment } from 'moment';
            import type { Express } from 'express';
            import type { Configuration } from 'webpack';
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('count type-only imports when disabled', maxDependencies, {
      valid: [],
      invalid: [
        {
          code: `
            import type { FC } from 'react';
            import type { Dictionary } from 'lodash';
            import type { AxiosResponse } from 'axios';
            import type { Moment } from 'moment';
            import type { Express } from 'express';
            import type { Configuration } from 'webpack';
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5, ignoreTypeImports: false }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Ignore patterns', () => {
    ruleTester.run('ignore specific imports', maxDependencies, {
      valid: [
        {
          code: `
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 3, ignoreImports: ['react', 'lodash'] }],
        },
      ],
      invalid: [
        {
          code: `
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/test/file.ts',
          options: [{ max: 3, ignoreImports: ['react', 'lodash'] }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('ignore files by pattern', maxDependencies, {
      valid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/test/utils/index.ts',
          options: [{ max: 3, ignoreFiles: ['**/utils/**'] }],
        },
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/src/components/helper.ts',
          options: [{ max: 3, ignoreFiles: ['**/components/**', '**/utils/**'] }],
        },
      ],
      invalid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/src/services/api.ts',
          options: [{ max: 3, ignoreFiles: ['**/utils/**'] }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Node.js built-ins and relative imports', () => {
    ruleTester.run('ignore Node.js built-ins', maxDependencies, {
      valid: [
        {
          code: `
            import fs from 'fs';
            import path from 'path';
            import util from 'util';
            import crypto from 'crypto';
            import child_process from 'child_process';
            import http from 'http';
            import https from 'https';
            import os from 'os';
            import events from 'events';
            import stream from 'stream';
            import buffer from 'buffer';
            import url from 'url';
            import querystring from 'querystring';
            import React from 'react';
            import lodash from 'lodash';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('ignore relative imports', maxDependencies, {
      valid: [
        {
          code: `
            import { helper } from './utils';
            import { config } from '../config';
            import Component from '../../components/Component';
            import { api } from '../../../services/api';
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('count external packages only', maxDependencies, {
      valid: [],
      invalid: [
        {
          code: `
            import { helper } from './utils';
            import { config } from '../config';
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Scoped packages', () => {
    ruleTester.run('handle scoped packages correctly', maxDependencies, {
      valid: [
        {
          code: `
            import React from 'react';
            import { useState } from 'react';
            import lodash from 'lodash';
            import fp from 'lodash/fp';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [
        {
          code: `
            import React from 'react';
            import { useState } from 'react';
            import lodash from 'lodash';
            import fp from 'lodash/fp';
            import axios from 'axios';
            import moment from 'moment';
          `,
          filename: '/test/file.ts',
          options: [{ max: 3 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('handle complex scoped packages', maxDependencies, {
      valid: [
        {
          code: `
            import { Component } from '@mui/material';
            import Button from '@mui/material/Button';
            import { styled } from '@emotion/styled';
            import axios from 'axios';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [
        {
          code: `
            import { Component } from '@mui/material';
            import Button from '@mui/material/Button';
            import { styled } from '@emotion/styled';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 4 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('custom max limit', maxDependencies, {
      valid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
        },
      ],
      invalid: [
        {
          code: `
            import react from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/test/file.ts',
          options: [{ max: 5 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('combined ignore options', maxDependencies, {
      valid: [
        {
          code: `
            import type { FC } from 'react';
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
          `,
          filename: '/test/utils/helper.ts',
          options: [{
            max: 3,
            ignoreImports: ['react', 'lodash'],
            ignoreFiles: ['**/utils/**'],
            ignoreTypeImports: true
          }],
        },
      ],
      invalid: [
        {
          code: `
            import type { FC } from 'react';
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
            import webpack from 'webpack';
          `,
          filename: '/src/components/Component.ts',
          options: [{
            max: 3,
            ignoreImports: ['react', 'lodash'],
            ignoreFiles: ['**/utils/**'],
            ignoreTypeImports: true
          }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('empty modules', maxDependencies, {
      valid: [
        {
          code: '// No imports',
          filename: '/test/file.ts',
        },
        {
          code: `
            // Only comments and no imports
            const x = 1;
          `,
          filename: '/test/file.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('duplicate imports', maxDependencies, {
      valid: [],
      invalid: [
        {
          code: `
            import React from 'react';
            import React2 from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 4 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });

    ruleTester.run('mixed valid and invalid imports', maxDependencies, {
      valid: [],
      invalid: [
        {
          code: `
            import fs from 'fs';
            import path from 'path';
            import { helper } from './utils';
            import { config } from '../config';
            import type { FC } from 'react';
            import React from 'react';
            import lodash from 'lodash';
            import axios from 'axios';
            import moment from 'moment';
            import express from 'express';
          `,
          filename: '/test/file.ts',
          options: [{ max: 4 }],
          errors: [{ messageId: 'maxDependencies' }],
        },
      ],
    });
  });
});
