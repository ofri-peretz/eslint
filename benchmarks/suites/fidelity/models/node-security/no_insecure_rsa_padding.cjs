const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-insecure-rsa-padding',
  domain: 160, // 5 fns x 4 access shapes x 8 paddings
  traces: 2000,
  key: (s) => `${tag(s.fn)}|${tag(s.access)}|${tag(s.padding)}`,
  config: () => ({}),
  code: (s) => {
    const f = {
      PrivateDecrypt: 'privateDecrypt',
      PublicDecrypt: 'publicDecrypt',
      PrivateEncrypt: 'privateEncrypt',
      PublicEncrypt: 'publicEncrypt',
      Sign: 'sign',
    }[tag(s.fn)];
    const pad = {
      CryptoConstants: 'padding: crypto.constants.RSA_PKCS1_PADDING, ',
      DestructuredConstants: 'padding: constants.RSA_PKCS1_PADDING, ',
      ConstantsSubscript: "padding: crypto.constants['RSA_PKCS1_PADDING'], ",
      NumericOne: 'padding: 1, ',
      ConstBound: 'padding: PAD, ',
      Oaep: "padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256', ",
      Pss: 'padding: crypto.constants.RSA_PKCS1_PSS_PADDING, ',
      Omitted: '',
    }[tag(s.padding)];
    const imports =
      "import crypto, { constants } from 'crypto';\nconst PAD = crypto.constants.RSA_PKCS1_PADDING;";
    const call = (fnExpr) =>
      f === 'sign'
        ? `${fnExpr}('sha256', data, { key: k, ${pad}})`
        : `${fnExpr}({ key: k, ${pad}}, data)`;
    return {
      Member: `${imports}\nconst out = ${call(`crypto.${f}`)};`,
      NamedImport: `${imports}\nimport { ${f} } from 'node:crypto';\nconst out = ${call(f)};`,
      RequireNode: `${imports}\nconst nodeCrypto = require('node:crypto');\nconst out = ${call(`nodeCrypto.${f}`)};`,
      OptionsConst:
        f === 'sign'
          ? `${imports}\nconst opts = { key: k, ${pad}};\nconst out = crypto.sign('sha256', data, opts);`
          : `${imports}\nconst opts = { key: k, ${pad}};\nconst out = crypto.${f}(opts, data);`,
    }[tag(s.access)];
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
