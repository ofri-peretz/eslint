/**
 * Partition: require-emitter-error-handler and require-stream-error-handler.
 *
 * Both share CWE-248 and visit calls, so one line could be reported twice. They
 * are split by what they read: this rule reads the CREATION of a ClientRequest
 * or ChildProcess, resolved to its module; the stream rule reads a `.pipe()`
 * whose stream is a stream constructor. Each shape below is reported by exactly
 * one of them, and the one shape that contains both is two findings on two
 * different nodes, not one finding twice.
 */
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { requireEmitterErrorHandler } from './index';
import { requireStreamErrorHandler } from '../require-stream-error-handler';

function lint(code: string) {
  const linter = new Linter();
  return linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser, sourceType: 'module' },
        plugins: {
          ns: {
            rules: {
              'require-emitter-error-handler': requireEmitterErrorHandler,
              'require-stream-error-handler': requireStreamErrorHandler,
            },
          },
        },
        rules: {
          'ns/require-emitter-error-handler': 'error',
          'ns/require-stream-error-handler': 'error',
        },
      },
    ] as never,
    { filename: 'src/app.ts' },
  );
}

const IMPORTS = `import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
`;

const owner = (code: string) =>
  lint(IMPORTS + code).map((m) => `${m.ruleId}@${m.line}:${m.column}`);

describe('emitter and stream error-handler rules partition one shape to one rule', () => {
  it('a request piped into belongs to the emitter rule alone', () => {
    expect(owner('src.pipe(http.request(u));')).toEqual([
      'ns/require-emitter-error-handler@4:10',
    ]);
  });

  it('a spawned process with no pipe belongs to the emitter rule alone', () => {
    expect(
      owner("const child = spawn('git'); child.on('close', done);"),
    ).toEqual(['ns/require-emitter-error-handler@4:15']);
  });

  it('a file stream piped to a response belongs to the stream rule alone', () => {
    expect(owner('fs.createReadStream(p).pipe(res);')).toEqual([
      'ns/require-stream-error-handler@4:1',
    ]);
  });

  it('one pipe holding both kinds is two findings on two different nodes', () => {
    expect(owner('fs.createReadStream(p).pipe(http.request(u));')).toEqual([
      'ns/require-stream-error-handler@4:1',
      'ns/require-emitter-error-handler@4:29',
    ]);
  });
});
