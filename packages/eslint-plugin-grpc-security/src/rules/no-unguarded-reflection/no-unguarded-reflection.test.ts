/**
 * @fileoverview Tests for no-unguarded-reflection
 *
 * The two lab files are read verbatim from the CWE-306 corpus: the grpc-2
 * "Hidden Methods" server registers reflection unconditionally (reported), and
 * its reference fix registers it only under an environment check (silent).
 *
 * The litmus every case below holds: rename every identifier to `foo`/`bar`
 * and nothing changes. The rule keys on the module a binding came from and on
 * whether a branch sits between the registration and the program, never on a
 * name.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noUnguardedReflection } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const corpus = (file: string): string =>
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../benchmarks/corpus/CWE-306', file),
    'utf8',
  );

const ESM = `import { ReflectionService } from '@grpc/reflection';`;
const LEGACY = `import { addReflection } from 'grpc-server-reflection';`;
const ERR = [{ messageId: 'unguardedReflection' as const }];

ruleTester.run('no-unguarded-reflection', noUnguardedReflection, {
  valid: [
    {
      name: 'lab grpc-2 reference fix: reflection only when NODE_ENV is development',
      // @found ofri-peretz/security-research:protocol-ctf/solutions/grpc-2/fixed-server.mjs
      code: corpus('safe/grpc-2-lab-fixed-server.js'),
    },
    {
      name: 'guarded by an if block reading the environment',
      code: `${ESM}\nif (process.env.NODE_ENV !== 'production') {\n  new ReflectionService(def).addToServer(server);\n}`,
    },
    {
      name: 'guarded through a const the environment was read into',
      code: `${ESM}\nconst foo = process.env.BAR === '1';\nif (foo) new ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'guarded by a config flag: a branch is a decision the code made',
      code: `${ESM}\nif (config.reflection) new ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'in the else arm of a production check',
      code: `${ESM}\nif (process.env.NODE_ENV === 'production') { log(); } else { new ReflectionService(def).addToServer(server); }`,
    },
    {
      name: 'right side of &&',
      code: `${ESM}\nprocess.env.GRPC_REFLECTION && new ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'a ternary arm',
      code: `${ESM}\nisDev ? new ReflectionService(def).addToServer(server) : null;`,
    },
    {
      name: 'a switch case',
      code: `${ESM}\nswitch (mode) { case 'dev': new ReflectionService(def).addToServer(server); break; }`,
    },
    {
      name: 'after an early return in the same function',
      code: `${ESM}\nfunction foo(server) {\n  if (process.env.NODE_ENV === 'production') return;\n  new ReflectionService(def).addToServer(server);\n}\nfoo(s);`,
    },
    {
      name: 'after an early throw in a block',
      code: `${ESM}\nfunction foo(server) {\n  if (locked) { throw new Error('no'); }\n  new ReflectionService(def).addToServer(server);\n}\nfoo(s);`,
    },
    {
      name: 'a helper whose only call site is guarded',
      code: `${ESM}\nfunction foo(server) { new ReflectionService(def).addToServer(server); }\nif (isDev) foo(s);`,
    },
    {
      name: 'an arrow helper whose only call site is guarded',
      code: `${ESM}\nconst foo = (server) => new ReflectionService(def).addToServer(server);\nif (isDev) foo(s);`,
    },
    {
      name: 'an exported helper never called here: the caller decides',
      code: `${ESM}\nexport function foo(server) { new ReflectionService(def).addToServer(server); }`,
    },
    {
      name: 'an anonymous default-exported helper: the importer decides',
      code: `${ESM}\nexport default function (server) { new ReflectionService(def).addToServer(server); }`,
    },
    {
      name: 'a helper stored on an object: no binding to follow',
      code: `${ESM}\nhandlers.enable = (server) => new ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'a helper passed by reference: that is not a call the file proves runs',
      code: `${ESM}\nfunction foo(server) { new ReflectionService(def).addToServer(server); }\nif (isDev) foo(a);\nhooks.push(foo);`,
    },
    {
      name: 'a class method: no call site to follow',
      code: `${ESM}\nclass Foo { bar(server) { new ReflectionService(def).addToServer(server); } }`,
    },
    {
      name: 'legacy package, guarded',
      code: `${LEGACY}\nif (process.env.NODE_ENV !== 'production') addReflection(server, 'descriptor.bin');`,
    },
    {
      name: 'no reflection package imported: addToServer belongs to something else',
      code: `new ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'a same-named class from another module',
      code: `import { ReflectionService } from './local';\nnew ReflectionService(def).addToServer(server);`,
    },
    {
      name: 'a same-named function from another module',
      code: `${ESM}\nimport { addReflection } from './local';\naddReflection(server);`,
    },
    {
      name: 'a ReflectionService that is constructed but never registered',
      code: `${ESM}\nconst foo = new ReflectionService(def);`,
    },
    {
      name: 'a different method on the service',
      code: `${ESM}\nnew ReflectionService(def).getServices();`,
    },
    {
      name: 'addToServer on a reassigned binding is not followed',
      code: `${ESM}\nlet foo = new ReflectionService(def);\nfoo = other;\nfoo.addToServer(server);`,
    },
    {
      name: 'addToServer on a parameter',
      code: `${ESM}\nexport const foo = (bar, server) => { bar.addToServer(server); };`,
    },
    {
      name: 'addToServer on a call result',
      code: `${ESM}\nmake().addToServer(server);`,
    },
    {
      name: 'a computed member is not addToServer',
      code: `${ESM}\nnew ReflectionService(def)[method](server);`,
    },
    {
      name: 'a recursive helper called only from inside itself',
      code: `${ESM}\nfunction foo(server) { new ReflectionService(def).addToServer(server); foo(server); }`,
    },
  ],
  invalid: [
    {
      name: 'lab grpc-2: reflection on the public server, no guard',
      // @found ofri-peretz/security-research:protocol-ctf/challenges/grpc/grpc-2/server.mjs:56 (corpus line 62)
      code: corpus('vulnerable/grpc-2-lab-server.js'),
      errors: ERR,
    },
    {
      name: 'the service bound to a const first',
      code: `${ESM}\nconst foo = new ReflectionService(def);\nfoo.addToServer(bar);`,
      errors: ERR,
    },
    {
      name: 'a namespace import',
      code: `import * as foo from '@grpc/reflection';\nnew foo.ReflectionService(def).addToServer(server);`,
      errors: ERR,
    },
    {
      name: 'CommonJS destructured require',
      code: `const { ReflectionService: Foo } = require('@grpc/reflection');\nnew Foo(def).addToServer(server);`,
      errors: ERR,
    },
    {
      name: 'CommonJS member require',
      code: `const foo = require('@grpc/reflection');\nnew foo.ReflectionService(def).addToServer(server);`,
      errors: ERR,
    },
    {
      name: 'legacy grpc-server-reflection addReflection',
      code: `${LEGACY}\naddReflection(server, 'path/to/descriptor_set.bin');`,
      errors: ERR,
    },
    {
      name: 'legacy package through CommonJS',
      code: `const foo = require('grpc-server-reflection');\nfoo.addReflection(server, 'descriptor.bin');`,
      errors: ERR,
    },
    {
      name: 'inside a main() that is called unconditionally',
      code: `${ESM}\nasync function main() {\n  new ReflectionService(def).addToServer(server);\n}\nmain();`,
      errors: ERR,
    },
    {
      name: 'a helper with one guarded and one unguarded call site',
      code: `${ESM}\nconst foo = (s) => new ReflectionService(def).addToServer(s);\nif (isDev) foo(a);\nfoo(b);`,
      errors: ERR,
    },
    {
      name: 'inside a callback, which runs whenever its caller does',
      code: `${ESM}\nserver.bindAsync(addr, creds, () => {\n  new ReflectionService(def).addToServer(server);\n  server.start();\n});`,
      errors: ERR,
    },
    {
      name: 'an if whose consequent does not exit is not an early-return guard',
      code: `${ESM}\nif (process.env.NODE_ENV === 'production') { log('prod'); }\nnew ReflectionService(def).addToServer(server);`,
      errors: ERR,
    },
    {
      name: 'a guard inside a nested function does not cover the outer call',
      code: `${ESM}\nfunction foo() { if (x) return; }\nnew ReflectionService(def).addToServer(server);`,
      errors: ERR,
    },
    {
      name: 'a loop or try block is not a guard',
      code: `${ESM}\ntry { for (const s of servers) new ReflectionService(def).addToServer(s); } catch {}`,
      errors: ERR,
    },
    {
      name: 'the test of an if is evaluated unconditionally',
      code: `${ESM}\nif (new ReflectionService(def).addToServer(server)) {}`,
      errors: ERR,
    },
    {
      name: 'an early return AFTER the registration does not guard it',
      code: `${ESM}\nfunction foo(server) {\n  new ReflectionService(def).addToServer(server);\n  if (done) return;\n}\nfoo(s);`,
      errors: ERR,
    },
    {
      name: 'an if with an empty block is not an early exit',
      code: `${ESM}\nfunction foo(server) {\n  if (x) {}\n  new ReflectionService(def).addToServer(server);\n}\nfoo(s);`,
      errors: ERR,
    },
    {
      name: 'an IIFE runs where it stands',
      code: `${ESM}\n(() => {\n  new ReflectionService(def).addToServer(server);\n})();`,
      errors: ERR,
    },
    {
      name: 'a callback handed to a constructor runs with it',
      code: `${ESM}\nawait new Promise((resolve) => {\n  new ReflectionService(def).addToServer(server);\n  resolve();\n});`,
      errors: ERR,
    },
    {
      name: 'the left side of && is evaluated unconditionally',
      code: `${ESM}\nnew ReflectionService(def).addToServer(server) && log();`,
      errors: ERR,
    },
  ],
});
