const { tag } = require('../../lib.cjs');

const URLS = {
  Ws: "'ws://api.example.com/updates'",
  Wss: "'wss://api.example.com/updates'",
  WsUpper: "'WS://api.example.com/updates'",
  WsTpl: '`ws://${host}/updates`',
  WssTpl: '`wss://${host}/updates`',
  DynProto: '`${protocol}//${host}/updates`',
};

module.exports = {
  domain: 24, // 6 schemes x 4 positions
  traces: 400,
  rule: 'no-insecure-websocket',
  key: (s) => `${tag(s.scheme)}|${tag(s.pos)}`,
  config: () => undefined,
  code: (s) => {
    const u = URLS[tag(s.scheme)];
    const stmt = {
      NewWebSocket: `const socket = new WebSocket(${u});`,
      VarInit: `const socketUrl = ${u};`,
      CallArg: `const socket = io(${u});`,
      ObjProp: `const cfg = { url: ${u} };`,
    }[tag(s.pos)];
    return `declare const host: string;\ndeclare const io: any;\nconst protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};
