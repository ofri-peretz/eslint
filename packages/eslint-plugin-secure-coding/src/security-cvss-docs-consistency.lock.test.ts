/**
 * Cross-plugin regression lock — every security rule's documented CVSS must
 * match the CVSS it actually emits in its machine-readable finding.
 *
 * Why this lives here and imports siblings by relative path: the value a
 * consumer (LLM, SARIF tool, CI gate) reads is the `CVSS:x` token baked into
 * the emitted lint message by `formatLLMMessage` → `enrichFromCWE`. A rule's
 * static `meta.docs.cvss` is a *separate* field that silently drifts from the
 * emitted value (e.g. no-hardcoded-credentials shipped docs 9.5 while emitting
 * 9.8). This test pins them together for the whole security ecosystem.
 *
 * Scope: rules that (a) declare `meta.docs.cvss` AND (b) emit a CVSS in at
 * least one message. Rules whose messages carry no CVSS are out of scope —
 * there is no emitted value to contradict (50 such rules today; tracked as a
 * separate "surface the CVSS in findings" follow-up).
 *
 * Add new security plugins to PLUGINS below.
 * See eslint/CLAUDE.md → "Regressions are the issue. Lock everything you fix."
 */
import { describe, it, expect } from 'vitest';
import { rules as browserSecurity } from '../../eslint-plugin-browser-security/src/index';
import { rules as expressSecurity } from '../../eslint-plugin-express-security/src/index';
import { rules as jwt } from '../../eslint-plugin-jwt/src/index';
import { rules as lambdaSecurity } from '../../eslint-plugin-lambda-security/src/index';
import { rules as mongodbSecurity } from '../../eslint-plugin-mongodb-security/src/index';
import { rules as nestjsSecurity } from '../../eslint-plugin-nestjs-security/src/index';
import { rules as nodeSecurity } from '../../eslint-plugin-node-security/src/index';
import { rules as pg } from '../../eslint-plugin-pg/src/index';
import { rules as secureCoding } from './index';
import { rules as vercelAiSecurity } from '../../eslint-plugin-vercel-ai-security/src/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RuleMap = Record<string, any>;

const PLUGINS: Record<string, RuleMap> = {
  'browser-security': browserSecurity,
  'express-security': expressSecurity,
  jwt,
  'lambda-security': lambdaSecurity,
  'mongodb-security': mongodbSecurity,
  'nestjs-security': nestjsSecurity,
  'node-security': nodeSecurity,
  pg,
  'secure-coding': secureCoding,
  'vercel-ai-security': vercelAiSecurity,
};

/** CVSS the rule emits in its primary finding = first message carrying a token. */
function primaryEmittedCvss(rule: RuleMap): number | undefined {
  const messages: Record<string, string> = rule?.meta?.messages ?? {};
  for (const text of Object.values(messages)) {
    const m = /CVSS:(\d+(?:\.\d+)?)/.exec(String(text));
    if (m) return Number(m[1]);
  }
  return undefined;
}

describe('security CVSS docs/message consistency (lock)', () => {
  it('every security rule emits the CVSS it documents in meta.docs.cvss', () => {
    const mismatches: string[] = [];
    for (const [plugin, rules] of Object.entries(PLUGINS)) {
      for (const [name, rule] of Object.entries(rules)) {
        const docsCvss = rule?.meta?.docs?.cvss;
        if (docsCvss === undefined) continue; // no documented score
        const emitted = primaryEmittedCvss(rule);
        if (emitted === undefined) continue; // no CVSS in any message
        if (emitted !== docsCvss) {
          mismatches.push(
            `${plugin}/${name}: docs.cvss=${docsCvss} but emits CVSS:${emitted}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
