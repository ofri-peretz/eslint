/**
 * PARTITION MATRIX — shapes × rules, exactly one report per shape.
 *
 * The rule ledger reported two duplicate-coverage clusters in the storage &
 * cookie group. Both were CONFIRMED-DOUBLE against `scripts/probe-rule.mts`:
 *
 * ```text
 * sessionStorage.setItem('access_token', res.data.token);
 *   no-jwt-in-storage           CVSS 8.1
 *   no-sensitive-localstorage   CVSS 5.5   ("localStorage is vulnerable" — of sessionStorage)
 *   no-sensitive-sessionstorage CVSS 7.5
 *
 * document.cookie = 'access_token=abc; Secure; SameSite=Strict';
 *   no-cookie-auth-tokens       CVSS 8.5
 *   no-sensitive-cookie-js      CVSS 8.1
 * ```
 *
 * One line, one defect, three (and two) reports at three (and two) different
 * severities. This file is the lock: every shape below is linted with ALL SIX
 * partitioned rules enabled at once and must produce exactly one report, from
 * the named owner.
 *
 * `require-cookie-secure-attrs` is deliberately NOT in the matrix. It is
 * COMPLEMENTARY, not duplicate — it reports the missing `Secure`/`SameSite`
 * attribute (CWE-614/352) on cookies these rules never look at, and can
 * legitimately co-report with them on a cookie that is both a credential and
 * unattributed. Its own test file locks that.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { noCookieAuthTokens } from '../no-cookie-auth-tokens/index';
import { noSensitiveCookieJs } from '../no-sensitive-cookie-js/index';
import { noSensitiveDataInCache } from '../no-sensitive-data-in-cache/index';
import { noSensitiveIndexeddb } from '../no-sensitive-indexeddb/index';
import { noSensitiveLocalstorage } from '../no-sensitive-localstorage/index';
import { noSensitiveSessionstorage } from '../no-sensitive-sessionstorage/index';
import { noJwtInStorage } from './index';

const RULES = {
  'no-jwt-in-storage': noJwtInStorage,
  'no-sensitive-localstorage': noSensitiveLocalstorage,
  'no-sensitive-sessionstorage': noSensitiveSessionstorage,
  'no-sensitive-indexeddb': noSensitiveIndexeddb,
  'no-sensitive-data-in-cache': noSensitiveDataInCache,
  'no-cookie-auth-tokens': noCookieAuthTokens,
  'no-sensitive-cookie-js': noSensitiveCookieJs,
} as const;

type RuleName = keyof typeof RULES;

const linter = new Linter();

function reportingRules(code: string): string[] {
  const messages = linter.verify(
    code,
    {
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the RuleModule type from devkit is not the flat-config Linter's
      plugins: { bs: { rules: RULES as any } },
      rules: Object.fromEntries(
        Object.keys(RULES).map((r) => [`bs/${r}`, 'error' as const]),
      ),
    },
    'app.js',
  );
  // A crash surfaces as a message with no ruleId. Never score it as "quiet".
  const crashed = messages.filter((m) => !m.ruleId);
  if (crashed.length > 0) throw new Error(crashed[0].message);
  return messages.map((m) => (m.ruleId ?? '').replace('bs/', ''));
}

/** shape → the single rule that owns it */
const MATRIX: ReadonlyArray<readonly [string, RuleName]> = [
  // --- the 4-way storage cluster -------------------------------------------
  [
    `localStorage.setItem('auth_token', res.data.token);`,
    'no-jwt-in-storage',
  ],
  [
    `sessionStorage.setItem('access_token', res.data.token);`,
    'no-jwt-in-storage',
  ],
  [`localStorage['refresh_token'] = t;`, 'no-jwt-in-storage'],
  [`window.sessionStorage?.setItem('jwt', t);`, 'no-jwt-in-storage'],
  [
    `localStorage.setItem('u', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig');`,
    'no-jwt-in-storage',
  ],
  [`localStorage.setItem('user_password', pw);`, 'no-sensitive-localstorage'],
  [`window.localStorage.setItem('api_key', k);`, 'no-sensitive-localstorage'],
  [`sessionStorage.setItem('ssn', v);`, 'no-sensitive-sessionstorage'],
  [
    `sessionStorage['setItem']('credit_card_number', n);`,
    'no-sensitive-sessionstorage',
  ],
  [`db.createObjectStore('password-vault');`, 'no-sensitive-indexeddb'],
  [
    `const store = tx.objectStore('vault'); store.put({ apiKey: k });`,
    'no-sensitive-indexeddb',
  ],
  [
    `const store = tx.objectStore('vault'); store.put({ access_token: t });`,
    'no-sensitive-indexeddb',
  ],
  [
    `const cache = await caches.open('v1'); await cache.put('/api/me/ssn', res);`,
    'no-sensitive-data-in-cache',
  ],
  [
    `caches.open('v1').then((c) => c.addAll(['/api/session/token']));`,
    'no-sensitive-data-in-cache',
  ],

  // --- the cookie pair ------------------------------------------------------
  [
    `document.cookie = 'access_token=abc; Secure; SameSite=Strict';`,
    'no-cookie-auth-tokens',
  ],
  [
    `document.cookie = 'sid=' + id + '; Secure; SameSite=Lax';`,
    'no-cookie-auth-tokens',
  ],
  [
    `document.cookie = \`session=\${s}; Secure; SameSite=Strict\`;`,
    'no-cookie-auth-tokens',
  ],
  [
    `document.cookie = 'api_key=' + key + '; Secure; SameSite=Lax';`,
    'no-sensitive-cookie-js',
  ],
  [
    `window.document.cookie = 'user_password=x; Secure; SameSite=Strict';`,
    'no-sensitive-cookie-js',
  ],
];

/** Shapes that must stay quiet across the whole group. */
const QUIET: readonly string[] = [
  `localStorage.setItem('article-author', name);`,
  `localStorage.setItem('tokenizer-config', cfg);`,
  `sessionStorage.setItem('spinner-visible', '1');`,
  `localStorage.setItem('tokenCount', '5');`,
  `cacheMap.set('creditLimit', 5000);`,
  `metrics.set('token_count', 42);`,
  `jobQueue.add({ credential: c });`,
  `document.cookie = 'lastAccessed=2026-01-01; Secure; SameSite=Lax';`,
  `document.cookie = 'author=jane; Secure; SameSite=Lax';`,
  `document.cookie = 'sid=; Max-Age=0';`,
  `const cache = await caches.open('v1'); await cache.addAll(['/shell.html']);`,
];

describe('storage & cookie partition matrix', () => {
  it.each(MATRIX)('%s → exactly one report, from its owner', (code, owner) => {
    expect(reportingRules(code)).toEqual([owner]);
  });

  it.each(QUIET)('%s → no rule in the group reports', (code) => {
    expect(reportingRules(code)).toEqual([]);
  });
});
