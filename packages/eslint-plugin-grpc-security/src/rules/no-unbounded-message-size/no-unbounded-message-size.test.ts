/**
 * @fileoverview Tests for no-unbounded-message-size
 *
 * The keys are gRPC's own channel-argument names, so they are structure, not
 * a guess at what a consumer called something. The value is decided by
 * evaluating it: -1 (gRPC's "no limit") or a size above 100 MiB.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noUnboundedMessageSize } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const ERR = [{ messageId: 'unboundedMessageSize' as const }];
const RECV = `'grpc.max_receive_message_length'`;
const SEND = `'grpc.max_send_message_length'`;

ruleTester.run('no-unbounded-message-size', noUnboundedMessageSize, {
  valid: [
    { name: 'the gRPC default is left alone', code: `new grpc.Server();` },
    {
      name: 'a 16 MiB receive limit',
      code: `new grpc.Server({ ${RECV}: 16 * 1024 * 1024 });`,
    },
    {
      name: 'exactly 100 MiB is within the limit',
      code: `new grpc.Server({ ${SEND}: 100 * 1024 * 1024 });`,
    },
    {
      name: 'a size from configuration cannot be judged here',
      code: `new grpc.Server({ ${RECV}: config.maxMessageBytes });`,
    },
    {
      name: 'a reassigned binding is not followed',
      code: `let max = -1;\nmax = 4096;\nnew grpc.Server({ ${RECV}: max });`,
    },
    {
      name: 'a different channel argument',
      code: `new grpc.Server({ 'grpc.keepalive_time_ms': -1 });`,
    },
    {
      name: 'a key that only contains the channel-argument name',
      code: `const o = { 'x.grpc.max_receive_message_length': -1 };`,
    },
    {
      name: 'a computed key that cannot be read',
      code: `new grpc.Server({ [key]: -1 });`,
    },
    {
      name: 'a non-numeric value',
      code: `new grpc.Server({ ${RECV}: 'unlimited' });`,
    },
    {
      name: 'an expression the evaluator does not know',
      code: `new grpc.Server({ ${RECV}: Math.max(a, b) });`,
    },
    {
      name: 'assignment to another property',
      code: `options['grpc.keepalive_time_ms'] = -1;`,
    },
    {
      name: 'a divide by zero is not a size',
      code: `new grpc.Server({ ${RECV}: 1 / 0 - Infinity });`,
    },
    {
      name: 'a const cycle ends, it does not loop',
      code: `const a = b;\nconst b = a;\nnew grpc.Server({ ${RECV}: a });`,
    },
    {
      name: 'minus an unknown',
      code: `new grpc.Server({ ${RECV}: -limit });`,
    },
    {
      name: 'a unary operator the evaluator does not read',
      code: `new grpc.Server({ ${RECV}: ~0 });`,
    },
    {
      name: 'arithmetic with an unknown operand',
      code: `new grpc.Server({ ${RECV}: 1024 * mb });`,
    },
    {
      name: 'a bitwise operator the evaluator does not read',
      code: `new grpc.Server({ ${RECV}: 4096 | 0 });`,
    },
    {
      name: 'a bounded value assigned onto an options object',
      code: `options[${RECV}] = 4 * 1024 * 1024;`,
    },
  ],
  invalid: [
    {
      name: '-1 lifts the receive limit',
      code: `const server = new grpc.Server({ ${RECV}: -1 });`,
      errors: ERR,
    },
    {
      name: 'client options lifting the send limit',
      code: `const client = new pkg.Svc(target, creds, { ${SEND}: -1 });`,
      errors: ERR,
    },
    {
      name: 'a gigabyte, written as arithmetic',
      code: `new grpc.Server({ ${RECV}: 1024 * 1024 * 1024 });`,
      errors: ERR,
    },
    {
      name: 'through a const, and another const in the arithmetic',
      code: `const MB = 1024 * 1024;\nconst MAX = 512 * MB;\nnew grpc.Server({ ${RECV}: MAX });`,
      errors: ERR,
    },
    {
      name: 'a computed literal key and a plus',
      code: `new grpc.Server({ [${RECV}]: 100 * 1024 * 1024 + 1 });`,
      errors: ERR,
    },
    {
      name: 'Infinity and Number.MAX_SAFE_INTEGER',
      code: `new grpc.Server({ ${RECV}: Infinity, ${SEND}: Number.MAX_SAFE_INTEGER });`,
      errors: [...ERR, ...ERR],
    },
    {
      name: 'subtraction, division and exponent',
      code: `new grpc.Server({ ${RECV}: (2 ** 31 - 1) / 2 });`,
      errors: ERR,
    },
    {
      name: 'a gigabyte written as a shift',
      code: `new grpc.Server({ ${RECV}: 1 << 30 });`,
      errors: ERR,
    },
    {
      name: 'assigned onto an options object',
      code: `const options = {};\noptions[${RECV}] = -1;`,
      errors: ERR,
    },
    {
      name: 'a TypeScript cast and a plus sign',
      code: `new grpc.Server({ ${RECV}: (+(-1)) as number });`,
      errors: ERR,
    },
  ],
});
