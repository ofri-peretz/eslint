import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeCopyFrom } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-unsafe-copy-from', noUnsafeCopyFrom, {
  valid: [
    // ===========================================
    // STDIN patterns (always safe)
    // ===========================================
    {
      name: 'COPY FROM STDIN - literal string',
      code: "client.query('COPY users FROM STDIN')",
    },
    {
      name: 'COPY FROM STDIN - template literal',
      code: 'client.query(`COPY users FROM STDIN`)',
    },
    {
      name: 'COPY FROM STDIN - with CSV format',
      code: "client.query('COPY users FROM STDIN CSV')",
    },
    {
      name: 'COPY FROM STDIN - with options',
      code: "client.query('COPY users (id, name) FROM STDIN WITH (FORMAT CSV, HEADER)')",
    },
    {
      name: 'COPY FROM STDIN - binary expression all literals',
      code: "client.query('COPY ' + 'users ' + 'FROM ' + 'STDIN')",
    },
    {
      name: 'COPY FROM STDIN - case insensitive',
      code: "client.query('copy users from stdin')",
    },

    // ===========================================
    // Non-COPY queries (should not flag)
    // ===========================================
    {
      name: 'SELECT query - not COPY',
      code: "client.query('SELECT * FROM users')",
    },
    {
      name: 'INSERT query - not COPY',
      code: "client.query('INSERT INTO users VALUES ($1)', [name])",
    },
    {
      name: 'UPDATE query - not COPY',
      code: "client.query('UPDATE users SET name = $1', [name])",
    },
    {
      name: 'DELETE query - not COPY',
      code: "client.query('DELETE FROM users WHERE id = $1', [id])",
    },
    {
      name: 'Binary expression no COPY',
      code: "client.query('SELECT ' + someVar)",
    },

    // ===========================================
    // Non-query method calls (should not flag)
    // ===========================================
    {
      name: 'Different method name',
      code: "client.execute('COPY users FROM /etc/passwd')",
    },
    {
      name: 'Different object method',
      code: "client.other('COPY users FROM /etc/passwd')",
    },
    {
      name: 'Function call not member expression',
      code: "query('COPY users FROM /etc/passwd')",
    },

    // ===========================================
    // Edge cases - empty/unusual args
    // ===========================================
    {
      name: 'Empty query arguments',
      code: 'client.query()',
    },
    {
      name: 'Query with function call argument (cannot verify)',
      code: 'client.query(getSqlQuery())',
    },
    {
      name: 'Query with identifier argument (cannot verify)',
      code: 'client.query(sqlQuery)',
    },

    // ===========================================
    // allowHardcodedPaths option enabled
    // ===========================================
    {
      name: 'Hardcoded path allowed by option',
      code: "client.query(\"COPY users FROM '/var/data/users.csv'\")",
      options: [{ allowHardcodedPaths: true }],
    },
    {
      name: 'Hardcoded path in template literal allowed',
      code: "client.query(`COPY users FROM '/var/data/users.csv'`)",
      options: [{ allowHardcodedPaths: true }],
    },

    // ===========================================
    // allowedPaths option (regex patterns)
    // ===========================================
    {
      name: 'Path matches allowed pattern',
      code: "client.query(\"COPY users FROM '/var/imports/users.csv'\")",
      options: [{ allowedPaths: ['^/var/imports/'] }],
    },
    {
      name: 'Path matches allowed pattern with extension',
      code: "client.query(\"COPY users FROM '/backup/data.csv'\")",
      options: [{ allowedPaths: ['\\.csv$'] }],
    },
    {
      name: 'Path matches one of multiple allowed patterns',
      code: "client.query(\"COPY users FROM '/tmp/import.csv'\")",
      options: [{ allowedPaths: ['^/var/', '^/tmp/'] }],
    },

    // ===========================================
    // COPY TO (not FROM - different vulnerability)
    // Note: We only detect COPY FROM, not COPY TO
    // ===========================================
    {
      name: 'COPY TO is not flagged (different rule)',
      code: "client.query(\"COPY users TO '/tmp/export.csv'\")",
    },
  ],

  invalid: [
    // ===========================================
    // Dynamic paths - CRITICAL (injection risk)
    // ===========================================
    {
      name: 'Template literal with variable in path',
      code: "client.query(`COPY users FROM '${filepath}'`)",
      errors: [{ messageId: 'dynamicPath' }],
    },
    {
      name: 'Template literal with expression in table name',
      code: "client.query(`COPY ${table} FROM '/etc/passwd'`)",
      errors: [{ messageId: 'dynamicPath' }],
    },
    {
      name: 'Template literal with req.body',
      code: "client.query(`COPY users FROM '${req.body.path}'`)",
      errors: [{ messageId: 'dynamicPath' }],
    },
    {
      name: 'Binary expression with variable path',
      code: "client.query('COPY users FROM ' + userPath)",
      errors: [{ messageId: 'dynamicPath' }],
    },
    {
      name: 'Binary expression with variable in middle',
      code: "client.query('COPY ' + table + \" FROM '/data/file.csv'\")",
      errors: [{ messageId: 'dynamicPath' }],
    },
    {
      name: 'Complex binary expression with variable',
      code: "client.query('COPY ' + 'users' + ' FROM ' + \"'\" + filepath + \"'\")",
      errors: [{ messageId: 'dynamicPath' }],
    },

    // ===========================================
    // Hardcoded paths - MEDIUM (server-side file access)
    // ===========================================
    {
      name: 'Literal path to sensitive file',
      code: "client.query(\"COPY users FROM '/etc/passwd'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Literal path to data file',
      code: "client.query(\"COPY users FROM '/var/data/users.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Template literal no expressions (hardcoded)',
      code: "client.query(`COPY users FROM '/tmp/data.csv'`)",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Binary expression all literals (hardcoded)',
      code: "client.query('COPY users FROM ' + \"'/data/file.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Single quotes in path',
      code: "client.query(\"COPY users FROM '/path/to/file'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Double quotes in SQL',
      code: 'client.query(\'COPY users FROM "/path/to/file"\')',
      errors: [{ messageId: 'hardcodedPath' }],
    },

    // ===========================================
    // Case variations
    // ===========================================
    {
      name: 'Uppercase COPY FROM',
      code: "client.query(\"COPY users FROM '/tmp/data.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Lowercase copy from',
      code: "client.query(\"copy users from '/tmp/data.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Mixed case Copy From',
      code: "client.query(\"Copy users From '/tmp/data.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },

    // ===========================================
    // With additional SQL syntax
    // ===========================================
    {
      name: 'COPY with column list',
      code: "client.query(\"COPY users (id, name, email) FROM '/tmp/data.csv'\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'COPY with CSV option',
      code: "client.query(\"COPY users FROM '/tmp/data.csv' CSV\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'COPY with WITH clause',
      code: "client.query(\"COPY users FROM '/tmp/data.csv' WITH (FORMAT CSV, HEADER)\")",
      errors: [{ messageId: 'hardcodedPath' }],
    },

    // ===========================================
    // Dynamic path even with allowHardcodedPaths
    // (Dynamic should ALWAYS be flagged as CRITICAL)
    // ===========================================
    {
      name: 'Dynamic path still flagged even with allowHardcodedPaths',
      code: "client.query(`COPY users FROM '${userPath}'`)",
      options: [{ allowHardcodedPaths: true }],
      errors: [{ messageId: 'dynamicPath' }],
    },

    // ===========================================
    // Path not in allowedPaths
    // ===========================================
    {
      name: 'Path does not match allowed pattern',
      code: "client.query(\"COPY users FROM '/etc/passwd'\")",
      options: [{ allowedPaths: ['^/var/imports/'] }],
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      name: 'Path does not match any allowed pattern',
      code: "client.query(\"COPY users FROM '/home/user/data.csv'\")",
      options: [{ allowedPaths: ['^/var/', '^/tmp/'] }],
      errors: [{ messageId: 'hardcodedPath' }],
    },
  ],
});
