#!/usr/bin/env -S npx tsx
/**
 * ILB-Discover — natural-language → rule retrieval (roadmap item 2.3).
 *
 * Agent ergonomics: agents arrive cold without a memorized rule catalog.
 * Given an NL description of a problem ("user input flows into shell command"),
 * can they find the right rule? This bench measures that as Recall@k.
 *
 * Approach:
 *   - **Index**: every rule's `meta.docs.description` (or its index.ts source)
 *     is tokenized + indexed with BM25 (no API dependency, no LLM cost).
 *   - **Eval set**: 35 NL prompts at `eval-set.json`, each with 1+ expected
 *     rule IDs. Frozen — never edit existing entries; append-only.
 *   - **Score**: Recall@1 (did the top hit match?), Recall@5 (did any of the
 *     top 5 match?). Per-prompt + aggregate.
 *
 * SLOs: Recall@1 ≥ 80%, Recall@5 ≥ 95%.
 *
 * Future upgrade path (when API budget allows): swap the BM25 retriever for
 * an embedding retriever (text-embedding-3-large or Cohere's embed-v3). The
 * eval set + scoring stays identical — just the retriever changes.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-discover/run.mjs
 *   tsx benchmarks/suites/ilb-discover/run.mjs --top-k 5
 *   tsx benchmarks/suites/ilb-discover/run.mjs --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-discover');
const EVAL_SET_PATH = path.join(HERE, 'eval-set.json');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const VERBOSE = process.argv.includes('--verbose');
const TOP_K = Number.parseInt(ARG('--top-k') ?? '5', 10);

// ─── BM25 retriever ──────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with', 'using', 'use', 'used', 'into', 'when', 'without',
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s/.\-]+/g, ' ')
    .split(/[\s./_-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

class BM25 {
  k1: number;
  b: number;
  documents: any[];
  docCount: number;
  docFreq: Map<string, number>;
  docTokens: string[][];
  docLens: number[];
  avgDocLen: number;
  idf: Map<string, number>;
  constructor(documents: any[], { k1 = 1.5, b = 0.75 } = {}) {
    this.k1 = k1;
    this.b = b;
    this.documents = documents;
    this.docCount = documents.length;
    this.docFreq = new Map();
    this.docTokens = documents.map((d) => tokenize(d.text));
    this.docLens = this.docTokens.map((toks) => toks.length);
    this.avgDocLen = this.docLens.reduce((a, b) => a + b, 0) / this.docCount;

    for (let i = 0; i < this.docCount; i++) {
      const seen = new Set();
      for (const tok of this.docTokens[i]) {
        if (!seen.has(tok)) { this.docFreq.set(tok, (this.docFreq.get(tok) ?? 0) + 1); seen.add(tok); }
      }
    }
    this.idf = new Map();
    for (const [tok, df] of this.docFreq.entries()) {
      this.idf.set(tok, Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5)));
    }
  }

  score(queryTokens, docIdx) {
    const docToks = this.docTokens[docIdx];
    const len = this.docLens[docIdx];
    const tf = new Map();
    for (const t of docToks) tf.set(t, (tf.get(t) ?? 0) + 1);

    let s = 0;
    for (const q of queryTokens) {
      const f = tf.get(q) ?? 0;
      if (f === 0) continue;
      const idf = this.idf.get(q) ?? 0;
      s += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * len / this.avgDocLen));
    }
    return s;
  }

  topK(query, k = 5) {
    const qToks = tokenize(query);
    const scored = this.documents.map((d, i) => ({ doc: d, score: this.score(qToks, i) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).filter((x) => x.score > 0);
  }
}

// ─── rule discovery ──────────────────────────────────────────────────────

function discoverPlugins() {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .map((e) => ({ pluginName: e.name.replace(/^eslint-plugin-/, ''), dir: path.join(PACKAGES_ROOT, e.name) }));
}

function extractRuleSnippet(ruleSource, ruleName) {
  // Index strategy: weight the rule NAME heavily (it's the most discriminating
  // signal), include the description once, the LLM-message issueName + fix
  // strings, and the CWE-keyword cluster *only* for rules that declare a CWE.
  // Critical: do NOT broadcast generic synonyms ("avoid", "prevent") to every
  // rule — that drops IDF and hurts discriminability.
  const parts = [];

  // Name — repeated 3× because BM25 with k1≈1.5 caps single-term boost; this
  // is the cheapest way to put a heavy thumb on the name without changing k1.
  const tokens = ruleName.replaceAll('-', ' ');
  parts.push(tokens, tokens, tokens);

  // description — single-weight
  const desc = ruleSource.match(/description\s*[:=]\s*['"`]([^'"`]{5,400})['"`]/);
  if (desc) parts.push(desc[1]);

  // CWE annotation → keyword cluster (only if declared)
  const cweMatch = ruleSource.match(/\bcwe\s*[:=]\s*['"`](CWE-(\d+))['"`]/);
  if (cweMatch) {
    const cweKw = CWE_KEYWORDS[cweMatch[1]];
    if (cweKw) parts.push(cweMatch[1], cweKw);
  }

  // formatLLMMessage rich fields
  for (const m of ruleSource.matchAll(/formatLLMMessage\s*\(\s*\{([\s\S]{0,1500}?)\}\s*\)/g)) {
    const block = m[1];
    for (const k of ['issueName', 'description', 'fix']) {
      const v = block.match(new RegExp(`${k}\\s*:\\s*['"\`]([^'"\`]{3,250})['"\`]`));
      if (v) parts.push(v[1]);
    }
  }

  // Generic message templates
  for (const m of ruleSource.matchAll(/messages?\s*[:=]\s*\{([^}]{0,1500})\}/g)) {
    for (const msg of m[1].matchAll(/['"`]([^'"`]{5,300})['"`]/g)) parts.push(msg[1]);
  }

  return parts.join(' · ');
}

/**
 * Query-side expansion. Given a natural-language query, produce expanded
 * variants that include canonical terminology so BM25 can match rule names
 * directly. Run at search time, not at index time — expansions touch only
 * the query, not every document, so IDF stays high.
 */
function expandQuery(query) {
  const expansions = [query];
  const lower = query.toLowerCase();

  // Phrase → rule-keyword mapping — high-signal lookup that turns colloquial
  // problem descriptions into the exact tokens rule names use.
  const phraseMap: Array<[RegExp, string]> = [
    [/shell|exec|spawn|child[\s_]?process/, 'shell injection child process'],
    [/sql|query|database/,                  'sql query unsafe'],
    [/dom|innerhtml|html|render/,           'innerhtml dom xss'],
    [/credential|password|secret|api[\s_]?key|token/, 'hardcoded credentials secret'],
    [/jwt|json web token/,                  'jwt algorithm none verification'],
    [/path|file|directory|traversal/,       'path traversal file'],
    [/eval|new function|code injection/,    'eval function constructor injection'],
    [/ssrf|server[\s-]?side|fetch.*url/,    'ssrf server side request forgery'],
    [/regex|redos/,                         'regex redos pattern'],
    [/prototype|object injection|proto/,    'prototype pollution object injection detect'],
    [/cors|cross[\s-]?origin/,              'cors permissive origin'],
    [/csrf|forgery/,                        'csrf cross site request forgery'],
    [/random|prng/,                         'insecure randomness math random'],
    [/md5|sha1|weak.*hash|weak.*crypt/,     'weak hash md5 sha1 cryptographic'],
    [/timing|comparison|equal/,             'insecure comparison timing safe'],
    [/deserialization|unserialize|unmarshal/, 'unsafe deserialization'],
    [/log.*event|log.*secret|stack trace/,  'secret logging stack trace exposure'],
    [/cycle|circular|import/,               'cycle import circular'],
    [/alt|aria|wcag|accessibility/,         'alt text a11y accessibility'],
    [/hook|useEffect|dependency|stale/,     'hooks exhaustive deps'],
    [/timeout|deadline/,                    'request timeout require'],
    [/mongo|nosql|mongoose/,                'mongodb mongoose unsafe query nosql'],
    [/postgres|pg|psql/,                    'postgres pg unsafe query'],
    [/lambda|aws.*function|presigned/,      'lambda secret unbounded presigned'],
    [/nestjs|nest.*controller/,             'nestjs public decorator sensitive route'],
    [/llm|ai.*output|prompt.*injection/,    'unsafe output handling prompt injection ai'],
    [/parameter|argument count/,            'max params'],
    [/nesting|nested/,                      'max nesting depth'],
    [/lines.*function|function.*length/,    'max lines per function'],
    [/postmessage|message event/,           'postmessage wildcard origin'],
    [/blank|noopener|target/,               'target blank noopener'],
  ];
  for (const [re, expansion] of phraseMap) {
    if (re.test(lower)) expansions.push(expansion);
  }

  return expansions.join(' · ');
}

// CWE-ID → keyword cluster for query expansion. Lets a query like
// "user input flows into shell command" hit a rule whose only annotation
// is `cwe: 'CWE-78'`.
const CWE_KEYWORDS = {
  'CWE-22':  'path traversal directory file system',
  'CWE-78':  'command injection shell exec spawn os',
  'CWE-79':  'cross site scripting xss innerhtml dom',
  'CWE-89':  'sql injection query database',
  'CWE-94':  'code injection eval function constructor',
  'CWE-200': 'information exposure leak disclosure',
  'CWE-269': 'privilege escalation authorization',
  'CWE-287': 'authentication credential session',
  'CWE-306': 'missing authentication',
  'CWE-327': 'broken weak cryptographic algorithm md5 sha1',
  'CWE-352': 'cross site request forgery csrf',
  'CWE-400': 'denial of service redos resource exhaustion',
  'CWE-415': 'double free release lifecycle',
  'CWE-434': 'unrestricted file upload',
  'CWE-502': 'unsafe deserialization deserialize unmarshal',
  'CWE-611': 'xxe external entity',
  'CWE-662': 'race condition synchronization',
  'CWE-672': 'connection lifecycle release',
  'CWE-732': 'permission acl',
  'CWE-787': 'memory buffer overflow',
  'CWE-798': 'hardcoded credential password secret api key token',
  'CWE-862': 'missing authorization access control',
  'CWE-863': 'incorrect authorization permission',
  'CWE-915': 'object injection prototype pollution',
  'CWE-918': 'ssrf server side request forgery internal url',
  'CWE-943': 'nosql injection mongodb mongoose query',
  'CWE-1321': 'prototype pollution proto constructor',
};

function buildRuleIndex() {
  const docs = [];
  for (const plugin of discoverPlugins()) {
    const rulesDir = path.join(plugin.dir, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const f of ['index.ts', 'index.js']) {
        const p = path.join(rulesDir, entry.name, f);
        if (!fs.existsSync(p)) continue;
        const ruleId = `${plugin.pluginName}/${entry.name}`;
        const text = extractRuleSnippet(fs.readFileSync(p, 'utf8'), entry.name);
        docs.push({ ruleId, text });
        break;
      }
    }
  }
  return docs;
}

// ─── eval ────────────────────────────────────────────────────────────────

function evalRetrieval(retriever, evalSet) {
  let recall1 = 0;
  let recall5 = 0;
  const perPrompt = [];
  const N = evalSet.entries.length;

  for (const entry of evalSet.entries) {
    const hits = retriever.topK(expandQuery(entry.prompt), TOP_K).map((h) => h.doc.ruleId);
    const expected = new Set(entry.expected);
    const r1 = hits.length > 0 && expected.has(hits[0]);
    const r5 = hits.some((h) => expected.has(h));
    if (r1) recall1++;
    if (r5) recall5++;
    perPrompt.push({ id: entry.id, prompt: entry.prompt, expected: entry.expected, hits, recall1: r1, recall5: r5 });
  }

  return {
    n: N,
    recall1: recall1 / N,
    recall5: recall5 / N,
    perPrompt,
  };
}

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const evalSet = JSON.parse(fs.readFileSync(EVAL_SET_PATH, 'utf8'));
  const docs = buildRuleIndex();

  console.log(`ILB-Discover v1.0 · ${docs.length} rules indexed · ${evalSet.entries.length} prompts in eval set`);
  console.log('');

  const retriever = new BM25(docs);
  const result = evalRetrieval(retriever, evalSet);

  console.log(`Recall@1: ${(result.recall1 * 100).toFixed(1)}%  ${result.recall1 >= 0.80 ? '✅' : '❌'} (SLO ≥ 80%)`);
  console.log(`Recall@5: ${(result.recall5 * 100).toFixed(1)}%  ${result.recall5 >= 0.95 ? '✅' : '❌'} (SLO ≥ 95%)`);
  console.log('');

  if (VERBOSE) {
    console.log('Failures (Recall@5 = 0):');
    for (const p of result.perPrompt) {
      if (!p.recall5) console.log(`  ${p.id}: "${p.prompt}"\n     expected: ${p.expected.join(', ')}\n     got:      ${p.hits.slice(0, 5).join(', ') || '<no hits>'}`);
    }
    console.log('');
  }

  const date = new Date().toISOString().slice(0, 10);
  const envelope = {
    bench: 'ILB-Discover',
    benchVersion: evalSet.version ?? '1.0',
    timestamp: new Date().toISOString(),
    methodologyCommit: capturePreregistration({ allowDirty: true }).methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: {
      recall1: result.recall1,
      recall5: result.recall5,
    },
    latency: {},
    retriever: { type: 'BM25', k1: 1.5, b: 0.75 },
    rulesIndexed: docs.length,
    perPrompt: result.perPrompt,
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  appendHistory(envelope, outPath);
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);

  process.exit(result.recall5 < 0.50 ? 1 : 0);
}

main().catch((err) => {
  console.error('ILB-Discover fatal:', err);
  process.exit(2);
});
