const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 20, // 5 sinks x 4 argument shapes
  traces: 300,
  rule: 'require-url-validation',
  key: (s) => `${tag(s.sink)}|${tag(s.arg)}`,
  config: () => undefined,
  code: (s) => {
    const sink = (x) =>
      ({
        WindowLocHref: `window.location.href = ${x};`,
        LocHref: `location.href = ${x};`,
        WindowLoc: `window.location = ${x};`,
        WindowOpen: `window.open(${x}, '_blank');`,
        RouterPush: `router.push(${x});`,
      })[tag(s.sink)];
    const body = {
      Variable: `${sink('target')}`,
      Tainted: `${sink("new URLSearchParams(window.location.search).get('next')")}`,
      Literal: `${sink("'/home'")}`,
      AllowlistGuarded: `const parsed = new URL(target, window.location.origin);\n  if (ALLOWED_DOMAINS.includes(parsed.hostname)) {\n    ${sink('parsed.href')}\n  }`,
    }[tag(s.arg)];
    return `import { useRouter } from 'next/navigation';\nconst ALLOWED_DOMAINS = ['example.com', 'docs.example.com'];\nexport function navigate(target: string) {\n  const router = useRouter();\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
