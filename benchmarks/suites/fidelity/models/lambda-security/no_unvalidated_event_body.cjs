const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const PROP = {
  Body: 'event.body',
  Query: 'event.queryStringParameters',
  PathParams: 'event.pathParameters',
  Headers: 'event.headers',
  MultiQuery: 'event.multiValueQueryStringParameters',
  RawQuery: 'event.rawQueryString',
  RequestId: 'event.requestContext',
  Detail: 'event.detail',
};
const USE = {
  Direct: (x) => [`const item = await db.find(${x});`],
  ZodParse: (x) => [
    `const input = schema.parse(${x});`,
    'const item = await db.find(input);',
  ],
  ZodSafeParse: (x) => [
    `const result = schema.safeParse(${x});`,
    "if (!result.success) return { statusCode: 400, body: 'bad request' };",
  ],
  JoiValidate: (x) => [`const { value, error } = joiSchema.validate(${x});`],
  CustomCheck: (x) => [`const input = check(${x});`],
  Logged: (x) => [`console.log('request', ${x});`],
  TypeofGuard: (x) => [
    `if (typeof ${x} !== 'object') return { statusCode: 400, body: 'bad request' };`,
  ],
  MiddyValidator: (x) => [`const item = await db.find(${x});`],
  MiddyValidatorRenamed: (x) => [`const item = await db.find(${x});`],
};
// The middy cases wrap the generated handler itself, under the imported name.
const MIDDY = {
  MiddyValidator: "import validator from '@middy/validator';",
  MiddyValidatorRenamed: "import validateEvent from '@middy/validator';",
};
const MIDDY_USE = {
  MiddyValidator: 'validator',
  MiddyValidatorRenamed: 'validateEvent',
};

const base = {
  rule: 'no-unvalidated-event-body',
  // Props 8 x 2 additionalProperties; Uses 9 x 2 validationMethodNames; Gates 9.
  domain: 16 + 18 + 9,
  traces: 1000,
  key: (s) =>
    ['focus', 'prop', 'extra', 'use', 'customNames', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (s.extra) o.additionalProperties = ['detail'];
    if (s.customNames) o.validationMethodNames = ['check'];
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const use = tag(s.use);
    const prop = tag(s.prop);
    const x =
      prop === 'RequestId' ? 'event.requestContext.requestId' : PROP[prop];
    const middy = MIDDY[use];
    const program = lambdaProgram(
      middy ? 'Middy' : tag(s.gate),
      [...USE[use](x), "return { statusCode: 200, body: 'ok' };"],
      {
        imports: [
          "import { db, schema, joiSchema, check, eventSchema } from './deps';",
          ...(middy ? [middy] : []),
        ],
      },
    );
    return middy
      ? program.replace(
          'middy(baseHandler);',
          `middy(baseHandler).use(${MIDDY_USE[use]}({ eventSchema }));`,
        )
      : program;
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
