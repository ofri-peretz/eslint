const { tag } = require('../../lib.cjs');

const URLS = {
  Http: "'http://api.example.com/users'",
  Https: "'https://api.example.com/users'",
  HttpUpper: "'HTTP://api.example.com/users'",
  HttpTplStatic: '`http://api.example.com/users`',
  HttpsTplStatic: '`https://api.example.com/users`',
};

module.exports = {
  domain: 55, // 11 calls x 5 urls
  traces: 900,
  rule: 'require-https-only',
  key: (s) => `${tag(s.call)}|${tag(s.url)}`,
  config: () => undefined,
  code: (s) => {
    const u = URLS[tag(s.url)];
    const stmt = {
      Fetch: `fetch(${u});`,
      WindowFetch: `window.fetch(${u});`,
      AxiosGet: `axios.get(${u});`,
      AxiosPost: `axios.post(${u}, { name: 'x' });`,
      AxiosPut: `axios.put(${u}, { name: 'x' });`,
      AxiosDelete: `axios.delete(${u});`,
      AxiosPatch: `axios.patch(${u}, { name: 'x' });`,
      AxiosHead: `axios.head(${u});`,
      AxiosOptions: `axios.options(${u});`,
      AxiosComputedGet: `axios['get'](${u});`,
      OtherGet: `cache.get(${u});`,
    }[tag(s.call)];
    return `import axios from 'axios';\ndeclare const cache: any;\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};
