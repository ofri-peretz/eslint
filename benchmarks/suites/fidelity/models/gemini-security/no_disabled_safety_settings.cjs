const { tag } = require('../../lib.cjs');

/** Gate tag -> { head, decl, T }: `T` spells the HarmBlockThreshold enum. */
const GATES = {
  Named: {
    head: "import { GoogleGenAI, HarmBlockThreshold } from '@google/genai';",
    decl: 'const ai = new GoogleGenAI({});',
    T: 'HarmBlockThreshold',
  },
  Namespace: {
    head: "import * as genai from '@google/genai';",
    decl: 'const ai = new genai.GoogleGenAI({});',
    T: 'genai.HarmBlockThreshold',
  },
  Renamed: {
    head: "import { GoogleGenAI, HarmBlockThreshold as Threshold } from '@google/genai';",
    decl: 'const ai = new GoogleGenAI({});',
    T: 'Threshold',
  },
  Require: {
    head: "const { GoogleGenAI, HarmBlockThreshold } = require('@google/genai');",
    decl: 'const ai = new GoogleGenAI({});',
    T: 'HarmBlockThreshold',
  },
  Legacy: {
    head: "import { GoogleGenerativeAI, HarmBlockThreshold } from '@google/generative-ai';",
    decl: 'const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);',
    T: 'HarmBlockThreshold',
  },
  NoImport: {
    head: "import { HarmBlockThreshold } from './thresholds';",
    decl: '',
    T: 'HarmBlockThreshold',
  },
};

/** Value tag -> (T) => { pre?, expr }. */
const VALUES = {
  StrBlockNone: () => ({ expr: "'BLOCK_NONE'" }),
  StrOff: () => ({ expr: "'OFF'" }),
  EnumBlockNone: (T) => ({ expr: `${T}.BLOCK_NONE` }),
  EnumOff: (T) => ({ expr: `${T}.OFF` }),
  BracketEnum: (T) => ({ expr: `${T}['BLOCK_NONE']` }),
  ConstStr: () => ({
    pre: "const NO_FILTER = 'BLOCK_NONE';",
    expr: 'NO_FILTER',
  }),
  ConstEnum: (T) => ({
    pre: `const NO_FILTER = ${T}.BLOCK_NONE;`,
    expr: 'NO_FILTER',
  }),
  LookalikeOff: () => ({
    pre: "const Level = { OFF: 'OFF', ON: 'ON' } as const;",
    expr: 'Level.OFF',
  }),
  StrMedium: () => ({ expr: "'BLOCK_MEDIUM_AND_ABOVE'" }),
  EnumOnlyHigh: (T) => ({ expr: `${T}.BLOCK_ONLY_HIGH` }),
  StrLowAbove: () => ({ expr: "'BLOCK_LOW_AND_ABOVE'" }),
  StrUnspecified: () => ({ expr: "'HARM_BLOCK_THRESHOLD_UNSPECIFIED'" }),
};

const CATEGORY = "category: 'HARM_CATEGORY_HARASSMENT'";

/** Shape tag -> (v, gate) => statements using threshold `v`. */
const SHAPES = {
  InConfig: (v) =>
    `export const config = { safetySettings: [{ ${CATEGORY}, threshold: ${v} }] };`,
  CategoryOnly: (v) =>
    `export const harassment = { ${CATEGORY}, threshold: ${v} };`,
  ArrayNoCategory: (v) =>
    `export const config = { safetySettings: [{ threshold: ${v} }] };`,
  InRequest: (v, gate) =>
    gate === 'Legacy'
      ? `export const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: [{ ${CATEGORY}, threshold: ${v} }] });`
      : `export const reply = ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hi', config: { safetySettings: [{ ${CATEGORY}, threshold: ${v} }] } });`,
  // A circuit breaker, not a SafetySetting.
  Lone: (v) =>
    `export const breaker = { threshold: ${v}, resetAfterMs: 30000 };`,
};

function code(s) {
  const gateTag = tag(s.gate);
  const gate = GATES[gateTag];
  const value = VALUES[tag(s.value)](gate.T);
  const shapeTag = tag(s.shape);
  // With no SDK client in the file, the request shape has nothing to call.
  const decl =
    shapeTag === 'InRequest' && gateTag === 'NoImport'
      ? 'declare const ai: any;'
      : gate.decl;
  return (
    [gate.head, value.pre, decl, SHAPES[shapeTag](value.expr, gateTag)]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = {
  rule: 'no-disabled-safety-settings',
  // 12 values x 2 shapes + 5 shapes x 3 values + 6 gates x 3 values x 2 shapes
  domain: 12 * 2 + 5 * 3 + 6 * 3 * 2,
  traces: 700,
  key: (s) => `${tag(s.part)}|${tag(s.value)}|${tag(s.shape)}|${tag(s.gate)}`,
  code,
};
