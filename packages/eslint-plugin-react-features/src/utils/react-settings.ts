/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `settings.react`, read the way eslint-plugin-react reads it, so a shared
 * config written for that plugin keeps its meaning here.
 *
 * | key            | meaning                                                  |
 * | -------------- | -------------------------------------------------------- |
 * | `pragma`       | the JSX factory binding (`React`); `@jsx Foo` wins       |
 * | `fragment`     | the fragment binding (`Fragment`)                        |
 * | `createClass`  | the `createReactClass` factory name                      |
 * | `version`      | `'16.3'`, `'18.2.0'` or `'detect'`                       |
 * | `defaultVersion` | what `'detect'` falls back to when React is not installed |
 *
 * `version: 'detect'` resolves the installed `react` from the linted file's
 * directory. It uses `context.filename` and `context.cwd`: the pre-v9
 * `context.getFilename()` that eslint-plugin-react calls does not exist on
 * ESLint 10, which is why that plugin cannot run there. When `react` is not
 * installed the version falls back instead of throwing.
 *
 * Call these from `before` or a visitor, never from `createOnce`'s own body:
 * the context's file-scoped members are not readable there.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { TSESLint } from '@interlace/eslint-devkit';

type Context = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;

/** `[major, minor, patch]` */
export type Version = readonly [number, number, number];

/** What an unconfigured plugin assumes: the newest React there will ever be. */
const LATEST: Version = [999, 999, 999];
const JSX_ANNOTATION = /@jsx\s+([^\s]+)/;
const JS_IDENTIFIER = /^[_$a-zA-Z][_$a-zA-Z0-9]*$/;

interface ReactSettings {
  pragma?: unknown;
  fragment?: unknown;
  createClass?: unknown;
  version?: unknown;
  defaultVersion?: unknown;
  runtime?: unknown;
}

function reactSettings(context: Context): ReactSettings {
  const react = (context.settings as { react?: unknown } | undefined)?.react;
  return react && typeof react === 'object' ? (react as ReactSettings) : {};
}

/** The binding JSX compiles to: `@jsx Foo.bar` comment, else `settings.react.pragma`, else `React`. */
export function getPragma(context: Context): string {
  let pragma = 'React';
  const annotated = context.sourceCode
    .getAllComments()
    .find((comment) => JSX_ANNOTATION.test(comment.value));
  if (annotated) {
    pragma = (JSX_ANNOTATION.exec(annotated.value) as RegExpExecArray)[1].split(
      '.',
    )[0];
  } else {
    const configured = reactSettings(context).pragma;
    if (typeof configured === 'string' && configured) pragma = configured;
  }
  return JS_IDENTIFIER.test(pragma) ? pragma : 'React';
}

/**
 * The JSX runtime: `settings.react.runtime`, read the way eslint-plugin-react
 * reads it (`'automatic'` or `'classic'`, default `'classic'`). The automatic
 * runtime (React 17+, `@jsxRuntime automatic` or a bundler/framework default
 * like Next.js' `"jsx": "react-jsx"`) compiles JSX to its own import and
 * needs no `React` binding in scope — unlike a file-level `@jsxRuntime`
 * comment, this is a project-wide default a config sets once, so every
 * JSX file does not need its own pragma comment (#1550).
 */
export function getJsxRuntime(context: Context): 'classic' | 'automatic' {
  return reactSettings(context).runtime === 'automatic'
    ? 'automatic'
    : 'classic';
}

/** The fragment binding: `settings.react.fragment`, else `Fragment`. */
export function getFragmentPragma(context: Context): string {
  const configured = reactSettings(context).fragment;
  return typeof configured === 'string' && JS_IDENTIFIER.test(configured)
    ? configured
    : 'Fragment';
}

/** The `createReactClass` factory name: `settings.react.createClass`, else `createReactClass`. */
export function getCreateClassPragma(context: Context): string {
  const configured = reactSettings(context).createClass;
  return typeof configured === 'string' && JS_IDENTIFIER.test(configured)
    ? configured
    : 'createReactClass';
}

/** `'16.3'`, `'16.3.0'`, `'v16.3.0-rc.1'` and `'>16.3.0'` to `[16, 3, 0]` (the first version in the text, as `semver.coerce` reads it); `null` when there is none. */
export function parseVersion(text: string): Version | null {
  const m = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(text);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

function compare(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

const detected = new Map<string, Version | null>();

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function baseDirectory(context: Context): string {
  const filename = context.filename;
  if (filename && path.isAbsolute(filename)) {
    // A virtual file (`/repo/App.js/0_foo.js`) is a path under a real directory;
    // the filesystem root is one, so the climb ends.
    let dir = path.dirname(filename);
    while (!isDirectory(dir)) dir = path.dirname(dir);
    return dir;
  }
  return context.cwd || process.cwd();
}

/** The installed `react`'s version, resolved from the file's directory; `null` if there is none. */
function detectInstalled(context: Context): Version | null {
  const base = baseDirectory(context);
  if (detected.has(base)) return detected.get(base) ?? null;
  let version: Version | null = null;
  try {
    const manifest = createRequire(path.join(base, 'noop.js')).resolve(
      'react/package.json',
    );
    const raw = JSON.parse(fs.readFileSync(manifest, 'utf8')) as {
      version?: unknown;
    };
    version =
      typeof raw.version === 'string' ? parseVersion(raw.version) : null;
  } catch {
    version = null;
  }
  detected.set(base, version);
  return version;
}

/** The configured React version; the newest one when nothing is configured. */
export function getReactVersion(context: Context): Version {
  const settings = reactSettings(context);
  const fallback =
    typeof settings.defaultVersion === 'string'
      ? (parseVersion(settings.defaultVersion) ?? LATEST)
      : LATEST;
  const configured = settings.version;
  if (configured === 'detect') return detectInstalled(context) ?? fallback;
  if (typeof configured === 'string') {
    return parseVersion(configured) ?? fallback;
  }
  return fallback;
}

/** Is the configured React version at least `minimum` (`'16.3.0'`)? */
export function reactVersionAtLeast(
  context: Context,
  minimum: string,
): boolean {
  const min = parseVersion(minimum);
  return min !== null && compare(getReactVersion(context), min) >= 0;
}

/** Is the configured React version older than `limit`? */
export function reactVersionBelow(context: Context, limit: string): boolean {
  const max = parseVersion(limit);
  return max !== null && compare(getReactVersion(context), max) < 0;
}
