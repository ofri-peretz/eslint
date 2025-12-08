/**
 * LLM/MCP-focused fixtures across multiple rules:
 * - no-unsafe-deserialization
 * - detect-object-injection
 * - detect-non-literal-fs-filename
 * - detect-child-process
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { describe, it, afterAll } from 'vitest';

import { noUnsafeDeserialization } from '../../rules/security/no-unsafe-deserialization';
import { detectObjectInjection } from '../../rules/security/detect-object-injection';
import { detectNonLiteralFsFilename } from '../../rules/security/detect-non-literal-fs-filename';
import { detectChildProcess } from '../../rules/security/detect-child-process';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('LLM/MCP fixtures', () => {
  ruleTester.run('no-unsafe-deserialization (LLM output)', noUnsafeDeserialization, {
    valid: [
      {
        code: 'const config = JSON.parse("{\\"safe\\":true}");',
      },
    ],
    invalid: [
      {
        code: 'const data = JSON.parse(modelOutput);',
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        code: 'const yaml = loader.load(llmResponse);',
        options: [{ dangerousFunctions: ['load', 'parse'] }],
        errors: [{ messageId: 'unsafeYamlParsing' }],
      },
    ],
  });

  ruleTester.run('detect-object-injection (tool output key)', detectObjectInjection, {
    valid: [
      {
        code: 'const safe = Object.create(null); safe.allowed = value;',
      },
    ],
    invalid: [
      {
        code: 'const key = toolResult.key; target[key] = value;',
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        code: 'obj[llmResponse.field] = 1;',
        errors: [{ messageId: 'objectInjection' }],
      },
    ],
  });

  ruleTester.run('detect-non-literal-fs-filename (tool path)', detectNonLiteralFsFilename, {
    valid: [
      {
        code: "fs.readFile('/var/app/data/safe.txt', cb);",
      },
    ],
    invalid: [
      {
        code: 'fs.readFile(toolOutput.path, cb);',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
      {
        code: 'fs.stat(modelResponse, cb);',
        errors: [{ messageId: 'fsPathTraversal' }],
      },
    ],
  });

  ruleTester.run('detect-child-process (agent command)', detectChildProcess, {
    valid: [
      {
        code: `
          import { execFile } from 'child_process';
          execFile('ls', ['-la']);
        `,
      },
    ],
    invalid: [
      {
        code: `
          const { exec } = require('child_process');
          exec(modelCommand);
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
      {
        code: `
          import { exec } from 'child_process';
          exec(toolParams.command);
        `,
        errors: [{ messageId: 'childProcessCommandInjection' }],
      },
    ],
  });
});
