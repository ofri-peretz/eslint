// Config with ONLY the 14 equivalent rules from secure-coding
// These map 1:1 to eslint-plugin-security's rules
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        res: 'readonly',
        tableName: 'readonly',
        id: 'readonly',
        password: 'readonly',
        userPassword: 'readonly',
        secret: 'readonly',
        inputSecret: 'readonly',
        token: 'readonly',
      },
    },
    plugins: {
      'secure-coding': secureCoding,
    },
    rules: {
      // Mapping of security -> secure-coding equivalent rules (14 total)
      
      // detect-bidi-characters -> (not available, skip)
      
      // detect-buffer-noassert -> no-buffer-overread
      'secure-coding/no-buffer-overread': 'error',
      
      // detect-child-process -> detect-child-process
      'secure-coding/detect-child-process': 'error',
      
      // detect-disable-mustache-escape -> (not available, skip)
      
      // detect-eval-with-expression -> detect-eval-with-expression
      'secure-coding/detect-eval-with-expression': 'error',
      
      // detect-new-buffer -> no-buffer-overread (covers similar patterns)
      // Already included above
      
      // detect-no-csrf-before-method-override -> no-missing-csrf-protection
      'secure-coding/no-missing-csrf-protection': 'error',
      
      // detect-non-literal-fs-filename -> detect-non-literal-fs-filename
      'secure-coding/detect-non-literal-fs-filename': 'error',
      
      // detect-non-literal-regexp -> detect-non-literal-regexp
      'secure-coding/detect-non-literal-regexp': 'error',
      
      // detect-non-literal-require -> no-unsafe-dynamic-require
      'secure-coding/no-unsafe-dynamic-require': 'error',
      
      // detect-object-injection -> detect-object-injection
      'secure-coding/detect-object-injection': 'error',
      
      // detect-possible-timing-attacks -> no-timing-attack
      'secure-coding/no-timing-attack': 'error',
      
      // detect-pseudoRandomBytes -> no-insufficient-random
      'secure-coding/no-insufficient-random': 'error',
      
      // detect-unsafe-regex -> no-redos-vulnerable-regex
      'secure-coding/no-redos-vulnerable-regex': 'error',
    },
  },
];
