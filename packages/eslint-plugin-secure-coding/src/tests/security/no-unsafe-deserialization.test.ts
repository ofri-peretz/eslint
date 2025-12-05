/**
 * Comprehensive tests for no-unsafe-deserialization rule
 * Security: CWE-502 (Unsafe Deserialization)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDeserialization } from '../../rules/security/no-unsafe-deserialization';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-deserialization', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe deserialization', noUnsafeDeserialization, {
      valid: [
        // Safe JSON parsing
        {
          code: 'const data = JSON.parse(input);',
        },
        // Safe YAML parsing
        {
          code: 'const yaml = require("js-yaml"); const data = yaml.safeLoad(input);',
        },
        // Safe libraries
        {
          code: 'const data = safeJsonParse(input);',
        },
        // Non-deserialization operations
        {
          code: 'const result = calculate(input);',
        },
        // Validated input
        {
          code: 'const cleanData = validateInput(req.body); const obj = JSON.parse(cleanData);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dangerous eval() Usage', () => {
    ruleTester.run('invalid - dangerous eval usage', noUnsafeDeserialization, {
      valid: [],
      invalid: [
      ],
    });
  });

  describe('Invalid Code - Function Constructor', () => {
    ruleTester.run('invalid - dangerous Function constructor', noUnsafeDeserialization, {
      valid: [],
      invalid: [
      ],
    });
  });

  describe('Invalid Code - Unsafe YAML Parsing', () => {
    ruleTester.run('invalid - unsafe YAML parsing', noUnsafeDeserialization, {
      valid: [],
      invalid: [
      ],
    });
  });

  describe('Invalid Code - Dangerous Libraries', () => {
    ruleTester.run('invalid - dangerous deserialization libraries', noUnsafeDeserialization, {
      valid: [],
      invalid: [
      ],
    });
  });

  describe('Invalid Code - Untrusted Input', () => {
    ruleTester.run('invalid - untrusted deserialization input', noUnsafeDeserialization, {
      valid: [],
      invalid: [
        {
          code: 'const yaml = require("js-yaml"); const obj = yaml.safeLoad(req.query.data);',
          errors: [
            {
              messageId: 'untrustedDeserializationInput',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noUnsafeDeserialization, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            function test() {
              const obj = eval(userInput);
            }
          `,
        },
        // Validated inputs
        {
          code: `
            const cleanInput = validateInput(req.body);
            const data = JSON.parse(cleanInput);
          `,
        },
        // Sanitized inputs
        {
          code: `
            const safeData = sanitizeInput(req.body.data);
            const yaml = require("js-yaml");
            const obj = yaml.safeLoad(safeData);
          `,
          options: [{ validationFunctions: ['sanitizeInput'] }],
        },
        // Internal/trusted data
        {
          code: 'const config = JSON.parse(fs.readFileSync("config.json", "utf8"));',
        },
        // Safe eval usage (though still generally discouraged)
        {
          code: `
            const safeCode = "console.log('hello')";
            eval(safeCode);
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom dangerous functions', noUnsafeDeserialization, {
      valid: [
        {
          code: 'const data = customDeserialize(value);',
          options: [{ dangerousFunctions: ['customDeserialize'] }],
        },
      ],
      invalid: [
        {
          code: 'const data = customDeserialize(req.body);',
          options: [{ dangerousFunctions: ['customDeserialize'] }],
          errors: [
            {
              messageId: 'unsafeDeserialization',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - custom validation functions', noUnsafeDeserialization, {
      valid: [
        {
          code: 'const clean = myValidator(req.body); const data = JSON.parse(clean);',
          options: [{ validationFunctions: ['myValidator'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex Deserialization Attack Scenarios', () => {
    ruleTester.run('complex - real-world deserialization patterns', noUnsafeDeserialization, {
      valid: [],
      invalid: [
        {
          code: `
            // Node-serialize vulnerability
            const serialize = require('node-serialize');
            const app = express();

            app.post('/deserialize', (req, res) => {
              // DANGEROUS: Unserializing user input
              const userData = req.body.data;
              const obj = serialize.unserialize(userData);
              res.json(obj);
            });
          `,
          errors: [
            {
              messageId: 'unsafeDeserialization',
            },
          ],
        },
        {
          code: `
            // YAML code execution vulnerability
            const yaml = require('js-yaml');

            function parseYamlConfig(yamlString) {
              // DANGEROUS: Using unsafe YAML load
              return yaml.load(yamlString);
            }
          `,
          errors: [
            {
              messageId: 'unsafeYamlParsing',
            },
          ],
        },
      ],
    });
  });
});
