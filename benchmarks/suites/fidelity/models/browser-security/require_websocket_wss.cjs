const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 144,
  traces: 1500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'require-websocket-wss',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.url)}|${tag(s.callee)}|allowLocal=${s.allowLocal}|${tag(s.ctx)}`,
  config: (s) => ({
    allowLocalhost: s.allowLocal,
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const url = {
      WsRemote: "'ws://api.example.com/socket'",
      WssRemote: "'wss://api.example.com/socket'",
      WsLocalhost: "'ws://localhost:3000'",
      WsLoopback: "'ws://127.0.0.1:8080'",
      WsTemplate: '`ws://api.example.com/user/${userId}`',
      WssTemplate: '`wss://api.example.com/user/${userId}`',
      UpperWs: "'WS://API.EXAMPLE.COM/socket'",
      LocalhostLookalike: "'ws://localhost.evil.com/socket'",
    }[tag(s.url)];
    const ctor = {
      NewWS: 'WebSocket',
      NewWindowWS: 'window.WebSocket',
      OtherCtor: 'Foo',
    }[tag(s.callee)];
    return [
      'declare const userId: string;',
      'declare class Foo { constructor(u: string); }',
      `export const ws = new ${ctor}(${url});`,
    ].join('\n');
  },
  model: (s) => s.verdict,
};
