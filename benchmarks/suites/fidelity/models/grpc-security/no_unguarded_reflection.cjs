const { tag } = require('../../lib.cjs');

/** spelling -> { head: import lines, make: (server) => registration expression }. */
function registration(spelling, binding) {
  const service = (ctor) =>
    binding === 'ViaConst'
      ? {
          pre: `const svc = new ${ctor}(def);`,
          expr: (s) => `svc.addToServer(${s})`,
        }
      : { pre: '', expr: (s) => `new ${ctor}(def).addToServer(${s})` };
  switch (spelling) {
    case 'Named':
      return {
        head: "import { ReflectionService } from '@grpc/reflection';",
        ...service('ReflectionService'),
      };
    case 'Renamed':
      return {
        head: "import { ReflectionService as Rs } from '@grpc/reflection';",
        ...service('Rs'),
      };
    case 'Namespace':
      return {
        head: "import * as refl from '@grpc/reflection';",
        ...service('refl.ReflectionService'),
      };
    case 'RequireDestructure':
      return {
        head: "const { ReflectionService: Rs } = require('@grpc/reflection');",
        ...service('Rs'),
      };
    case 'RequireMember':
      return {
        head: "const refl = require('@grpc/reflection');",
        ...service('refl.ReflectionService'),
      };
    case 'NoImport':
      return { head: '', ...service('ReflectionService') };
    case 'LocalImport':
      return {
        head: "import { ReflectionService } from './reflection';",
        ...service('ReflectionService'),
      };
    case 'Legacy':
      return {
        head: "import { addReflection } from 'grpc-server-reflection';",
        pre: '',
        expr: (s) => `addReflection(${s}, 'descriptor_set.bin')`,
      };
    case 'LegacyRequire':
      return {
        head: "const legacy = require('grpc-server-reflection');",
        pre: '',
        expr: (s) => `legacy.addReflection(${s}, 'descriptor_set.bin')`,
      };
  }
  throw new Error(spelling);
}

/** placement -> program body around the registration `r` (on `server`). */
const PLACE = {
  TopLevel: (r) => `${r('server')};`,
  IfBody: (r) =>
    `if (process.env.NODE_ENV !== 'production') {\n  ${r('server')};\n}`,
  ElseArm: (r) =>
    `if (process.env.NODE_ENV === 'production') {\n  log();\n} else {\n  ${r('server')};\n}`,
  AndRight: (r) => `process.env.GRPC_REFLECTION && ${r('server')};`,
  TernaryArm: (r) => `config.debug ? ${r('server')} : null;`,
  SwitchArm: (r) =>
    `switch (mode) {\n  case 'dev':\n    ${r('server')};\n    break;\n}`,
  AfterEarlyReturn: (r) =>
    `function setup(s) {\n  if (process.env.NODE_ENV === 'production') return;\n  ${r('s')};\n}\nsetup(server);`,
  Callback: (r) =>
    `server.bindAsync(addr, creds, () => {\n  ${r('server')};\n  server.start();\n});`,
  MainCalled: (r) => `async function main() {\n  ${r('server')};\n}\nmain();`,
  HelperGuarded: (r) =>
    `const enable = (s) => ${r('s')};\nif (config.debug) enable(server);`,
  HelperUnguarded: (r) =>
    `const enable = (s) => ${r('s')};\nif (config.debug) enable(a);\nenable(server);`,
  HelperExported: (r) => `export function enable(s) {\n  ${r('s')};\n}`,
  LoopBody: (r) => `for (const s of servers) {\n  ${r('s')};\n}`,
  IfTest: (r) => `if (${r('server')}) {\n  log();\n}`,
  AndLeft: (r) => `${r('server')} && log();`,
  AfterNonExitingIf: (r) =>
    `if (process.env.NODE_ENV === 'production') {\n  log();\n}\n${r('server')};`,
};

function code(s) {
  const reg = registration(tag(s.spelling), tag(s.binding));
  const body = PLACE[tag(s.placement)](reg.expr);
  return [reg.head, 'const server = new grpc.Server();', reg.pre, body]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  rule: 'no-unguarded-reflection',
  domain: 9 * 2 * 16, // spellings x bindings x placements
  traces: 2500,
  key: (s) => `${tag(s.spelling)}|${tag(s.binding)}|${tag(s.placement)}`,
  code,
};
