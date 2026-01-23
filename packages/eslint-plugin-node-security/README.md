# eslint-plugin-node-security

Security-focused ESLint plugin for Node.js built-in modules (fs, child_process, vm, path, Buffer). Detects command injection, path traversal, code execution vulnerabilities with AI-parseable error messages.

Part of the [Interlace ESLint Ecosystem](https://github.com/ofri-peretz/eslint).

## Features

- **LLM-Optimized**: Error messages are designed to be easily parsed and resolved by AI assistants (Cursor, GitHub Copilot, etc.).
- **OWASP Coverage**: Implements rules for OWASP Top 10 and OWASP Mobile Top 10.
- **Node.js Core Security**: Specific focus on built-in modules which are most susceptible to critical vulnerabilities.
- **Strict Interface**: Verified with high-fidelity unit tests.

## Installation

```bash
pnpm add -D eslint-plugin-node-security
```

## Usage (Flat Config)

```javascript
import nodeSecurity from 'eslint-plugin-node-security';

export default [
  nodeSecurity.configs.recommended,
  {
    rules: {
      'node-security/detect-child-process': 'error',
    },
  },
];
```

## Rules

| Rule                                                                               | Description                                | CWE     |
| :--------------------------------------------------------------------------------- | :----------------------------------------- | :------ |
| [`detect-child-process`](./docs/rules/detect-child-process.md)                     | Detects dangerous child_process.exec calls | CWE-78  |
| [`detect-eval-with-expression`](./docs/rules/detect-eval-with-expression.md)       | Detects eval() with dynamic expressions    | CWE-95  |
| [`detect-non-literal-fs-filename`](./docs/rules/detect-non-literal-fs-filename.md) | Detects user-controlled file paths         | CWE-22  |
| [`no-unsafe-dynamic-require`](./docs/rules/no-unsafe-dynamic-require.md)           | Prevents arbitrary module loading          | CWE-706 |
| [`no-buffer-overread`](./docs/rules/no-buffer-overread.md)                         | Detects buffer access beyond bounds        | CWE-126 |
| [`no-toctou-vulnerability`](./docs/rules/no-toctou-vulnerability.md)               | Detects Race Conditions in file ops        | CWE-367 |
| [`no-zip-slip`](./docs/rules/no-zip-slip.md)                                       | Prevents Zip Slip directory traversal      | CWE-22  |
| [`no-arbitrary-file-access`](./docs/rules/no-arbitrary-file-access.md)             | Prevents arbitrary file read/write         | CWE-22  |

## License

MIT © [Ofri Peretz](https://ofriperetz.dev)
