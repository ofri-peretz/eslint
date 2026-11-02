const { tag } = require('../../lib.cjs');

const PARAM = {
  Password: 'password',
  UpperPassword: 'PASSWORD',
  Token: 'token',
  Secret: 'secret',
  ApiKey: 'apikey',
  ApiKeyCamel: 'apiKey',
  ApiKeySnake: 'api_key',
  AccessToken: 'access_token',
  ClientSecret: 'client_secret',
  Pwd: 'pwd',
  PageToken: 'pageToken',
  Page: 'page',
  PathWordOnly: 'page',
};

module.exports = {
  domain: 520, // 13 keys x 2 placements x 2 forms x 5 positions x 2 option values
  traces: 6000,
  rule: 'no-credentials-in-query-params',
  key: (s) =>
    `${tag(s.key)}|${tag(s.placement)}|${tag(s.form)}|${tag(s.pos)}|custom=${s.customBody}`,
  config: (s) =>
    s.customBody
      ? { bodyProperties: ['body', 'data', 'form', 'formData', 'payload'] }
      : undefined,
  code: (s) => {
    const k = tag(s.key);
    const path = k === 'PathWordOnly' ? '/api/password/change' : '/api/login';
    const val = tag(s.form) === 'Tpl' ? '${v}' : 'abc123';
    const pair = `${PARAM[k]}=${val}`;
    const url =
      tag(s.placement) === 'First'
        ? `${path}?${pair}&lang=en`
        : `${path}?lang=en&${pair}`;
    const lit = tag(s.form) === 'Tpl' ? `\`${url}\`` : `'${url}'`;
    const body = {
      FetchArg: `fetch(${lit});`,
      VarInit: `const url = ${lit};`,
      BodyProp: `fetch('/api', { method: 'POST', body: ${lit} });`,
      DataProp: `axios({ url: '/api', method: 'post', data: ${lit} });`,
      PayloadProp: `client.send({ payload: ${lit} });`,
    }[tag(s.pos)];
    return `declare const v: string;\ndeclare const axios: any;\ndeclare const client: any;\n${body}\n`;
  },
  model: (s) => s.verdict,
};
