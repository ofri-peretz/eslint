/**
 * LLM/MCP-focused integration tests across multiple rules
 * 
 * These tests validate security rules against LLM and Model Context Protocol (MCP) scenarios:
 * - detect-object-injection (using tool output as keys)
 * - detect-non-literal-fs-filename (file paths from tool output)
 * - detect-child-process (executing commands from agent/model)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { describe, it, afterAll } from 'vitest';

import { detectObjectInjection } from '../detect-object-injection';
import { detectNonLiteralFsFilename } from '../detect-non-literal-fs-filename';
import { detectChildProcess } from '../detect-child-process';

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
  // Note: Some LLM-specific patterns may not be caught by all rules depending on their implementation.
  // These tests focus on patterns that are reliably detected.

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
    valid: [],
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
