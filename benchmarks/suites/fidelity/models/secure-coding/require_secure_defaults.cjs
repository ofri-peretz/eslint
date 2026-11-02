const { tag } = require('../../lib.cjs');

const NAME = {
  StrictSSL: 'strictSSL',
  HttpOnly: 'httpOnly',
  RequireTLS: 'requireTLS',
  SslValidate: 'sslValidate',
  TlsAllowInvalidCerts: 'tlsAllowInvalidCertificates',
  IgnoreHttpsErrors: 'ignoreHTTPSErrors',
  SecureInCookie: 'secure',
  SecureAlone: 'secure',
  Timeout: 'timeout',
};

module.exports = {
  domain: 54,
  traces: 500,
  rule: 'require-secure-defaults',
  key: (s) => `${tag(s.key)}|${tag(s.value)}|${tag(s.spelling)}`,
  config: () => ({}),
  code: (s) => {
    const name = NAME[tag(s.key)];
    const k = tag(s.spelling) === 'StringKey' ? `'${name}'` : name;
    const v = {
      True: 'true',
      False: 'false',
      NonLiteral: 'isDev ? false : true',
    }[tag(s.value)];
    const obj =
      {
        SecureInCookie: `{ cookie: { ${k}: ${v}, sameSite: 'lax', maxAge: 3600 } }`,
        SecureAlone: `{ ${k}: ${v}, port: 443 }`,
      }[tag(s.key)] ?? `{ ${k}: ${v}, retries: 3 }`;
    return `declare const isDev: boolean;\nexport const options = ${obj};\n`;
  },
};
