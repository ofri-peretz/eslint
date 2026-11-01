/**
 * Model-to-rule fidelity: does each Quint model agree with the rule it models?
 *
 * For every model in ./models, Quint samples abstract inputs (ITF traces), this
 * script turns each sampled input into real source code, lints it with the
 * built rule, and compares the rule's verdict with the model's. Agreement is
 * the fidelity score; every disagreement is printed with the code that caused it.
 *
 * Exit 1 on any divergence not listed in KNOWN_DIVERGENCES, so a rule change
 * that silently drifts from its model fails here, and a fixed gap must be
 * removed from the list (it then shows up as stale).
 *
 *   npm run fidelity            # all models
 *   npm run fidelity -- no_eval # one model
 *
 * Needs built plugins (`dist/`); Quint is fetched pinned through npx.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../..');
const { Linter } = require(require.resolve('eslint', { paths: [REPO] }));
const tsParser = require(
  require.resolve('@typescript-eslint/parser', { paths: [REPO] }),
);
const PKG = path.join(REPO, 'packages');
const QUINT = '@informalsystems/quint@0.33.1';
/** Samples per model. require_guards has 768 distinct inputs, so it gets more. */
const TRACES = { require_guards: 4000, require_max_steps: 1500 };
const DEFAULT_TRACES = 300;
/** Fixed, so a run is reproducible: the same seed samples the same inputs. */
const SEED = 1329;
/**
 * Every abstract input each model can produce. A run that does not reach all
 * of them fails: a divergence on an input that was never sampled cannot pass
 * one run and fail the next.
 */
const DOMAIN = {
  no_eval: 18, // 9 call shapes x allowFunctionConstructor
  no_hardcoded_session_tokens: 15, // 5 literal kinds x 3 contexts
  require_guards: 768, // 2^7 flags x 3 guard states x required-match
  no_weak_hash_algorithm: 56, // 4 call kinds x 7 algorithms x security use
  require_max_steps: 128, // 2^3 gates x 2 keys x 8 values
};

const plugin = (pkg) => require(`${PKG}/${pkg}/dist/src/index.js`);
const num = (v) =>
  v && typeof v === 'object' && '#bigint' in v
    ? Number(v['#bigint'])
    : Number(v);
const tag = (v) => (v && typeof v === 'object' && 'tag' in v ? v.tag : v);

/**
 * Divergences we know about and have not fixed yet, as `model input` keys.
 * Each is a real gap between the spec (model) and the rule, not noise.
 */
const KNOWN_DIVERGENCES = new Set([
  // Empty. The first run found `createHash('sha-1')` and `createHash('ripemd160')`
  // passing no-weak-hash-algorithm. main fixed the RIPEMD spellings; the hyphenated
  // SHA-1 is fixed in this change. Both are covered by the rule's tests.
]);

/** Sample the model with Quint into a temp dir and return every ITF state. */
function loadStates(model) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fidelity-${model}-`));
  try {
    execFileSync(
      'npx',
      [
        '-y',
        QUINT,
        'run',
        path.join(__dirname, 'models', `${model}.qnt`),
        '--max-steps=1',
        `--n-traces=${TRACES[model] ?? DEFAULT_TRACES}`,
        `--seed=${SEED}`,
        `--max-samples=${(TRACES[model] ?? DEFAULT_TRACES) + 1000}`,
        `--out-itf=${path.join(dir, 't_{seq}.itf.json')}`,
        '--verbosity=0',
      ],
      { stdio: 'inherit' },
    );
    const out = [];
    for (const f of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.itf.json'))) {
      out.push(
        ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).states,
      );
    }
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Each model: how to read a state, which rule/config, and how to synthesize code.
const MODELS = {
  no_eval: {
    pkg: 'eslint-plugin-browser-security',
    rule: 'no-eval',
    key: (s) => `${tag(s.callee)}|allowFn=${s.allowFn}`,
    config: (s) => ({ allowFunctionConstructor: s.allowFn }),
    code: (s) =>
      ({
        IdentEval: 'eval(input);',
        IdentExecScript: 'execScript(input);',
        MemberEval: 'window.eval(input);',
        ComputedEvalLit: "window['eval'](input);",
        SetTimeoutStr: "setTimeout('alert(1)', 10);",
        SetTimeoutFn: 'setTimeout(() => {}, 10);',
        NewFunction: "new Function('a', 'return a');",
        NewOther: 'new Foo();',
        OtherCall: 'foo(input);',
      })[tag(s.callee)],
    model: (s) => s.verdict,
    input: (s) => MODELS.no_eval.key(s),
  },
  no_hardcoded_session_tokens: {
    pkg: 'eslint-plugin-secure-coding',
    rule: 'no-hardcoded-session-tokens',
    key: (s) => `${tag(s.lit)}|${tag(s.ctx)}`,
    config: () => ({}),
    code: (s) => {
      const v = {
        Jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijklmnopqrstuvwxyz0123456789',
        Bearer: 'Bearer abcdefghijklmnopqrstuvwxyz',
        AlnumLong: 'abcdefghijklmnop',
        AlnumShort: 'abc123',
        Plain: 'hello world, this is text',
      }[tag(s.lit)];
      const lit = JSON.stringify(v);
      return {
        TokenVar: `const sessionToken = ${lit};`,
        NeutralVar: `const label = ${lit};`,
        NotDecl: `call(${lit});`,
      }[tag(s.ctx)];
    },
    model: (s) => s.verdict,
    input: (s) => `${tag(s.lit)}|${tag(s.ctx)}`,
  },
  require_guards: {
    pkg: 'eslint-plugin-nestjs-security',
    rule: 'require-guards',
    key: (s) =>
      [
        'isController',
        'isRouteHandler',
        'classPublic',
        'methodPublic',
        'authDeco',
        'publicByDesign',
        'guards',
        'requiredConfigured',
        'requiredMatch',
      ]
        .map((k) => `${k}=${tag(s[k])}`)
        .join(' '),
    config: (s) => ({
      detectGlobalGuards: false,
      requiredGuards: s.requiredConfigured ? ['RolesGuard'] : [],
    }),
    code: (s) => {
      const classDecs = [
        s.isController ? "@Controller('items')" : '',
        s.classPublic ? '@Public()' : '',
      ]
        .filter(Boolean)
        .join('\n');
      const m = [
        s.isRouteHandler ? '@Get()' : '',
        s.methodPublic ? '@Public()' : '',
        s.authDeco ? '@Auth()' : '',
        tag(s.guards) === 'Empty' ? '@UseGuards()' : '',
        tag(s.guards) === 'Named'
          ? s.requiredMatch
            ? '@UseGuards(RolesGuard)'
            : '@UseGuards(AuthGuard)'
          : '',
      ]
        .filter(Boolean)
        .join('\n  ');
      const name = s.publicByDesign ? 'login' : 'findAll';
      const imports = [
        "import { Controller, Get, UseGuards } from '@nestjs/common';",
        "import { Public, Auth } from './auth.decorators';",
        "import { AuthGuard, RolesGuard } from './guards';",
      ].join('\n');
      return `${imports}\n${classDecs}\nclass ItemsController {\n  ${m}\n  ${name}() { return 1; }\n}\n`;
    },
    model: (s) => s.verdict,
    input: (s) => MODELS.require_guards.key(s),
    parser: tsParser,
    filename: 'src/items.controller.ts',
  },
  no_weak_hash_algorithm: {
    pkg: 'eslint-plugin-node-security',
    rule: 'no-weak-hash-algorithm',
    key: (s) => `${tag(s.kind)}|${tag(s.alg)}|security=${s.securityUse}`,
    config: () => ({}),
    code: (s) => {
      const alg = {
        Md5: "'md5'",
        Sha1Token: "'sha1'",
        Sha1Hyphen: "'sha-1'",
        Md4: "'md4'",
        Ripemd: "'ripemd160'",
        Sha256: "'sha256'",
        NonLiteral: 'algName',
      }[tag(s.alg)];
      // What is hashed is the evidence of purpose: a password vs plain data.
      const input = s.securityUse ? 'password' : 'fileContents';
      return {
        CryptoCreateHash: `import crypto from 'node:crypto';\nconst d = crypto.createHash(${alg}).update(${input}).digest('hex');`,
        BareCreateHash: `import { createHash } from 'node:crypto';\nconst d = createHash(${alg}).update(${input}).digest('hex');`,
        Sha1Call: `import { sha1 } from 'crypto-hash';\nconst d = await sha1(${input});`,
        OtherCall: `const d = hash(${input});`,
      }[tag(s.kind)];
    },
    model: (s) => s.verdict,
    input: (s) => MODELS.no_weak_hash_algorithm.key(s),
  },
  require_max_steps: {
    pkg: 'eslint-plugin-vercel-ai-security',
    rule: 'require-max-steps',
    key: (s) =>
      `ai=${s.importsAi} obj=${s.isObjectArg} tools=${s.hasTools} ${tag(s.key)}=${tag(s.value)}`,
    config: () => ({}),
    code: (s) => {
      const head = s.importsAi
        ? "import { generateText, hasToolCall, stepCountIs } from 'ai';\n"
        : '';
      // Inside a route handler: request data is `.body` of a parameter, as the rule requires.
      const handler = (call) =>
        `${head}export async function POST(req) {\n  ${call}\n}`;
      if (!s.isObjectArg) return handler('generateText(opts);');
      const value = {
        Literal: '10',
        InfinityValue: 'Infinity',
        FromRequest: 'req.body.steps',
        StepCountLiteral: 'stepCountIs(10)',
        StepCountFromRequest: 'stepCountIs(req.body.n)',
        HasToolCallOnly: "hasToolCall('done')",
        HasToolCallAndCount: "[hasToolCall('done'), stepCountIs(10)]",
      }[tag(s.value)];
      const parts = ['model: m', "prompt: 'x'"];
      if (s.hasTools) parts.push('tools: { t }');
      if (value)
        parts.push(
          `${tag(s.key) === 'MaxSteps' ? 'maxSteps' : 'stopWhen'}: ${value}`,
        );
      return handler(`generateText({ ${parts.join(', ')} });`);
    },
    model: (s) => s.verdict,
    input: (s) => MODELS.require_max_steps.key(s),
  },
};

function lint(cfg, code, ruleOpts, parser, filename) {
  const linter = new Linter({ configType: 'flat' });
  const pkgName = cfg.pkg;
  const short = pkgName.replace(/^eslint-plugin-/, '');
  const p = plugin(pkgName);
  const impl = p.default ?? p;
  const flat = [
    {
      files: ['**/*.{js,ts}'],
      plugins: { [short]: impl },
      languageOptions: parser ? { parser } : {},
      rules: { [`${short}/${cfg.rule}`]: ['error', ruleOpts] },
    },
  ];
  const msgs = linter.verify(code, flat, {
    filename: filename ?? 'src/app.ts',
  });
  return msgs.filter((m) => m.ruleId === `${short}/${cfg.rule}`).length > 0;
}

function run(name) {
  const cfg = MODELS[name];
  const states = loadStates(name);
  const tally = { TP: 0, FP: 0, FN: 0, TN: 0 };
  const divergences = new Map();
  const covered = new Set();
  for (const s of states) {
    const modelSays = cfg.model(s);
    const code = cfg.code(s);
    const ruleSays = lint(cfg, code, cfg.config(s), cfg.parser, cfg.filename);
    covered.add(cfg.input(s));
    if (modelSays && ruleSays) tally.TP++;
    else if (!modelSays && ruleSays) tally.FP++;
    else if (modelSays && !ruleSays) tally.FN++;
    else tally.TN++;
    if (modelSays !== ruleSays) {
      const k = `${cfg.input(s)} model=${modelSays} rule=${ruleSays}`;
      if (!divergences.has(k))
        divergences.set(k, code.trim().split('\n').join(' / '));
    }
  }
  const total = states.length;
  const agree = tally.TP + tally.TN;
  return {
    model: name,
    rule: cfg.rule,
    samples: total,
    distinctInputsCovered: covered.size,
    agreement: +(agree / total).toFixed(4),
    tally,
    divergences: [...divergences].map(([k, code]) => ({ k, code })),
  };
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(MODELS);
const results = names.map(run);
let unexpected = 0;
const seen = new Set();
for (const r of results) {
  console.log(`\n== ${r.model} (${r.rule})`);
  console.log(
    `samples=${r.samples} distinctInputs=${r.distinctInputsCovered} agreement=${r.agreement}`,
    JSON.stringify(r.tally),
  );
  for (const d of r.divergences) {
    const key = `${r.model} ${d.k.split(' model=')[0]}`;
    seen.add(key);
    const known = KNOWN_DIVERGENCES.has(key);
    if (!known) unexpected++;
    console.log(
      `  ${known ? 'known  ' : 'NEW    '} ${d.k}\n      code: ${d.code}`,
    );
  }
}
// A listed divergence that no longer happens was fixed: drop it from the list.
const stale = [...KNOWN_DIVERGENCES].filter(
  (k) => names.includes(k.split(' ')[0]) && !seen.has(k),
);
for (const k of stale)
  console.log(`\nSTALE known divergence (fixed? remove it): ${k}`);
// An input never sampled is an input never checked.
const uncovered = results.filter(
  (r) => r.distinctInputsCovered !== DOMAIN[r.model],
);
for (const r of uncovered) {
  console.log(
    `\nINCOMPLETE ${r.model}: sampled ${r.distinctInputsCovered} of ${DOMAIN[r.model]} inputs. Raise its TRACES entry.`,
  );
}
if (unexpected || stale.length || uncovered.length) process.exit(1);
