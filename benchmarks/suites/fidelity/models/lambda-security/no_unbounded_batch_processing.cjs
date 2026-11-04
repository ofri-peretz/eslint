const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const PARAM = {
  Event: 'event',
  Evt: 'evt',
  PayloadOpt: 'payload',
  PayloadNoOpt: 'payload',
};

// The handler body for batch access `a`, bound `b`, event parameter `ev`.
function body(a, b, ev) {
  const pre = [];
  let recs = a === 'Bracket' ? `${ev}['Records']` : `${ev}.Records`;
  if (a === 'Destructured') {
    pre.push(`const { Records } = ${ev};`);
    recs = 'Records';
  }
  const limit = {
    LengthConst: 'MAX_BATCH_SIZE',
    LengthSmall: '10',
    LengthLarge: '10000',
  }[b];
  if (limit)
    pre.push(
      `if (${recs}.length > ${limit}) {`,
      "  throw new Error('Batch too large');",
      '}',
    );
  if (b === 'SliceSmall') recs = `${recs}.slice(0, 10)`;
  if (b === 'SliceLarge') recs = `${recs}.slice(0, 5000)`;
  if (b === 'UnrelatedLength') {
    pre.push(
      "const tenantId = 'acme';",
      'if (tenantId.length > 64) {',
      "  throw new Error('bad tenant');",
      '}',
    );
  }
  const each =
    b === 'UnrelatedSlice'
      ? [
          "  console.log('processing', record.messageId.slice(0, 8));",
          '  await processRecord(record);',
        ]
      : ['  await processRecord(record);'];
  switch (a) {
    case 'NoBatch':
      return [...pre, `await processRecord(${ev}.detail);`];
    case 'MapAll':
      return [
        ...pre,
        `await Promise.all(${recs}.map(async (record: any) => {`,
        ...each,
        '}));',
      ];
    case 'ForEach':
      return [
        ...pre,
        `${recs}.forEach(async (record: any) => {`,
        ...each,
        '});',
      ];
    default:
      return [...pre, `for (const record of ${recs}) {`, ...each, '}'];
  }
}

const base = {
  rule: 'no-unbounded-batch-processing',
  // Bounds 8 x 2 maxBatchSize; Accesses 6 x 2 bounds; Params 4; Gates 9.
  domain: 16 + 12 + 4 + 9,
  traces: 1000,
  key: (s) =>
    ['focus', 'access', 'bound', 'bigMax', 'param', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (s.bigMax) o.maxBatchSize = 20000;
    if (tag(s.param) === 'PayloadOpt') o.eventParamNames = ['payload'];
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const gate = tag(s.gate);
    const handlerGate = !gate.startsWith('Sdk') && gate !== 'NoEvidence';
    const ev = handlerGate ? PARAM[tag(s.param)] : 'event';
    return lambdaProgram(
      gate,
      [
        ...body(tag(s.access), tag(s.bound), ev),
        'return { batchItemFailures: [] };',
      ],
      {
        imports: ["import { processRecord } from './worker';"],
        pre: ['const MAX_BATCH_SIZE = 10;'],
        params: `${ev}: any, context: any`,
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
