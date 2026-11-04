/**
 * Shared spellings for the lambda-security models (`models/lambda-security/`).
 *
 * Every rule in eslint-plugin-lambda-security is gated on the file being
 * Lambda code. The plugin's evidence is a union, all local to the file:
 *
 *   - a `handler` export (`export const`, `export function`, `exports.handler`,
 *     `module.exports.handler`, `export { main as handler }`), or
 *   - a function taking the `(event, context)` calling convention, or
 *   - an AWS import (`@aws-sdk/*`, `aws-sdk`, `aws-lambda`, `@middy/*`,
 *     `@aws-lambda-powertools/*`, `serverless-*`), by `import` or `require`.
 *
 * Without any of them the same code is ordinary Node and every rule stays
 * silent. So each model samples the gate a file reaches the rule through:
 *
 *   - `ExportConst`   `export const handler = async (event, context) => { ... }`
 *   - `ExportsDot`    `exports.handler = async (event, context) => { ... }`
 *   - `ModuleExports` `module.exports.handler = async function (event, context) { ... }`
 *   - `FnDecl`        `export async function handler(event, context) { ... }`
 *   - `Renamed`       `const main = async (event, context) => ...; export { main as handler }`
 *   - `Middy`         `export const handler = middy(baseHandler).use(...)`
 *   - `SdkImport`     no handler, one-parameter function, `import ... from '@aws-sdk/client-s3'`
 *   - `SdkRequire`    the same through `require('@aws-sdk/client-s3')`
 *   - `NoEvidence`    the same one-parameter function, nothing AWS: always silent
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

const GATES = [
  'ExportConst',
  'ExportsDot',
  'ModuleExports',
  'FnDecl',
  'Renamed',
  'Middy',
  'SdkImport',
  'SdkRequire',
  'NoEvidence',
];

const isLambdaGate = (g) => g !== 'NoEvidence';

const indent = (lines, n = 2) =>
  lines
    .join('\n')
    .split('\n')
    .map((l) => (l ? ' '.repeat(n) + l : l))
    .join('\n');

/**
 * A whole module whose function `body` (an array of statement lines) runs with
 * the event in `event` (and, for handler gates, the context in `context`).
 * `imports` go first, `pre` after them, at module level.
 *
 * `params` overrides the parameter list of the handler gates; the evidence
 * gates (`SdkImport`, `SdkRequire`, `NoEvidence`) always take a lone `event`,
 * because `(event, context)` is evidence on its own.
 */
function lambdaProgram(
  gate,
  body,
  { imports = [], pre = [], params = 'event, context', async = true } = {},
) {
  const a = async ? 'async ' : '';
  const block = `{\n${indent(body)}\n}`;
  const head = [...imports];
  let fn;
  switch (gate) {
    case 'ExportConst':
      fn = `export const handler = ${a}(${params}) => ${block};`;
      break;
    case 'ExportsDot':
      fn = `exports.handler = ${a}(${params}) => ${block};`;
      break;
    case 'ModuleExports':
      fn = `module.exports.handler = ${a}function (${params}) ${block};`;
      break;
    case 'FnDecl':
      fn = `export ${a}function handler(${params}) ${block}`;
      break;
    case 'Renamed':
      fn = `const main = ${a}(${params}) => ${block};\nexport { main as handler };`;
      break;
    case 'Middy':
      head.unshift("import middy from '@middy/core';");
      fn = `const baseHandler = ${a}(${params}) => ${block};\nexport const handler = middy(baseHandler);`;
      break;
    case 'SdkImport':
      head.unshift("import { S3Client } from '@aws-sdk/client-s3';");
      fn = `const s3 = new S3Client({});\nexport ${a}function processOrder(event) ${block}`;
      break;
    case 'SdkRequire':
      head.unshift("const { S3Client } = require('@aws-sdk/client-s3');");
      fn = `const s3 = new S3Client({});\nexports.processOrder = ${a}function (event) ${block};`;
      break;
    case 'NoEvidence':
      fn = `const store = new Map();\nexport ${a}function processOrder(event) ${block}`;
      break;
    default:
      throw new Error(`unknown gate ${gate}`);
  }
  return [...head, ...pre, fn, ''].join('\n');
}

/** A module-level program (no handler body): gate evidence plus `lines`. */
function lambdaModule(gate, lines, { imports = [] } = {}) {
  return lambdaProgram(gate, ['return { statusCode: 200 };'], {
    imports,
    pre: lines,
  });
}

module.exports = { GATES, isLambdaGate, lambdaProgram, lambdaModule, indent };
