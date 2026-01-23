const fs = require('fs');
const path = require('path');

const packagesDir = path.resolve(process.cwd(), 'packages');
const readmeFiles = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-pg',
  'eslint-plugin-crypto',
  'eslint-plugin-jwt',
  'eslint-plugin-browser-security',
  'eslint-plugin-express-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-import-next',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-vercel-ai-security'
].map(p => path.join(packagesDir, p, 'README.md'));

const BT = '`';
const relatedPluginsTable = `
| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [${BT}eslint-plugin-secure-coding${BT}](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [${BT}eslint-plugin-pg${BT}](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [${BT}eslint-plugin-crypto${BT}](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [${BT}eslint-plugin-jwt${BT}](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [${BT}eslint-plugin-browser-security${BT}](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [${BT}eslint-plugin-express-security${BT}](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [${BT}eslint-plugin-lambda-security${BT}](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [${BT}eslint-plugin-nestjs-security${BT}](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [${BT}eslint-plugin-mongodb-security${BT}](https://www.npmjs.com/package/eslint-plugin-mongodb-security)     |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)    | MongoDB security best practices.           |
| [${BT}eslint-plugin-vercel-ai-security${BT}](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening.           |
| [${BT}eslint-plugin-import-next${BT}](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |
`;

for (const readmePath of readmeFiles) {
  if (!fs.existsSync(readmePath)) continue;
  
  let content = fs.readFileSync(readmePath, 'utf8');
  const startMarker = '## 🔗 Related ESLint Plugins';
  const endMarker = '## 📄 License';
  
  if (content.includes(startMarker) && content.includes(endMarker)) {
    const startIndex = content.indexOf(startMarker) + startMarker.length;
    const endIndex = content.indexOf(endMarker);
    
    // Find internal markers for ecosystems if they exist
    const ecosystemMarker = 'Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:';
    
    const newSection = `\n\n${ecosystemMarker}\n${relatedPluginsTable}\n`;
    
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    fs.writeFileSync(readmePath, before + newSection + after);
    console.log(`Updated ${readmePath}`);
  }
}
