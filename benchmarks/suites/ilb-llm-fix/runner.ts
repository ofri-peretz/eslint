#!/usr/bin/env -S npx tsx
/**
 * ilb-llm-fix runner — methodology v1.0
 *
 * Reads fixtures.json + models.json, sends each (fixture, variant, model)
 * through the local `claude` CLI, runs the fixture's verifier against the
 * model's patched code, and writes an ILB-schema JSON result.
 *
 * Usage:
 *   npx tsx benchmarks/suites/ilb-llm-fix/runner.ts
 *
 *   ILB_VARIANTS=v1,v2-human                     # default: v1,v2-human,v2-agent
 *   ILB_MODELS=haiku                             # default: haiku
 *   ILB_OUT=/tmp/foo.json                        # override output path
 *   ILB_LABEL=quick-haiku                        # override result filename label
 *   ILB_VERBOSE=1                                # per-call progress on stderr
 *
 * IMPORTANT: do NOT run from inside another Claude Code session — the
 * `claude` CLI guards against nested invocation and short-circuits with
 * "Prompt is too long". Run from a regular shell.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE_NAME = 'ilb-llm-fix';
const METHODOLOGY_VERSION = 'v1.3';

const require_ = createRequire(import.meta.url);

type V1Formatters = {
  formatLLMMessage: (opts: unknown) => string;
};
type V2Formatters = {
  formatSecurityMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
  formatCodeQualityMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
  formatPerformanceMessage: (opts: unknown, mode: 'human' | 'compact' | 'agent') => string;
};

const DEVKIT_DIST = resolve(
  HERE,
  '../../../dist/out-tsc/packages/eslint-devkit/src/messaging',
);
const v1: V1Formatters = require_(join(DEVKIT_DIST, 'formatters.js'));
const v2: V2Formatters = require_(join(DEVKIT_DIST, 'formatters-v2.js'));

const SYSTEM_PROMPT = `You are a code-fix agent. The user will give you a lint finding
and a code snippet. Return ONLY the patched code in a single fenced code block.
Do not explain. Do not wrap your answer in additional prose.`;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type Variant = 'v1' | 'v2-human' | 'v2-agent';
type Category = 'security' | 'quality' | 'performance';

interface Verifier {
  type:
    | 'regex-must-match'
    | 'regex-must-not-match'
    | 'both'
    /**
     * `any-of`: pass if ANY of the listed sub-verifiers passes. Use when
     * a fixture has multiple acceptable fix paths (e.g. weak-md5 can be
     * fixed by switching to SHA-256 OR by keeping MD5 with an explicit
     * "non-cryptographic" comment).
     */
    | 'any-of';
  pattern?: string;
  mustMatch?: string;
  mustNotMatch?: string;
  reason: string;
  /** For type='any-of': the alternative sub-verifiers, any one of which passing makes the fixture pass. */
  options?: Array<Omit<Verifier, 'type' | 'options'> & {
    type: 'regex-must-match' | 'regex-must-not-match' | 'both';
  }>;
}

interface Fixture {
  id: string;
  category: Category;
  source?: { repo: string; path?: string; advisory?: string; note?: string };
  v1: unknown;
  v2: unknown;
  buggyCode: string;
  knownGoodFix: string;
  verify: Verifier;
}

interface FixturesFile {
  version: string;
  fixtures: Fixture[];
}

interface ModelEntry {
  id: string;
  fullName: string;
  tier: string;
  approxCostPerMTokensInput?: number;
  approxCostPerMTokensOutput?: number;
}

interface ModelsFile {
  version: string;
  models: ModelEntry[];
}

interface ClaudeCliResponse {
  type: 'result';
  subtype: 'success' | 'error';
  is_error: boolean;
  result: string;
  duration_ms: number;
  duration_api_ms: number;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
}

interface CallResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface ResultRow {
  fixtureId: string;
  category: Category;
  variant: Variant;
  model: string;
  modelFullName: string;
  pass: boolean;
  reason: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelResponse: string;
  error?: string;
}

interface SummaryRow {
  variant: Variant;
  model: string;
  pass: number;
  errors: number;
  total: number;
  passRate: number;
  meanInputTokens: number;
  meanOutputTokens: number;
  totalCostUsd: number;
}

// ---------------------------------------------------------------------------
// FORMATTER VARIANT DISPATCH
// ---------------------------------------------------------------------------

function renderMessage(fixture: Fixture, variant: Variant): string {
  if (variant === 'v1') return v1.formatLLMMessage(fixture.v1);
  const mode: 'human' | 'agent' = variant === 'v2-human' ? 'human' : 'agent';
  switch (fixture.category) {
    case 'security':
      return v2.formatSecurityMessage(fixture.v2, mode);
    case 'quality':
      return v2.formatCodeQualityMessage(fixture.v2, mode);
    case 'performance':
      return v2.formatPerformanceMessage(fixture.v2, mode);
    default: {
      const exhaustive: never = fixture.category;
      throw new Error(`unknown fixture category: ${exhaustive as string}`);
    }
  }
}

function buildUserPrompt(message: string, code: string): string {
  return `Lint finding:\n${message}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\nReturn the patched code.`;
}

// ---------------------------------------------------------------------------
// VERIFIER
// ---------------------------------------------------------------------------

function verifyFix(
  modelOutput: string,
  verifier: Verifier,
): { pass: boolean; reason: string } {
  switch (verifier.type) {
    case 'regex-must-match': {
      const re = new RegExp(verifier.pattern!);
      return re.test(modelOutput)
        ? { pass: true, reason: 'matched required pattern' }
        : { pass: false, reason: `did not match: ${verifier.reason}` };
    }
    case 'regex-must-not-match': {
      const re = new RegExp(verifier.pattern!);
      return !re.test(modelOutput)
        ? { pass: true, reason: 'forbidden pattern absent' }
        : { pass: false, reason: `still contains forbidden pattern: ${verifier.reason}` };
    }
    case 'both': {
      const has = new RegExp(verifier.mustMatch!).test(modelOutput);
      const lacks = !new RegExp(verifier.mustNotMatch!).test(modelOutput);
      if (has && lacks) return { pass: true, reason: 'both conditions met' };
      const fails: string[] = [];
      if (!has) fails.push('missing required');
      if (!lacks) fails.push('still has forbidden');
      return { pass: false, reason: `${fails.join('; ')} (${verifier.reason})` };
    }
    case 'any-of': {
      const subs = verifier.options ?? [];
      for (let i = 0; i < subs.length; i++) {
        const sub = { ...subs[i] } as Verifier;
        const r = verifyFix(modelOutput, sub);
        if (r.pass) return { pass: true, reason: `option #${i + 1} matched: ${r.reason}` };
      }
      return { pass: false, reason: `none of ${subs.length} alternatives matched (${verifier.reason})` };
    }
    default: {
      const exhaustive: never = verifier.type;
      return { pass: false, reason: `unknown verifier type: ${exhaustive as string}` };
    }
  }
}

function extractCodeBlock(text: string): string {
  const fenced = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return fenced ? fenced[1] : text;
}

// ---------------------------------------------------------------------------
// CLAUDE CLI INVOCATION (stdin-fed, MCP-disabled, env-stripped)
// ---------------------------------------------------------------------------

interface CallArgs {
  model: string;
  system: string;
  prompt: string;
  binary?: string;
}

async function callClaude({
  model,
  system,
  prompt,
  binary = 'claude',
}: CallArgs): Promise<CallResponse> {
  const args = [
    '-p',
    '--system-prompt', system,
    '--output-format', 'json',
    '--model', model,
    '--no-session-persistence',
    '--strict-mcp-config',
    '--allowed-tools', '',
    '--disallowed-tools', '*',
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env['CLAUDECODE'];
  delete env['CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING'];
  delete env['CLAUDE_CODE_ENTRYPOINT'];
  delete env['CLAUDE_CODE_EXECPATH'];
  delete env['CLAUDE_AGENT_SDK_VERSION'];
  delete env['AI_AGENT'];

  return new Promise<CallResponse>((resolveP, rejectP) => {
    const child = spawn(binary, args, { env });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => out.push(c));
    child.stderr.on('data', (c: Buffer) => err.push(c));
    child.on('error', rejectP);
    child.on('close', (code) => {
      if (code !== 0) {
        const stderrText = Buffer.concat(err).toString('utf8');
        rejectP(new Error(`claude exited code ${code}: ${stderrText.slice(0, 500)}`));
        return;
      }
      const stdout = Buffer.concat(out).toString('utf8');
      try {
        const parsed = JSON.parse(stdout) as ClaudeCliResponse;
        if (parsed.is_error) {
          rejectP(new Error(`claude reported error: ${parsed.result}`));
          return;
        }
        resolveP({
          text: parsed.result,
          inputTokens:
            (parsed.usage?.input_tokens ?? 0) +
            (parsed.usage?.cache_read_input_tokens ?? 0),
          outputTokens: parsed.usage?.output_tokens ?? 0,
          costUsd: parsed.total_cost_usd ?? 0,
        });
      } catch (e) {
        rejectP(new Error(`failed to parse claude JSON: ${(e as Error).message}`));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// RUNNER
// ---------------------------------------------------------------------------

function parseList<T extends string>(
  envVar: string | undefined,
  fallback: T[],
): T[] {
  if (!envVar) return fallback;
  return envVar.split(',').map((s) => s.trim()).filter(Boolean) as T[];
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

async function main(): Promise<void> {
  const fixtures = JSON.parse(readFileSync(join(HERE, 'fixtures.json'), 'utf8')) as FixturesFile;
  const modelsCfg = JSON.parse(readFileSync(join(HERE, 'models.json'), 'utf8')) as ModelsFile;

  const variants = parseList<Variant>(process.env['ILB_VARIANTS'], ['v1', 'v2-human', 'v2-agent']);
  const modelIds = parseList<string>(process.env['ILB_MODELS'], ['haiku']);
  const verbose = process.env['ILB_VERBOSE'] === '1';

  const models: ModelEntry[] = modelIds.map((id) => {
    const m = modelsCfg.models.find((x) => x.id === id);
    if (!m) {
      throw new Error(
        `unknown model id '${id}' (declared in models.json: ${modelsCfg.models.map((x) => x.id).join(', ')})`,
      );
    }
    return m;
  });

  console.error(`ilb-llm-fix ${METHODOLOGY_VERSION}`);
  console.error(`  fixtures: ${fixtures.fixtures.length}`);
  console.error(`  variants: ${variants.join(', ')}`);
  console.error(`  models:   ${models.map((m) => m.id).join(', ')}`);

  const results: ResultRow[] = [];

  for (const fixture of fixtures.fixtures) {
    for (const variant of variants) {
      const message = renderMessage(fixture, variant);
      const userPrompt = buildUserPrompt(message, fixture.buggyCode);

      for (const model of models) {
        if (verbose) process.stderr.write(`  [${model.id}] ${fixture.id} (${variant})...`);
        try {
          const resp = await callClaude({
            model: model.fullName,
            system: SYSTEM_PROMPT,
            prompt: userPrompt,
          });
          const code = extractCodeBlock(resp.text);
          const verdict = verifyFix(code, fixture.verify);
          results.push({
            fixtureId: fixture.id,
            category: fixture.category,
            variant,
            model: model.id,
            modelFullName: model.fullName,
            pass: verdict.pass,
            reason: verdict.reason,
            inputTokens: resp.inputTokens,
            outputTokens: resp.outputTokens,
            costUsd: resp.costUsd,
            modelResponse: resp.text,
          });
          if (verbose) {
            process.stderr.write(` ${verdict.pass ? '✓' : '✗'} ($${resp.costUsd.toFixed(4)})\n`);
          }
        } catch (err) {
          results.push({
            fixtureId: fixture.id,
            category: fixture.category,
            variant,
            model: model.id,
            modelFullName: model.fullName,
            pass: false,
            reason: 'CLI call failed',
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            modelResponse: '',
            error: err instanceof Error ? err.message : String(err),
          });
          if (verbose) process.stderr.write(' ERROR\n');
        }
      }
    }
  }

  // Per (variant, model) summary
  const summary: SummaryRow[] = [];
  for (const variant of variants) {
    for (const model of models) {
      const subset = results.filter((r) => r.variant === variant && r.model === model.id);
      const pass = subset.filter((r) => r.pass).length;
      const errors = subset.filter((r) => r.error).length;
      summary.push({
        variant,
        model: model.id,
        pass,
        errors,
        total: subset.length,
        passRate: subset.length === 0 ? 0 : pass / subset.length,
        meanInputTokens: mean(subset.map((r) => r.inputTokens)),
        meanOutputTokens: mean(subset.map((r) => r.outputTokens)),
        totalCostUsd: subset.reduce((s, r) => s + r.costUsd, 0),
      });
    }
  }

  const passRates = summary.map((s) => s.passRate);
  const headlineScore =
    passRates.length === 0
      ? 0
      : Math.round((passRates.reduce((s, x) => s + x, 0) / passRates.length) * 10000) / 100;

  const passRateByVariant: Record<string, number | null> = {};
  for (const variant of variants) {
    const cells = summary.filter((s) => s.variant === variant);
    passRateByVariant[variant] =
      cells.length === 0
        ? null
        : Math.round((cells.reduce((s, c) => s + c.passRate, 0) / cells.length) * 10000) / 100;
  }

  const devkitPkg = require_(
    resolve(HERE, '../../../packages/eslint-devkit/package.json'),
  ) as { version: string };

  const result = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    benchmark: SUITE_NAME,
    benchmarkType: 'fix-accuracy',
    scoringMode: 'macro-pass-rate',
    methodologyVersion: METHODOLOGY_VERSION,
    methodology: {
      file: 'eslint/benchmarks/suites/ilb-llm-fix/methodology.md',
      version: METHODOLOGY_VERSION,
      score: 'macro-averaged pass rate across (variant, model) cells, %',
      verifierShape: 'regex-must-match | regex-must-not-match | both',
    },
    versions: {
      eslintDevkit: `@interlace/eslint-devkit@${devkitPkg.version}`,
      fixtures: fixtures.version,
      models: modelsCfg.version,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    headlineScore,
    passRateByVariant,
    summary,
    results,
  };

  const label = process.env['ILB_LABEL'] ?? `${variants.join('-')}-${modelIds.join('-')}`;
  const date = new Date().toISOString().slice(0, 10);
  const defaultOut = resolve(
    HERE,
    `../../results/ilb-llm-fix/${date}-${label}.json`,
  );
  const outPath = process.env['ILB_OUT'] ? resolve(process.env['ILB_OUT']) : defaultOut;
  const latestPath = resolve(HERE, '../../results/ilb-llm-fix/latest.json');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  mkdirSync(dirname(latestPath), { recursive: true });
  writeFileSync(latestPath, JSON.stringify(result, null, 2), 'utf8');

  console.error('');
  console.error(`Headline score (macro pass rate): ${headlineScore}%`);
  console.error('Per-variant pass rate:');
  for (const [variant, pct] of Object.entries(passRateByVariant)) {
    console.error(`  ${variant.padEnd(12)} ${pct === null ? 'n/a' : pct + '%'}`);
  }
  console.error(`Wrote ${outPath}`);
  console.error(`Wrote ${latestPath}`);
}

main().catch((err: unknown) => {
  console.error('runner failed:', err);
  process.exit(1);
});
