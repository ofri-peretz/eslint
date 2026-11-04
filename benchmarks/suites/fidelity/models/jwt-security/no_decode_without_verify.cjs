const { tag } = require('../../lib.cjs');
const { SPELLINGS } = require('../../jwt.cjs');

const DECODERS = {
  ...SPELLINGS,
  JwtDecodeV3: () => ["import jwtDecode from 'jwt-decode';", 'jwtDecode'],
  JwtDecodeV4: () => ["import { jwtDecode } from 'jwt-decode';", 'jwtDecode'],
  JoseDecodeJwt: () => ["import { decodeJwt } from 'jose';", 'decodeJwt'],
};

const header = (field) => (c) =>
  `const decoded = ${c}(token, { complete: true });\nexport const v = decoded.header.${field};`;

const USES = {
  ReadSub: (c) => `export const userId = ${c}(token).sub;`,
  WholePayload: (c) => `export const payload = ${c}(token);`,
  ExpOnly: (c) =>
    `const { exp } = ${c}(token);\nexport const stale = Date.now() >= exp * 1000;`,
  BackChannel: (c) =>
    `const tokens = await (await fetch(tokenUrl, { method: 'POST', body })).json();\nexport const sub = ${c}(tokens.id_token).sub;`,
  FrontChannel: (c) =>
    `export async function POST(request: Request) {\n  const data = await request.json();\n  return ${c}(data.id_token).sub;\n}`,
  TextDecoderTwin: () => 'export const text = new TextDecoder().decode(bytes);',
  HeaderKid: header('kid'),
  HeaderAlg: header('alg'),
  HeaderJku: header('jku'),
};

module.exports = {
  rule: 'no-decode-without-verify',
  // (8 jsonwebtoken spellings x 9 uses + 3 other decoders x 6 claim uses) x 2
  domain: 180,
  traces: 1500,
  key: (s) => `${tag(s.spelling)}|${tag(s.use)}|allowHeader=${s.allowHeader}`,
  config: (s) => ({ allowHeaderInspection: s.allowHeader }),
  code: (s) => {
    const [imp, callee] = DECODERS[tag(s.spelling)]('decode');
    return [imp, USES[tag(s.use)](callee)].filter(Boolean).join('\n');
  },
};
