/**
 * The test-path gate, rule by rule.
 *
 * Twenty-two `recommended` rules exempt test files through an option
 * (`allowInTests` / `ignoreInTests`), each with its own default. Every gate is
 * one line — `if (allowInTests && isTestFile) return {}` or
 * `const isTestFile = allowInTests && isTestFilePath(…)` — and each rule's own
 * suite exercised it from at most one side, so mutation testing found the gate
 * and its default free to flip (`if (false)`, `= true` → `= false`) with
 * nothing going red.
 *
 * What pins a gate is a snippet the rule REPORTS in a source file, linted
 * again under a test path: silent there exactly when the gate is open. Both
 * settings of the option are checked, so the default and the gate are pinned
 * independently. Same shape as node-security's `src/test-path-gate.test.ts`.
 */
import parser from '@typescript-eslint/parser';
import { Linter, type Rule } from 'eslint';
import { describe, expect, it } from 'vitest';
import { rules } from './index';

interface Gate {
  option: 'allowInTests' | 'ignoreInTests';
  /** Is a test file exempt when the option is left at its default? */
  exemptByDefault: boolean;
  /** Reported in a source file. */
  code: string;
}

const allow = (exemptByDefault: boolean, code: string): Gate => ({
  option: 'allowInTests',
  exemptByDefault,
  code,
});

const GATES: Record<string, Gate> = {
  'no-innerhtml': allow(false, 'el.innerHTML = userInput;'),
  'no-eval': allow(false, 'eval(code);'),
  'require-postmessage-origin-check': allow(
    false,
    "window.addEventListener('message', (e) => { handle(e.data); });",
  ),
  'no-postmessage-wildcard-origin': allow(
    true,
    "window.parent.postMessage(data, '*');",
  ),
  'no-postmessage-innerhtml': allow(
    true,
    "window.addEventListener('message', (e) => { el.innerHTML = e.data; });",
  ),
  'no-sensitive-localstorage': allow(
    false,
    "localStorage.setItem('password', pw);",
  ),
  'no-jwt-in-storage': allow(true, "localStorage.setItem('jwt', token);"),
  'no-sensitive-sessionstorage': allow(
    true,
    "sessionStorage.setItem('password', pw);",
  ),
  'no-sensitive-indexeddb': allow(
    true,
    "const tx = db.transaction('users', 'readwrite'); tx.objectStore('users').put({ password: pw });",
  ),
  'no-sensitive-cookie-js': allow(true, "document.cookie = 'password=' + pw;"),
  'no-cookie-auth-tokens': allow(true, "document.cookie = 'token=' + t;"),
  'require-cookie-secure-attrs': allow(true, "document.cookie = 'theme=dark';"),
  'require-websocket-wss': allow(
    true,
    "new WebSocket('ws://api.acme-corp.io/socket');",
  ),
  'no-websocket-innerhtml': allow(
    true,
    'const ws = new WebSocket(u); ws.onmessage = (e) => { el.innerHTML = e.data; };',
  ),
  'no-websocket-eval': allow(
    true,
    'const ws = new WebSocket(u); ws.onmessage = (e) => { eval(e.data); };',
  ),
  'no-filereader-innerhtml': allow(
    true,
    'const reader = new FileReader(); reader.onload = (e) => { el.innerHTML = e.target.result; };',
  ),
  'require-blob-url-revocation': allow(
    true,
    'const url = URL.createObjectURL(blob);',
  ),
  'no-dynamic-service-worker-url': allow(
    true,
    'navigator.serviceWorker.register(url);',
  ),
  'no-worker-message-innerhtml': allow(
    true,
    "const worker = new Worker('w.js'); worker.onmessage = (e) => { el.innerHTML = e.data; };",
  ),
  'no-unsafe-inline-csp': allow(
    true,
    `const csp = "script-src 'self' 'unsafe-inline'";`,
  ),
  'no-unsafe-eval-csp': allow(true, `const csp = "script-src 'unsafe-eval'";`),
  'no-insecure-redirects': {
    option: 'ignoreInTests',
    exemptByDefault: true,
    code: "window.location.href = new URLSearchParams(location.search).get('next');",
  },
};

const SOURCE = 'src/app.ts';
const TEST = 'src/app.test.ts';

function lint(name: string, filename: string, options?: object): number {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    GATES[name].code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser, sourceType: 'module' },
        plugins: {
          gate: {
            rules: {
              rule: rules[
                name as keyof typeof rules
              ] as unknown as Rule.RuleModule,
            },
          },
        },
        rules: { 'gate/rule': options ? ['error', options] : 'error' },
      },
    ],
    filename,
  ).length;
}

describe.each(Object.keys(GATES))('%s test-path gate', (name) => {
  const gate = GATES[name];
  // A rule may report a line more than once (a cookie missing both
  // `Secure` and `SameSite`); what matters is the same count on every
  // side the gate does not close.
  const reported = () => lint(name, SOURCE);

  it('reports the snippet in a source file', () => {
    expect(reported()).toBeGreaterThan(0);
  });

  it('a test file is exempt by default exactly when the default says so', () => {
    expect(lint(name, TEST)).toBe(gate.exemptByDefault ? 0 : reported());
  });

  it('turning the option on exempts a test file', () => {
    expect(lint(name, TEST, { [gate.option]: true })).toBe(0);
  });

  it('turning the option off reports in a test file', () => {
    expect(lint(name, TEST, { [gate.option]: false })).toBe(reported());
  });

  it('the option never exempts a source file', () => {
    expect(lint(name, SOURCE, { [gate.option]: true })).toBe(reported());
  });
});
