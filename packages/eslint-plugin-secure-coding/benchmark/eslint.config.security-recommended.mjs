// Config using ONLY the recommended preset from eslint-plugin-security
import pluginSecurity from 'eslint-plugin-security';

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
    ...pluginSecurity.configs.recommended,
  },
];
