const { tag } = require('../../lib.cjs');

// [key, insecure value, secure value]
const P = {
  NodeIntegration: ['nodeIntegration', 'true', 'false'],
  ContextIsolation: ['contextIsolation', 'false', 'true'],
  WebSecurity: ['webSecurity', 'false', 'true'],
  Sandbox: ['sandbox', 'false', 'true'],
  AllowInsecureContent: ['allowRunningInsecureContent', 'true', 'false'],
};

module.exports = {
  domain: 30,
  traces: 300,
  rule: 'no-electron-security-issues',
  key: (s) => `${tag(s.prop)}|insecure=${s.insecure}|${tag(s.ctor)}`,
  config: () => ({}),
  code: (s) => {
    const [k, bad, good] = P[tag(s.prop)];
    const opts = `{ webPreferences: { ${k}: ${s.insecure ? bad : good} } }`;
    const [head, expr] = {
      BrowserWindowImport: [
        "import { BrowserWindow } from 'electron';",
        `new BrowserWindow(${opts})`,
      ],
      ElectronRequire: [
        "const electron = require('electron');",
        `new electron.BrowserWindow(${opts})`,
      ],
      BrowserViewImport: [
        "import { BrowserView } from 'electron';",
        `new BrowserView(${opts})`,
      ],
    }[tag(s.ctor)];
    return `${head}\nexport function open() {\n  return ${expr};\n}\n`;
  },
};
