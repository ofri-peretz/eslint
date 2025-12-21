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
    "client.query('COPY users FROM STDIN')", // Safe client-side copy
    "client.query('COPY ' + 'users ' + 'FROM ' + 'STDIN')", // Safe binary
    "client.query('SELECT ' + '1')", // Binary no COPY
    // Ignored cases (coverage)
    "client.other('COPY FROM')",
    "otherFunc('COPY FROM')",
    // Line 43: empty args
    "client.query()",
    // Template literal safe (STDIN)
    "client.query(`COPY users FROM STDIN`)",
    // Line 73: Binary expression with non-literal (variable in concat) - else branch
    "client.query('SELECT ' + someVar)",
    // Line 73: CallExpression argument (neither Template nor Binary, falls through)
    "client.query(getSqlQuery())",
  ],
  invalid: [
    {
      code: "client.query(\"COPY users FROM '/etc/passwd'\")",
      errors: [{ messageId: 'noUnsafeCopyFrom' }],
    },
    {
      code: "client.query(`COPY ${table} FROM '${path}'`)",
      errors: [{ messageId: 'noUnsafeCopyFrom' }],
    },
    {
      code: "client.query('COPY ' + table + ' FROM ' + path)",
      errors: [{ messageId: 'noUnsafeCopyFrom' }],
    },
  ],
});
