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
      // All secure-coding rules at 'error' level for benchmark
      ...secureCoding.configs.strict.rules,
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        require: 'readonly',
        console: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      'secure-coding': secureCoding,
    },
    rules: {
      ...secureCoding.configs.strict.rules,
    },
  },
];
