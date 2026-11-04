const { tag } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const PEM_PUBLIC =
  "'-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\\n-----END PUBLIC KEY-----'";
const PEM_CERT =
  "'-----BEGIN CERTIFICATE-----\\nMIIDdzCCAl+gAwIBAgIEAgAAuTANBgkq\\n-----END CERTIFICATE-----'";

// [preamble lines, key expression]
const KEYS = {
  CreatePublicKey: [
    "import { createPublicKey } from 'node:crypto';",
    'const verifyKey = createPublicKey(pem);',
    'verifyKey',
  ],
  X509Cert: [
    "import { X509Certificate } from 'node:crypto';",
    'const cert = new X509Certificate(pem);',
    'cert.publicKey',
  ],
  PemPublicConst: [`const IDP_KEY = ${PEM_PUBLIC};`, 'IDP_KEY'],
  PemCertInline: [PEM_CERT],
  PubFile: [
    "import { readFileSync } from 'node:fs';",
    "readFileSync('/keys/jwt.pub')",
  ],
  CrtFile: [
    "import { readFileSync } from 'node:fs';",
    "readFileSync('/keys/idp.crt')",
  ],
  PemFile: [
    "import { readFileSync } from 'node:fs';",
    "readFileSync('/keys/public.pem')",
  ],
  JwksKey: [
    "import jwksClient from 'jwks-rsa';",
    'const signingKey = await jwksClient({ jwksUri }).getSigningKey(kid);',
    'signingKey.getPublicKey()',
  ],
  EnvSecret: ['process.env.JWT_SECRET'],
  PublicNamedSecret: ['process.env.PUBLIC_WIDGET_HMAC_SECRET'],
  NamedPublicKey: ['publicKey'],
};

const ALGS = {
  Hs256: "['HS256']",
  Hs384: "['HS384']",
  Rs256: "['RS256']",
  MixedRsHs256: "['RS256', 'HS256']",
  MixedRsHs384: "['RS256', 'HS384']",
};

module.exports = {
  rule: 'no-algorithm-confusion',
  domain: 660, // 6 spellings x 11 keys x 5 whitelists x 2 symmetricAlgorithms
  traces: 5000,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.key)}|${tag(s.algs)}|narrow=${s.narrowSym}`,
  config: (s) => (s.narrowSym ? { symmetricAlgorithms: ['HS256'] } : {}),
  code: (s) => {
    const [imp, callee] = spell(tag(s.spelling), 'verify');
    const k = KEYS[tag(s.key)];
    const keyExpr = k[k.length - 1];
    return [
      imp,
      ...k.slice(0, -1),
      `export const r = ${callee}(token, ${keyExpr}, { algorithms: ${ALGS[tag(s.algs)]} });`,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
