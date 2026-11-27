/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-timing-unsafe-compare
 * Detects === comparison of secrets, suggest crypto.timingSafeEqual()
 * CWE-208: Observable Timing Discrepancy
 *
 * @see https://cwe.mitre.org/data/definitions/208.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  compileUserPatterns,
  unwrapTypeSyntax,
  propertyName,
  staticString,
  valueFollow,
  requestSource,
} from '@interlace/eslint-devkit';
import {
  bindingInit,
  constLiteralOf,
  findVariable,
  makeReadsTaintSource,
} from '../../utils/provenance';
import { identifierWords } from '../../utils/names';

type MessageIds = 'timingUnsafeCompare';

export interface Options {
  /**
   * Variable name patterns that indicate secrets. Default: ['token', 'secret',
   * 'password', 'hash', 'signature', 'mac', 'hmac', 'digest', 'apiKey',
   * 'api_key', …] — see DEFAULT_SECRET_PATTERNS for the full list.
   *
   * Note `key` is NOT a default; see the note on DEFAULT_SECRET_PATTERNS.
   */
  secretPatterns?: string[];

  /**
   * Identifier roots treated as attacker-controlled input.
   * Default: `['req', 'request', 'ctx', 'event']`.
   *
   * `process` is deliberately absent: in
   * `req.headers['x-sig'] === process.env.SIGNING_KEY` the env read is the
   * secret being protected, not the attacker's lever.
   */
  untrustedSources?: string[];

  /**
   * Report comparisons where no attacker-controlled operand could be found.
   * Default: `false`.
   *
   * `true` restores the pre-inversion behaviour — report on a secret-looking
   * NAME alone. Measured on an 8-repo corpus that produced 27 findings, none of
   * which were timing oracles, so it is off.
   */
  reportUnverifiedComparisons?: boolean;

  /**
   * Report a secret-named value compared against a string literal, in either
   * order: `password === 'mypass'`, `'mypass' === password`. Default: `false`.
   *
   * Off by default because a string comparand is usually a tag, not a secret —
   * `revokedToken === 'access'` (see {@link isSourceConstant}). `true` reports
   * on the name alone, without the attacker-controlled-operand check, which is
   * what `eslint-plugin-security`'s `detect-possible-timing-attacks` does and
   * what a drop-in for eslint-plugin-security pins (docs/intents/oxlint-plugin-security-drop-in).
   */
  reportLiteralComparands?: boolean;

  /**
   * Also check browser modules. Default: `false`.
   *
   * A timing oracle needs the comparison to run where the attacker can time it:
   * on a server answering their requests. A React, Vue, Svelte or Angular
   * module runs in the user's own browser, and `event.sessionId !==
   * selectedSessionId` in a socket handler there leaks nothing to anyone else.
   * 30 of the 82 reports on a 40-app corpus were browser code of this kind
   * (OpenWA's dashboard, Trilium's client, n8n's editor, Langfuse's sign-in
   * page), none of them an oracle. See {@link isBrowserModule} for what counts.
   */
  includeBrowserCode?: boolean;

  /**
   * Whole words whose presence in an identifier means a `secretPatterns` match
   * was a collision, not a secret. Default: `['author', 'authors', 'authored',
   * 'authoring', 'authorship', 'hashtag', 'hashtags', 'scheme', 'schemes']`.
   *
   * Split on identifier word boundaries, so `postAuthorId` is excluded and
   * `authorization` is not. REPLACES the default list — `[]` removes the guard
   * and lets `authorId` match `auth` again.
   */
  nonSecretWords?: string[];

  /**
   * Trailing words that make the value a measurement or a location rather than
   * a credential — `tokenCount` is a number, `authPath` is a route.
   *
   * The default list is `DEFAULT_NON_SECRET_TAILS`, and the schema's `default`
   * and `description` are both generated from it. It is not repeated here on
   * purpose: the previous copy went stale the day the location tails were
   * added, and a hand-maintained second copy of a list is a drift waiting to
   * happen. Consumers see the live list in the schema.
   *
   * Only the LAST word of the identifier is tested, so `tokenCount` is excluded
   * and `countToken` is not. REPLACES the default list.
   */
  nonSecretTails?: string[];
}

type RuleOptions = [Options?];

/** UI frameworks whose modules run in the browser. */
const BROWSER_FRAMEWORKS = new Set([
  'react',
  'react-dom',
  'react-native',
  'vue',
  'svelte',
  'preact',
  'solid-js',
  '@angular/core',
]);
/** Single-file components: the file only exists as a UI component. */
const COMPONENT_EXTENSION = /\.(?:vue|svelte)$/;
/**
 * JSX files. The extension alone proves nothing: a `.tsx` file can hold a
 * request handler or a Remix loader. It counts only when the file renders
 * JSX, which a component built with the automatic runtime does with no import.
 */
const JSX_EXTENSION = /\.(?:tsx|jsx)$/;
/**
 * Exports a framework runs on the server, whatever else the file renders:
 * Remix's `loader` and `action`, the Next.js pages-router data functions and
 * the app-router metadata functions. A request reaches them.
 */
const SERVER_ENTRY_EXPORTS = new Set([
  'loader',
  'action',
  'getServerSideProps',
  'getStaticProps',
  'getStaticPaths',
  'generateMetadata',
  'generateStaticParams',
]);
/**
 * A Next.js app-router file: a server component unless it says `'use client'`,
 * so rendering JSX or importing React proves nothing about where it runs.
 */
const NEXT_APP_ROUTER_FILE =
  /(?:^|[\\/])app[\\/](?:.*[\\/])?(?:page|layout|template|default|not-found|loading|route)\.[jt]sx?$/;

/**
 * Whether this module runs in the user's browser, where no remote attacker can
 * time a comparison.
 *
 * `'use server'` wins over everything: a Next.js server action in a `.tsx`
 * file runs on the server. Then `'use client'`, or a `.vue` or `.svelte` file.
 * A file that holds server code (a Remix `loader`, a Next.js data function or
 * app-router file, an inline `'use server'` action) is checked. Otherwise a
 * `.tsx` or `.jsx` file that renders JSX, or an import of a UI framework
 * (`react/jsx-runtime` and other subpaths count; type-only imports do not).
 */
export function isBrowserModule(
  program: TSESTree.Program,
  filename: string,
): boolean {
  const directives = new Set<string>();
  for (const statement of program.body) {
    if (statement.type !== AST_NODE_TYPES.ExpressionStatement) break;
    if (statement.directive === undefined) break;
    directives.add(statement.directive);
  }
  if (directives.has('use server')) return false;
  if (directives.has('use client')) return true;
  if (COMPONENT_EXTENSION.test(filename)) return true;
  if (holdsServerCode(program, filename)) return false;
  if (JSX_EXTENSION.test(filename) && rendersJsx(program)) return true;
  return program.body.some(
    (statement) =>
      statement.type === AST_NODE_TYPES.ImportDeclaration &&
      importsCode(statement) &&
      BROWSER_FRAMEWORKS.has(packageName(statement.source.value)),
  );
}

/**
 * Whether an import brings in the module's code. `import type { FC }` does
 * not, and neither does `import { type FC }`: the declaration there is a value
 * import, but every name it binds is a type. A side-effect import
 * (`import 'react'`) binds nothing and runs the module.
 */
function importsCode(statement: TSESTree.ImportDeclaration): boolean {
  if (statement.importKind === 'type') return false;
  if (statement.specifiers.length === 0) return true;
  return statement.specifiers.some(
    (specifier) =>
      specifier.type !== AST_NODE_TYPES.ImportSpecifier ||
      specifier.importKind !== 'type',
  );
}

/**
 * Whether a module that renders UI also holds code a request reaches: a
 * Remix route's `loader`, a Next.js data function, an app-router server
 * component, or an inline `'use server'` action. Rendering JSX in the same
 * file does not move that code to the browser.
 */
function holdsServerCode(program: TSESTree.Program, filename: string): boolean {
  if (NEXT_APP_ROUTER_FILE.test(filename)) return true;
  if (program.body.some(exportsServerEntry)) return true;
  return someNode(program, isServerAction);
}

function exportsServerEntry(statement: TSESTree.ProgramStatement): boolean {
  if (statement.type !== AST_NODE_TYPES.ExportNamedDeclaration) return false;
  const names: string[] = [];
  const declaration = statement.declaration;
  if (declaration?.type === AST_NODE_TYPES.FunctionDeclaration) {
    // An exported function declaration always has a name.
    names.push((declaration.id as TSESTree.Identifier).name);
  } else if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const declarator of declaration.declarations) {
      if (declarator.id.type === AST_NODE_TYPES.Identifier) {
        names.push(declarator.id.name);
      }
    }
  }
  for (const specifier of statement.specifiers) {
    if (specifier.exported.type === AST_NODE_TYPES.Identifier) {
      names.push(specifier.exported.name);
    }
  }
  return names.some((name) => SERVER_ENTRY_EXPORTS.has(name));
}

/** A function whose body opens with `'use server'`: a Next.js server action. */
function isServerAction(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression &&
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  if (node.body.type !== AST_NODE_TYPES.BlockStatement) return false;
  // The parser sets `directive` only on prologue statements.
  return node.body.body.some(
    (statement) =>
      statement.type === AST_NODE_TYPES.ExpressionStatement &&
      statement.directive === 'use server',
  );
}

/** Whether a JSX element or fragment appears anywhere under `root`. */
function rendersJsx(root: TSESTree.Node): boolean {
  return someNode(
    root,
    (node) =>
      node.type === AST_NODE_TYPES.JSXElement ||
      node.type === AST_NODE_TYPES.JSXFragment,
  );
}

/** Whether any node under `root`, `root` included, satisfies `test`. */
function someNode(
  root: TSESTree.Node,
  test: (node: TSESTree.Node) => boolean,
): boolean {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    if (typeof value !== 'object' || value === null) continue;
    const node = value as TSESTree.Node;
    if (test(node)) return true;
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'parent') stack.push(child);
    }
  }
  return false;
}

/** `@scope/name/sub` → `@scope/name`, `name/sub` → `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : (parts[0] as string);
}

/**
 * One `callerKnows` judgement: the bindings on the current path (a binding
 * that reads itself stops) and the ones already judged.
 */
interface KnowsWalk {
  path: Set<TSESLint.Scope.Variable>;
  memo: Map<TSESLint.Scope.Variable, boolean>;
}

/** Global functions whose result holds only their arguments. */
const PASS_THROUGH_FUNCTIONS: ReadonlySet<string> = new Set([
  'String',
  'encodeURIComponent',
  'encodeURI',
]);
/** `JSON.stringify(x)` and `Buffer.from(x)`: the same, through a namespace. */
const PASS_THROUGH_METHODS: ReadonlyMap<string, string> = new Map([
  ['JSON', 'stringify'],
  ['Buffer', 'from'],
]);

const DEFAULT_SECRET_PATTERNS = [
  // Common secret names (camelCase, snake_case, kebab-case)
  // `key` is deliberately absent. Substring-matched, it hits `key`, `firstKey`,
  // `keys` and every AST walker's `key === 'text'` — 88 findings on this repo,
  // none of them secrets. The names that DO mean a secret are listed in full
  // below (`apiKey`, `privateKey`, `encryptionKey`, …), and a project that
  // really does compare a bare `key` can add it via `secretPatterns`.
  'token',
  'secret',
  'password',
  'hash',
  'signature',
  'mac',
  'hmac',
  'digest',
  'apiKey',
  'api_key',
  'api-key',
  'auth',
  // `auth` is four letters and matches as a whole word only (see
  // SHORT_PATTERN_LENGTH), so the header it used to reach by substring is
  // named in full.
  'authorization',
  'credential',
  'bearer',
  'jwt',
  'csrf',
  'nonce',
  // PII and sensitive data patterns
  'ssn',
  'social_security',
  'social-security',
  'pii',
  'private_key',
  'private-key',
  'privateKey',
  'access_token',
  'access-token',
  'accessToken',
  'refresh_token',
  'refresh-token',
  'refreshToken',
  'session_id',
  'session-id',
  'sessionId',
  'auth_token',
  'auth-token',
  'authToken',
  // Compounds of the short `token`, spelled out so a lowercase identifier
  // (`config.apitoken`, `sessiontoken`) still matches: at six letters or more
  // they match anywhere, which a whole-word `token` cannot. No `_`/`-`
  // spellings: a separator is a word boundary, so `token` already matches
  // `api_token` and `x-session-token`.
  'apiToken',
  'sessionToken',
  'idToken',
  'csrfToken',
  'encryption_key',
  'encryption-key',
  'encryptionKey',
];

/**
 * Patterns shorter than this match only as whole words of the identifier.
 *
 * `token` sits inside `maxTokens`, a count of LLM tokens — the MCP TypeScript
 * SDK's CLI host compares `grantedMaxTokens === params.maxTokens` and was
 * reported as a timing oracle (`examples/cli-client/host/host.ts:397`).
 * `auth` sits inside `author`, `hash` inside `hashtag`. A word of six letters
 * or more inside another identifier IS the secret it names (`clientsecret`,
 * `hashedpassword`, `apikey`), so those keep matching anywhere. The same
 * threshold as `utils/names.ts#makeNameTest`.
 */
const SHORT_PATTERN_LENGTH = 6;

/**
 * Conditional-request headers. Their value is the entity tag the server put in
 * an `ETag` response header, which every client that fetched the resource
 * already holds: Wiki.js answers 304 when `req.headers['if-none-match'] ===
 * etag` (`backend/controllers/site.ts:87`), and the etag is a SHA-1 of the
 * asset, which is why it read as a crypto secret. Header names are
 * case-insensitive, so they are compared lower-cased.
 */
const CONDITIONAL_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  'if-none-match',
  'if-match',
]);

/** Header getters that take the header name: Fetch `get`, Express `get`/`header`. */
const HEADER_GETTERS: ReadonlySet<string> = new Set(['get', 'header']);

/** A pattern written as a plain word, not a regular expression. */
const PLAIN_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Is `index` a word boundary of `name`? The start and end, a separator on
 * either side, a lower-to-upper camelCase step (`max|Tokens`), and the last
 * capital of an acronym run before a lowercase letter (`JWT|Token`). The same
 * boundaries `identifierWords` splits on.
 */
function isWordBoundary(name: string, index: number): boolean {
  if (index <= 0 || index >= name.length) return true;
  const before = name[index - 1] as string;
  const at = name[index] as string;
  if (!/[A-Za-z0-9]/.test(before) || !/[A-Za-z0-9]/.test(at)) return true;
  if (/[a-z0-9]/.test(before) && /[A-Z]/.test(at)) return true;
  // `charAt` past the end is '', which no letter class matches.
  return (
    /[A-Z]/.test(before) &&
    /[A-Z]/.test(at) &&
    /[a-z]/.test(name.charAt(index + 1))
  );
}

/**
 * Does a plain-word pattern occur in `name`? A short one must start AND end on
 * a word boundary; a long one may sit anywhere. Case-insensitive, as the regex
 * form was — lowercasing ASCII keeps every index where it was.
 */
function containsWord(name: string, pattern: string): boolean {
  const haystack = name.toLowerCase();
  const needle = pattern.toLowerCase();
  if (needle.length >= SHORT_PATTERN_LENGTH) return haystack.includes(needle);
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    if (isWordBoundary(name, at) && isWordBoundary(name, at + needle.length))
      return true;
  }
  return false;
}

/**
 * Is this operand a constant that is already sitting in the source file?
 *
 * `token !== undefined`, `hash === null`, `signature.length === 0`,
 * `revokedToken === 'access'` — none of these can leak a secret, because there
 * is no secret on the other side of the comparison to leak. A timing attack
 * needs the comparison to leak how much of a *secret* matched byte by byte,
 * which requires the value being compared against to be one the attacker is
 * trying to discover.
 *
 * String literals WERE deliberately allowed through here, on the argument that
 * `password === 'default_password'` is a real finding. Measured against the
 * 8-repo corpus, that trade did not hold: string-literal comparisons were the
 * single largest false-positive source for this rule, and the archetype is
 * `okta/okta-auth-js` `lib/oidc/dpop.ts:185`:
 *
 * ```ts
 * function clearDPoPKeyPairAfterRevoke (revokedToken: 'access' | 'refresh', …) {
 *   if (revokedToken === 'access' && …)
 * ```
 *
 * `'access'` is a union-member tag, and `revokedToken` matched only because the
 * name contains `token`. The `password === 'default_password'` case that
 * motivated the old behaviour is a hardcoded credential — CWE-798, which
 * `secure-coding/no-hardcoded-credentials` reports. It is not CWE-208: a
 * constant-time comparison against a credential printed in the source protects
 * nothing. Reporting it here duplicated the other rule and cost far more in
 * noise than it bought.
 */
function isSourceConstant(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined')
    return true;
  if (node.type === AST_NODE_TYPES.Literal) return true;
  // `void 0` is how bundlers and minifiers spell `undefined`:
  // `meta?.progressToken === void 0` in firecrawl-mcp's dist/server.js is a
  // presence check, not a secret comparison. Any `void <expr>` is undefined.
  if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === 'void')
    return true;
  // A template literal with no interpolation is a string constant written out
  // longhand — `token === \`access\`` is the same finding as the quoted form.
  if (node.type === AST_NODE_TYPES.TemplateLiteral)
    return node.expressions.length === 0;
  return false;
}

/**
 * A string comparand — `'mypass'` or `\`mypass\``, not a number, `null` or a
 * regex. `staticString` reads both spellings of the same string.
 */
function isStringLiteral(node: TSESTree.Node): boolean {
  return staticString(node) !== null;
}

/**
 * Names that JavaScript convention reserves for booleans.
 *
 * `prevState.isAuthenticated === state.isAuthenticated` (`okta/okta-auth-js`
 * `lib/core/AuthStateManager.ts:44`) matched because `isAuthenticated` contains
 * `auth`. Comparing two booleans leaks one bit that the caller already has;
 * there is no secret to time. The `is`/`has`/`should`/… + capital form is the
 * one naming convention universal enough to read as a type annotation, so it is
 * the only one trusted here — no attempt is made to guess at other names.
 */
const BOOLEAN_PREDICATE_NAME = /^(?:is|has|should|can|did|was|will|does)[A-Z]/;

/**
 * SCREAMING_SNAKE_CASE — JavaScript's convention for a named constant.
 *
 * After the constant-operand and boolean-predicate guards landed, 73 of the 88
 * findings still standing on the corpus were comparisons against an enum
 * member: `name === IDX_STEP.SELECT_AUTHENTICATOR_AUTHENTICATE`,
 * `authenticatorKey === AUTHENTICATOR_KEY.WEBAUTHN`,
 * `err.name === Enums.AUTH_STOP_POLL_INITIATION_ERROR`. Every one matched only
 * because a constant's NAME contained `auth`, `password` or `token`.
 *
 * A named constant is a source constant reached through an identifier, so it
 * falls to the same argument as a string literal: the value is in the program,
 * not in the attacker's head.
 */
const NAMED_CONSTANT = /^[A-Z][A-Z0-9_]*$/;

/** How many `type A = B` hops a type annotation is followed through. */
const MAX_ALIAS_DEPTH = 4;

/**
 * Roots an attacker actually controls in a Node process.
 *
 * `process` is NOT here. A timing oracle needs the attacker on ONE side and the
 * secret on the other; `process.env.SIGNING_KEY` is the secret, and counting it
 * as untrusted would make both sides "untrusted" in the canonical webhook shape
 * and suppress the finding the rule exists for.
 */
const DEFAULT_UNTRUSTED_SOURCES = ['req', 'request', 'ctx', 'event'];

/**
 * Names that read as a namespace rather than a runtime value: `Enums`,
 * `ErrorCodes`, `AuthenticatorKey`, `IDX_STEP`, `AUTHENTICATOR_KEY`.
 *
 * PascalCase or SCREAMING_SNAKE_CASE. A camelCase object — `credentials`,
 * `secrets`, `config` — is an ordinary value that happens to be holding
 * something, and its properties prove nothing about constness.
 */
const NAMESPACE_NAME = /^(?:[A-Z][A-Z0-9_]*|[A-Z][a-zA-Z0-9]*)$/;

/**
 * Is this operand a member of a constant object — `AUTHENTICATOR_KEY.WEBAUTHN`,
 * `Enums.INVALID_TOKEN`, `ErrorCodes.INVALID_TOKEN_EXCEPTION`?
 *
 * BOTH halves must carry the convention: a namespace-cased object AND a
 * constant-cased property. Every one of the 73 corpus findings this guard
 * exists for satisfies both, and requiring both is what keeps it from
 * swallowing real secrets:
 *
 * - `userToken === credentials.API_TOKEN` — `credentials` is a camelCase
 *   runtime value, so `API_TOKEN` is a live secret, not an enum member.
 * - `userToken === secrets[API_TOKEN]` — computed, so `API_TOKEN` is a
 *   *variable holding* the key, and the property name is unknowable here.
 * - `userToken === process.env.API_TOKEN` and its `process['env']` spelling —
 *   the object is lowercase (or not an Identifier at all), so neither form is
 *   a namespace. This replaces an explicit `process.env` special case that
 *   only recognised dot notation and missed the bracket form.
 *
 * Deliberately MEMBER EXPRESSIONS ONLY. A bare SCREAMING_SNAKE identifier is
 * ambiguous in exactly the wrong direction: `API_KEY === expected` is a module
 * constant holding a real secret, and the existing fixture for it went green
 * the moment bare identifiers were accepted here.
 */
function isNamedConstant(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (node.object.type !== AST_NODE_TYPES.Identifier) return false;
  // An identifier key under `[]` is a VARIABLE, not a property name, and
  // `propertyName` returns null for exactly that — while resolving the quoted
  // form, which names the constant as plainly as the dotted one.
  const constant = propertyName(node);
  if (constant === null) return false;
  return NAMESPACE_NAME.test(node.object.name) && NAMED_CONSTANT.test(constant);
}

/**
 * Is an enum member's value written out in the source: no initialiser (the
 * member counts up), a literal, or a literal expression built from literals?
 *
 * A TypeScript `enum` may also hold a COMPUTED member, `Token = readPin()`,
 * and a value that comes out of a call is not written anywhere a reader can
 * see. Those members are not exempt.
 */
function isLiteralEnumInitializer(node: TSESTree.Node | undefined): boolean {
  if (node === undefined) return true;
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return true;
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.length === 0;
    case AST_NODE_TYPES.UnaryExpression:
      return isLiteralEnumInitializer(node.argument);
    case AST_NODE_TYPES.BinaryExpression:
      return (
        isLiteralEnumInitializer(node.left) &&
        isLiteralEnumInitializer(node.right)
      );
    default:
      return false;
  }
}

/** `as const`: the assertion that makes an object literal readonly literals. */
function isConstAssertion(node: TSESTree.Node | null | undefined): boolean {
  return (
    node?.type === AST_NODE_TYPES.TSAsExpression &&
    node.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
    node.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
    node.typeAnnotation.typeName.name === 'const'
  );
}

/**
 * The root identifier of a member chain — `a` in `a.b.c`, `a` in `a.b().c`.
 * Returns null for anything not rooted in a plain identifier (`this.x`,
 * `foo().bar`).
 */
function memberRoot(node: TSESTree.Node): TSESTree.Identifier | null {
  let current: TSESTree.Node = node;
  // Unwrap calls as well as property reads: the shape this exists for,
  // `token !== token.trim()`, is a CallExpression at the top, and stopping at
  // MemberExpression would never reach the receiver.
  for (;;) {
    if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
      continue;
    }
    if (current.type === AST_NODE_TYPES.CallExpression) {
      current = current.callee;
      continue;
    }
    break;
  }
  return current.type === AST_NODE_TYPES.Identifier ? current : null;
}

/** The value an assignment expression evaluates to: `a = b = v` is `v`. */
function assignedValue(node: TSESTree.AssignmentExpression): TSESTree.Node {
  let value: TSESTree.Node = node.right;
  while (value.type === AST_NODE_TYPES.AssignmentExpression)
    value = value.right;
  return value;
}

/**
 * Are both operands readings of the SAME value?
 *
 * `auth0/express-openid-connect` `lib/context.js:155`:
 *
 * ```js
 * if (token !== token.trim()) throw createError(400, '…whitespace');
 * ```
 *
 * There is only one value here, so there is no second value for a timing
 * oracle to reveal. The comparison is a formatting assertion, and its duration
 * tells an attacker only about the token they already sent.
 *
 * Requires one side to be a bare identifier and the other to be that same
 * identifier or a chain rooted at it, so two genuinely different values that
 * merely share a receiver (`a.expected !== a.actual`) are untouched.
 */
function isSelfComparison(left: TSESTree.Node, right: TSESTree.Node): boolean {
  const pair = (bare: TSESTree.Node, derived: TSESTree.Node): boolean => {
    if (bare.type !== AST_NODE_TYPES.Identifier) return false;
    // `token !== token` — the NaN idiom — is one value too.
    return memberRoot(derived)?.name === bare.name;
  };
  return pair(left, right) || pair(right, left);
}

/**
 * Names whose match against a secret pattern is a collision, not a secret.
 *
 * `window.location.hash` is the URL fragment. It matched `hash` — the digest
 * pattern — at `okta/okta-signin-widget` `src/v1/LoginRouter.ts:165`, where the
 * code compares the fragment to a container id. Nothing about a URL fragment is
 * secret; the browser puts it in the address bar.
 */
const NON_SECRET_MEMBERS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['hash', new Set(['location'])],
]);

/**
 * Whole WORDS whose presence means a secret pattern matched by collision.
 *
 * `authorId` matched `auth` — the substring trap the pattern list's own
 * comment warns about but cannot avoid, because `auth` genuinely has to match
 * `authorization`. The asymmetry that makes this fixable is that `author` is a
 * word and `authorization` is a different word: splitting the identifier
 * separates them, where a substring test cannot.
 *
 * An earlier version of this guard enumerated whole identifier SPELLINGS
 * (`authorid`, `macaddress`, …). The corpus broke it immediately with
 * `postAuthorId` and `promptTokenLimit`: an exact-spelling set only ever
 * matches the spellings it was handed. Words and tails generalise.
 *
 * WHY THIS IS AN OPTION AND NOT A CONSTANT
 *
 * `secretPatterns` — the vocabulary that says "this IS a secret" — has always
 * been the user's to set. This list, which says "…except when", was not, and
 * the asymmetry has a cost: a project that adds `key` back through
 * `secretPatterns` cannot then exclude the `keyring`/`keyboard` sense, and a
 * project whose domain is publishing genuinely has secrets with `author` in
 * the name. Both halves of an English-word vocabulary have to be tunable or
 * neither is.
 */
const DEFAULT_NON_SECRET_WORDS: readonly string[] = [
  'author',
  'authors',
  'authored',
  'authoring',
  'authorship',
  'hashtag',
  'hashtags',
  // The auth SCHEME is the public word before the credential in an
  // `Authorization` header — `Bearer`, `Basic`. `auth_scheme_lower ===
  // auth_params.scheme.toLowerCase()` (`passport-jwt` `lib/extract_jwt.js`)
  // matched `auth` and reported a comparison of two copies of that word. The
  // credential that follows it is named `token`, `value` or `credentials`.
  'scheme',
  'schemes',
];

/**
 * Trailing words that make the value a MEASUREMENT or a LOCATION.
 *
 * `tokenCount` is a quantity of LLM tokens; `promptTokenLimit` is a number on
 * the pricing page; `macAddress` is printed on the underside of the device.
 * None of them is a credential, and no credential in DEFAULT_SECRET_PATTERNS
 * is named after one of these either — `sessionId`, `authToken` and
 * `passwordHash` all end in something else.
 */
const DEFAULT_NON_SECRET_TAILS: readonly string[] = [
  'count',
  'counts',
  'limit',
  'limits',
  'usage',
  'total',
  'size',
  'length',
  'price',
  'cost',
  'quota',
  'address',
  'addresses',
  'index',
  'rank',
  'percent',
  // Locations. `address` was already here on this reasoning; these are the rest
  // of the same idea, and their absence is what made
  // `requestUrl.pathname !== STORE_AUTH_CALLBACK_PATH` a CWE-208 finding in
  // Shopify/cli's OAuth callback server (pinned corpus, 2026-08-20). The name
  // carries `auth` because it is part of an auth FLOW; the value is a route,
  // and a route is not a credential.
  //
  // `url` and `uri` are deliberately NOT here: a presigned URL carries its
  // signature in the query string and IS the credential, so `signatureUrl`
  // must keep reporting. (`signedUrl` would not have shown this — `signed` is
  // not among the secret patterns, only `signature` is.)
  'path',
  'paths',
  'pathname',
  'pathnames',
  'endpoint',
  'endpoints',
  'route',
  'routes',
  'hostname',
  'host',
  'port',
  'origin',
  // Shape, not content. `node.operatorToken.kind === SyntaxKind.EqualsToken`
  // is a TypeScript AST comparison inside a lint rule — flint-fyi/flint,
  // `packages/ts/src/rules/errorSubclassProperties.ts:56` — and it reported
  // because the identifier carries `token`. A `.kind`, `.type` or `.flags`
  // read is a discriminant an enum assigns, never a value an attacker guesses
  // a byte at a time.
  'kind',
  'kinds',
  'type',
  'types',
  'flag',
  'flags',
  'category',
  // A record's identifier, not the credential it identifies. Wiki.js deletes
  // an auth strategy unless `strategy.id === WIKI.data.systemIds.localAuthId`
  // (`backend/api/authentication.ts:1898`), and Trigger.dev checks that a
  // personal access token resolved to the same row with `result.tokenId ===
  // identity.tokenId` (`withMcpToolAuth.server.ts:132`): both names carry a
  // secret word and both values are database keys. A secret pattern that
  // itself ends in the tail keeps reporting, so `sessionId` — the cookie value
  // in express-session — is still a secret (see `endsInSecretCompound`).
  'id',
  'ids',
];

/**
 * Node crypto derivations. A value that came out of one of these is a secret
 * whatever it is spelled, which is the only evidence available when the
 * programmer named it `expected`.
 *
 * Closed API surface, exact names.
 *
 * DELIBERATELY NOT CONFIGURABLE — as are `RECEIVER_COMPARE_METHODS`,
 * `BINARY_EQUALITY_FUNCTIONS` and `SERVER_STATE_REQUEST_PROPERTIES` below. The
 * ledger's `unconfigurable-vocabulary` check flags all four; all four are false
 * alarms, and the distinction from `nonSecretWords` / `nonSecretTails` — which
 * WERE made configurable — is exactly the one the check description draws.
 *
 * These four name APIs, not concepts:
 *
 * - `CRYPTO_DERIVATIONS` — `node:crypto`'s digest/sign/derive functions.
 * - `RECEIVER_COMPARE_METHODS` — `Buffer`/`String` comparison methods that
 *   short-circuit on the first differing byte.
 * - `BINARY_EQUALITY_FUNCTIONS` — the deep-equality helpers (lodash,
 *   `fast-deep-equal`, `node:assert`) that do the same thing under a name.
 * - `SERVER_STATE_REQUEST_PROPERTIES` — the documented Express / Koa
 *   properties that hold SERVER state rather than the caller's input.
 *
 * Each of them makes the rule see MORE, not less: three prove a value is a
 * secret or a comparison is a memcmp, and the fourth is what stops
 * `req.body._csrf !== req.session.csrfToken` — the canonical double-submit
 * check, and a real timing oracle — from being dismissed because both operands
 * hang off `req`. Handing a consumer the power to shorten any of them is
 * handing them the power to silence the rule on the shapes it exists to find,
 * which is why the option surface stops at the two vocabularies that decide a
 * report from a SPELLING.
 */
const CRYPTO_DERIVATIONS: ReadonlySet<string> = new Set([
  'createHmac',
  'createHash',
  'createSign',
  'pbkdf2Sync',
  'scryptSync',
  'hkdfSync',
  'digest',
  'sign',
  'hmac',
]);

/**
 * Calls a plain digest chain may carry without adding an input:
 * `createHash('sha256').update(body).digest('hex').toLowerCase()`.
 */
const DIGEST_CHAIN_METHODS: ReadonlySet<string | null> = new Set<string | null>(
  ['digest', 'toString', 'toLowerCase', 'toUpperCase'],
);

/** `String.prototype` cuts that return part of the receiver and add nothing. */
const TRUNCATING_METHODS: ReadonlySet<string> = new Set([
  'slice',
  'substring',
  'substr',
]);

/**
 * Comparison APIs that are memcmp wearing a method name.
 *
 * `buf.equals(other)` and `Buffer.compare(a, b)` return at the first differing
 * byte — Node's own crypto documentation says so, and is why timingSafeEqual
 * exists. `startsWith` is worse than equality rather than better: it leaks the
 * same per-byte timing AND accepts anything with the right head.
 */
const RECEIVER_COMPARE_METHODS: ReadonlySet<string> = new Set([
  'equals',
  'startsWith',
  'endsWith',
  'localeCompare',
]);

/**
 * Deep-equality helpers, called with the two values as the FIRST two arguments.
 * A third is a customizer or an options bag — `isEqualWith(a, b, fn)` always
 * has one, and `deepEqual(a, b, { strict: true })` often does — so the count
 * is a floor, not an exact match.
 */
const BINARY_EQUALITY_FUNCTIONS: ReadonlySet<string> = new Set([
  'isEqual',
  'isEqualWith',
  'deepEqual',
  'fastDeepEqual',
  'shallowEqual',
]);

/**
 * Request properties that hold SERVER state rather than the current request.
 *
 * `req.session` is what express-session rehydrated from its store;
 * `req.user` is what passport put there after verifying a credential;
 * `res.locals` and `req.app.locals` are the application's own.
 *
 * Everything else under `req` is the caller's. The distinction matters because
 * the canonical double-submit CSRF check puts both operands under `req`:
 *
 * ```js
 * if (req.body._csrf !== req.session.csrfToken) …
 * ```
 *
 * A model that classifies by the ROOT identifier sees one `req` on each side
 * and concludes there is no attacker, which is backwards — that comparison is
 * exactly the timing oracle this rule exists to find. Documented Express /
 * Koa surface, exact names.
 */
const SERVER_STATE_REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'session',
  'user',
  'locals',
  'app',
  'state',
]);

/**
 * Module specifiers that export the `process` object, so
 * `import process from 'node:process'` reads the same `env` the global does.
 * Exact names, deliberately not configurable.
 */
const PROCESS_MODULES: ReadonlySet<string> = new Set([
  'process',
  'node:process',
]);

/**
 * Roots a configuration object is conventionally imported as. A read off one of
 * these is a configured value only when the root is an import or a `require`
 * (see `isImportedBinding`), so a local variable that happens to be called
 * `config` proves nothing. Exact names, deliberately not configurable.
 */
const CONFIG_ROOTS: ReadonlySet<string> = new Set([
  'config',
  'conf',
  'settings',
  'secrets',
]);

/**
 * Array methods whose callback receives an ELEMENT of the receiver as its first
 * parameter, so the parameter holds whatever the receiver's elements hold.
 *
 * `req.user.sessions.find((session) => session.id === current.sessionId)`:
 * `session` is one of the rows passport attached to `req.user`, which is server
 * state exactly as `req.user.sessions` is. Closed API surface of
 * `Array.prototype`, exact names, deliberately not configurable (see
 * `CRYPTO_DERIVATIONS` for why vocabulary that names an API is not an option).
 */
const ELEMENT_CALLBACK_METHODS: ReadonlySet<string> = new Set([
  'find',
  'filter',
  'some',
  'every',
  'findIndex',
]);

/**
 * `a?.b` parses to a MemberExpression wrapped in a ChainExpression. Without
 * this unwrap every operand written with optional chaining — ordinary modern
 * Node — was neither a secret nor a constant nor a self-comparison, and the
 * rule fell silent on it.
 */
function unwrapChain(node: TSESTree.Node): TSESTree.Node {
  return node.type === AST_NODE_TYPES.ChainExpression
    ? (node.expression as TSESTree.Node)
    : node;
}

/**
 * The property name a member expression reads, for both spellings.
 *
 * `creds['apiKey']` is the same property as `creds.apiKey` — the name is a
 * string literal sitting in the source. Reading only the Identifier form made
 * bracket access an evasion.
 */
function memberPropertyName(node: TSESTree.MemberExpression): string | null {
  // `propertyName` reads `o.k`, `o['k']` and `` o[`k`] `` alike. A `#private`
  // name is a name the author chose too: `this.#apiToken` holds what
  // `this.apiToken` would, so it is read here rather than dropped as null.
  const { property } = node;
  return property.type === AST_NODE_TYPES.PrivateIdentifier
    ? property.name
    : propertyName(node);
}

/** Is this member expression a known false-friend of a secret name? */
function isNonSecretMember(node: TSESTree.MemberExpression): boolean {
  // Named `member`, not `propertyName`: a local of that name shadows the
  // imported helper, and the shadow only surfaces once something below tries
  // to CALL it.
  const member = memberPropertyName(node);
  if (member === null) return false;
  const receivers = NON_SECRET_MEMBERS.get(member.toLowerCase());
  if (!receivers) return false;
  const owner = node.object;
  const ownerName =
    owner.type === AST_NODE_TYPES.Identifier
      ? owner.name
      : owner.type === AST_NODE_TYPES.MemberExpression
        ? (propertyName(owner) ?? '')
        : '';
  return receivers.has(ownerName.toLowerCase());
}

/**
 * Is this member read one of the request's SERVER-state slots, taken directly
 * off the request root: `req.session`, `req.user`, `ctx.state`, `res.locals`,
 * `req.app.locals`? Only the slot itself — what hangs below it is judged by the
 * caller, and a same-named field deeper in the chain (`req.query.state`,
 * `req.body.user`) is not the slot.
 */
function isRequestStateRead(node: TSESTree.MemberExpression): boolean {
  const slot = memberPropertyName(node);
  if (slot === null || !SERVER_STATE_REQUEST_PROPERTIES.has(slot)) return false;
  const owner = unwrapChain(node.object);
  if (owner.type === AST_NODE_TYPES.Identifier) return true;
  // `req.app.locals`: the slot below another slot.
  return (
    owner.type === AST_NODE_TYPES.MemberExpression &&
    owner.object.type === AST_NODE_TYPES.Identifier &&
    SERVER_STATE_REQUEST_PROPERTIES.has(memberPropertyName(owner) ?? '')
  );
}

export const noTimingUnsafeCompare = createRule<RuleOptions, MessageIds>({
  name: 'no-timing-unsafe-compare',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-timing-unsafe-compare.md',
      description: 'Disallow timing-unsafe comparison of secrets',
      cwe: 'CWE-208',
      cvss: 5.9,
    },
    messages: {
      timingUnsafeCompare: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing-unsafe comparison',
        cwe: 'CWE-208',
        description:
          'Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret.',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual() for constant-time comparison',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          secretPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SECRET_PATTERNS,
            description: 'Variable name patterns that indicate secrets',
          },
          untrustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_UNTRUSTED_SOURCES,
            description:
              'Identifier roots treated as attacker-controlled (default: req, request, ctx, event)',
          },
          reportUnverifiedComparisons: {
            type: 'boolean',
            default: false,
            description:
              'Report on a secret-looking name alone, without an attacker-controlled operand. Restores the pre-inversion behaviour.',
          },
          includeBrowserCode: {
            type: 'boolean',
            default: false,
            description:
              "Also check browser modules ('use client', .vue/.svelte files, .tsx/.jsx files that render JSX, or modules importing react, vue, svelte, preact, solid-js or @angular/core). A file that also holds server code (a Remix loader or action, a Next.js data function or app-router file, an inline 'use server' action) is always checked. Off by default: a comparison in the user's own browser is not a remote timing oracle.",
          },
          reportLiteralComparands: {
            type: 'boolean',
            default: false,
            description:
              "Report a secret-named value compared against a string literal (password === 'mypass'), in either order, on the name alone. Off by default because string comparands are usually tags (revokedToken === 'access').",
          },
          nonSecretWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_NON_SECRET_WORDS],
            description: `Whole words that mean a secretPatterns match was a collision (default: ${DEFAULT_NON_SECRET_WORDS.join(', ')}). Replaces the list.`,
          },
          nonSecretTails: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_NON_SECRET_TAILS],
            // Generated from the constant rather than typed out. The literal
            // that used to sit here listed neither the plurals nor the location
            // tails, because it was written before them.
            description: `Trailing words that make the value a measurement or location rather than a credential (default: ${DEFAULT_NON_SECRET_TAILS.join(', ')}). Replaces the list.`,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      secretPatterns: DEFAULT_SECRET_PATTERNS,
      nonSecretWords: [...DEFAULT_NON_SECRET_WORDS],
      nonSecretTails: [...DEFAULT_NON_SECRET_TAILS],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let secretPatterns: string[];
    let untrustedSources: string[];
    let reportUnverifiedComparisons: boolean;
    let reportLiteralComparands: boolean;
    let includeBrowserCode: boolean;
    /** The file is browser code and `includeBrowserCode` is off. */
    let skipFile: boolean;
    let nonSecretWords: string[];
    let nonSecretTails: string[];
    let nonSecretWordSet: ReadonlySet<string>;
    let nonSecretTailSet: ReadonlySet<string>;
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let readsUntrusted: (node: TSESTree.Node) => boolean;
    /** Patterns written as plain words, lower-cased — see `containsWord`. */
    let wordPatterns: string[];
    /** Anything else a user configured: their regex, their semantics. */
    let patterns: ReturnType<typeof compileUserPatterns>;

    /**
     * Does a secret pattern ending in this tail name the identifier?
     * `sessionId` is a configured secret that happens to end in `id`; the tail
     * exempts `tokenId`, not a pattern that spells the tail out.
     */
    function endsInSecretCompound(name: string, tail: string): boolean {
      return wordPatterns.some(
        (pattern) =>
          identifierWords(pattern).at(-1) === tail &&
          containsWord(name, pattern),
      );
    }

    function nameLooksSecret(name: string): boolean {
      if (BOOLEAN_PREDICATE_NAME.test(name)) return false;
      const words = identifierWords(name);
      if (
        words.length > 0 &&
        nonSecretTailSet.has(words[words.length - 1] as string) &&
        !endsInSecretCompound(name, words[words.length - 1] as string)
      ) {
        return false;
      }
      const matchesPattern = (haystack: string) =>
        wordPatterns.some((word) => containsWord(haystack, word)) ||
        patterns.some((p) => p.test(haystack));

      const nonSecretWordsPresent = words.filter((word) =>
        nonSecretWordSet.has(word),
      );
      if (nonSecretWordsPresent.length === 0) return matchesPattern(name);

      // `scheme`/`schemes` names the public word before the credential in an
      // `Authorization` header (`auth_scheme_lower === auth_params.scheme`,
      // #1685's own fix) and masks only the `auth` pattern it pairs with —
      // every other DEFAULT_NON_SECRET_WORDS entry is a pure substring
      // collision (`author` swallowing `auth`, `hashtag` swallowing `hash`)
      // and safely masks the whole name. Without this split, `scheme`
      // blanket-masked an UNRELATED secret word elsewhere in the same
      // identifier too: `schemeToken === req.headers.x` went unreported
      // because `scheme` was present, even though `token` names a real
      // credential (#1685).
      const onlySchemeWords = nonSecretWordsPresent.every(
        (word) => word === 'scheme' || word === 'schemes',
      );
      if (!onlySchemeWords) return false;
      return matchesPattern(words.filter((word) => word !== 'auth').join(' '));
    }

    /**
     * Is this value the output of a Node crypto derivation?
     *
     * `createHmac(secret, …).update(body).digest('hex')` is a secret whatever
     * the programmer called it. Resolving the shape rather than reading the
     * name is what recovers the finding in
     *
     * ```js
     * const v = req.headers['x-sig'];
     * const expected = createHmac('sha256', SECRET).update(raw).digest('hex');
     * if (v === expected) { … }
     * ```
     *
     * where a name-only rule sees two ordinary locals and stays quiet.
     */
    function isCryptoDerivation(node: TSESTree.Node): boolean {
      const bare = unwrapTypeSyntax(node);
      if (bare !== node) return isCryptoDerivation(bare);
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return CRYPTO_DERIVATIONS.has(callee.name);
      }
      if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed)
        return false;
      // A `#private` method is named by its author like a public one:
      // `this.#hmac(body)` derives what `this.hmac(body)` would.
      if (CRYPTO_DERIVATIONS.has(callee.property.name)) return true;
      // `pbkdf2Sync(…).toString('hex')` — the derivation is the receiver.
      return isCryptoDerivation(callee.object);
    }

    /** The same question, allowing one hop through a binding. */
    function isCryptoSecret(node: TSESTree.Node): boolean {
      // Through every single-write alias: `const expected = derived` is the
      // derivation `derived` holds.
      const bare = aliasedValue(node);
      const init =
        bare.type === AST_NODE_TYPES.Identifier
          ? bindingInit(sourceCode, bare)
          : node;
      if (init === undefined) return false;
      const unkeyed = unkeyedDigestInputs(unwrapTypeSyntax(init));
      if (unkeyed !== null) return hashesHiddenInput(unkeyed);
      return containsCryptoDerivation(init);
    }

    /**
     * Whether a plain digest hides anything: some input the caller does not
     * supply. A digest of the request alone is one the caller computes too.
     */
    function hashesHiddenInput(inputs: TSESTree.Node[]): boolean {
      // The request has to be in it somewhere, and every input has to be the
      // caller's: `.update('v1:').update(req.body)` is the caller's as much
      // as `.update('v1:' + req.body)`; `.update(req.body).update(pepper)`
      // is not.
      const readsRequest = inputs.some((input) =>
        digestOperands(input).some((operand) => readsUntrusted(operand)),
      );
      const walk: KnowsWalk = { path: new Set(), memo: new Map() };
      return (
        !readsRequest || !inputs.every((input) => callerKnows(input, walk))
      );
    }

    /**
     * Whether every part of this value is one the caller sent or can read.
     * Request taint alone is not enough: `const payload = req.body + pepper`
     * reads the request, and the `pepper` it adds is the server's. So a
     * binding written once is judged by what it was written with, and a call
     * only by its arguments, when it is one that adds nothing of its own:
     * `JSON.stringify`, `String`, `Buffer.from`, `encodeURIComponent`, or a
     * method on a value the caller knows (`req.rawBody.toString('utf8')`).
     */
    function callerKnows(node: TSESTree.Node, walk: KnowsWalk): boolean {
      const bare = unwrapTypeSyntax(node);
      switch (bare.type) {
        case AST_NODE_TYPES.Literal:
          return true;
        case AST_NODE_TYPES.TemplateLiteral:
          return bare.expressions.every((part) => callerKnows(part, walk));
        case AST_NODE_TYPES.BinaryExpression:
          return (
            callerKnows(bare.left as TSESTree.Node, walk) &&
            callerKnows(bare.right, walk)
          );
        case AST_NODE_TYPES.AwaitExpression:
          return callerKnows(bare.argument, walk);
        case AST_NODE_TYPES.MemberExpression:
          // `req.session.apiToken` reads through the request, but the
          // server put it there: the caller does not know it.
          return (
            readsUntrusted(bare) &&
            !isServerHeld(bare) &&
            (!bare.computed || callerKnows(bare.property, walk))
          );
        case AST_NODE_TYPES.Identifier:
          return callerKnowsBinding(bare, walk);
        case AST_NODE_TYPES.CallExpression:
          return (
            bare.arguments.every(
              (argument) =>
                argument.type !== AST_NODE_TYPES.SpreadElement &&
                callerKnows(argument, walk),
            ) && addsNothing(bare.callee, walk)
          );
        default:
          return false;
      }
    }

    /** A name: judged by its one write, or as a request root when unbound. */
    function callerKnowsBinding(
      node: TSESTree.Identifier,
      walk: KnowsWalk,
    ): boolean {
      if (isImportedRoot(node)) return false;
      const variable = findVariable(sourceCode, node);
      if (
        variable === null ||
        variable.defs.some((def) => def.type === 'Parameter')
      ) {
        return readsUntrusted(node);
      }
      const writes = variable.references.filter((ref) => ref.isWrite());
      const written = writes.length === 1 ? writes[0].writeExpr : null;
      if (written == null || walk.path.has(variable)) return false;
      const known = walk.memo.get(variable);
      if (known !== undefined) return known;
      // `path` holds the bindings being judged, so a binding that reads
      // itself stops; `memo` keeps `payload + payload` and a chain of
      // shared bindings from judging one twice.
      walk.path.add(variable);
      const knows = callerKnows(written, walk);
      walk.path.delete(variable);
      walk.memo.set(variable, knows);
      return knows;
    }

    /** The global, not a binding this file declares under the same name. */
    function isBuiltIn(node: TSESTree.Identifier): boolean {
      return (findVariable(sourceCode, node)?.defs.length ?? 0) === 0;
    }

    /** A callee that returns only what its arguments (and receiver) hold. */
    function addsNothing(
      callee: TSESTree.Expression,
      walk: KnowsWalk,
    ): boolean {
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return PASS_THROUGH_FUNCTIONS.has(callee.name) && isBuiltIn(callee);
      }
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const object = callee.object;
      if (
        object.type === AST_NODE_TYPES.Identifier &&
        PASS_THROUGH_METHODS.get(object.name) === propertyName(callee)
      ) {
        return isBuiltIn(object);
      }
      return callerKnows(object, walk);
    }

    /**
     * The leaves of a template literal or a binary expression; the node itself
     * otherwise. `+` is the join in practice, but any operator mixes both sides
     * into the input, so a server value on either side is hidden by the digest.
     */
    function digestOperands(node: TSESTree.Node): TSESTree.Node[] {
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return node.expressions.flatMap((expression) =>
          digestOperands(expression),
        );
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        return [
          ...digestOperands(node.left as TSESTree.Node),
          ...digestOperands(node.right),
        ];
      }
      return [node];
    }

    /**
     * A derivation reached through the string plumbing an HMAC check puts
     * around it — `` `sha256=${…digest('hex')}` ``, `'sha256=' + digest`.
     */
    function containsCryptoDerivation(node: TSESTree.Node): boolean {
      if (isCryptoDerivation(node)) return true;
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return node.expressions.some((expression) =>
          containsCryptoDerivation(expression),
        );
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        return (
          containsCryptoDerivation(node.left as TSESTree.Node) ||
          containsCryptoDerivation(node.right)
        );
      }
      return false;
    }

    /**
     * The inputs of an unkeyed digest chain —
     * `createHash('sha256').update(a).update(b).digest('hex')` gives `[a, b]` —
     * or `null` when the node is not one. `createHash` is the only derivation
     * in {@link CRYPTO_DERIVATIONS} that takes no secret, so it is the only one
     * whose output an attacker can reproduce.
     */
    function unkeyedDigestInputs(node: TSESTree.Node): TSESTree.Node[] | null {
      const inputs: TSESTree.Node[] = [];
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.CallExpression) {
        const callee = current.callee;
        // `createHash(…)` or `crypto.createHash(…)` starts the chain.
        if (callee.type === AST_NODE_TYPES.Identifier) {
          return callee.name === 'createHash' ? inputs : null;
        }
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
        const name = propertyName(callee);
        if (name === 'createHash') return inputs;
        if (name === 'update') {
          // `.update(data, 'utf8')`: the second argument is an encoding.
          if (current.arguments.length > 0) inputs.push(current.arguments[0]);
        } else if (!DIGEST_CHAIN_METHODS.has(name)) {
          // `.concat(SECRET)` and anything else this cannot read may add an
          // input the caller does not know: not a plain digest.
          return null;
        }
        current = callee.object;
      }
      return null;
    }

    /** Is this identifier bound by an `import` or a `require(...)` call? */
    function isImportedBinding(node: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, node);
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type === 'ImportBinding') return true;
      if (def.type !== 'Variable' || !def.node.init) return false;
      const init = unwrapChain(unwrapTypeSyntax(def.node.init));
      const call =
        init.type === AST_NODE_TYPES.MemberExpression
          ? unwrapChain(init.object)
          : init;
      return (
        call.type === AST_NODE_TYPES.CallExpression &&
        call.callee.type === AST_NODE_TYPES.Identifier &&
        call.callee.name === 'require'
      );
    }

    /**
     * Is this `process` the Node global (or `import process from 'node:process'`,
     * which is the same object), not a local that shadows it?
     */
    function isGlobalName(node: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, node);
      if (variable === null || variable.defs.length === 0) return true;
      const def = variable.defs[0];
      return (
        variable.defs.length === 1 &&
        def.type === 'ImportBinding' &&
        def.parent.type === AST_NODE_TYPES.ImportDeclaration &&
        PROCESS_MODULES.has(String(def.parent.source.value))
      );
    }

    /** `process.env`, with `process` the global. */
    function isProcessEnv(node: TSESTree.Node): boolean {
      const bare = unwrapChain(node);
      return (
        bare.type === AST_NODE_TYPES.MemberExpression &&
        memberPropertyName(bare) === 'env' &&
        bare.object.type === AST_NODE_TYPES.Identifier &&
        bare.object.name === 'process' &&
        isGlobalName(bare.object)
      );
    }

    /**
     * Does an environment variable's NAME say it holds a credential?
     *
     * The rule's vocabulary, plus `KEY`: a bare `key` is not a default secret
     * pattern (every AST walker has a `key`), but an environment variable named
     * `SERVICE_KEY` is a credential by convention. `PUBLIC` excludes the
     * variables a framework ships to the browser on purpose.
     */
    function envNameIsSecret(name: string): boolean {
      const words = identifierWords(name);
      if (words.includes('public')) return false;
      if (nameLooksSecret(name)) return true;
      if (!words.includes('key')) return false;
      return !(
        nonSecretTailSet.has(words[words.length - 1] as string) ||
        words.some((word) => nonSecretWordSet.has(word))
      );
    }

    /**
     * Is this operand PROVABLY a configured secret: a credential the process
     * was started with, not a value some caller handed it?
     *
     * - `process.env.API_SECRET`, `process['env'].SERVICE_KEY`, a variable that
     *   aliases one, or a name destructured from `process.env`, with `process`
     *   the global;
     * - `config.api.keySecret`, where `config` is an import or a `require`
     *   binding and the property is a secret name.
     *
     * `x || 'dev-default'` and `x ?? ''` are the same configured value.
     */
    function isConfiguredSecret(
      node: TSESTree.Node,
      // Aliases can loop (`let a = b; let b = a;`); the set only stops a cycle.
      visited: Set<TSESTree.Node> = new Set(),
    ): boolean {
      if (visited.has(node)) return false;
      visited.add(node);
      const bare = unwrapChain(unwrapTypeSyntax(node));
      if (bare.type === AST_NODE_TYPES.LogicalExpression) {
        return (
          bare.operator !== '&&' &&
          isConfiguredSecret(bare.left, visited) &&
          (isConfiguredSecret(bare.right, visited) ||
            isSourceConstant(bare.right))
        );
      }
      if (bare.type === AST_NODE_TYPES.Identifier) {
        const init = bindingInit(sourceCode, bare);
        if (init === undefined) return false;
        // `const { API_SECRET } = process.env`: the binding is the variable.
        if (isProcessEnv(init)) return envNameIsSecret(bare.name);
        return isConfiguredSecret(init, visited);
      }
      if (bare.type !== AST_NODE_TYPES.MemberExpression) return false;
      const name = memberPropertyName(bare);
      if (name === null) return false;
      if (isProcessEnv(bare.object)) return envNameIsSecret(name);
      let root: TSESTree.Node = bare;
      while (root.type === AST_NODE_TYPES.MemberExpression) {
        root = unwrapChain(root.object);
      }
      return (
        root.type === AST_NODE_TYPES.Identifier &&
        CONFIG_ROOTS.has(root.name) &&
        isImportedBinding(root) &&
        nameLooksSecret(name)
      );
    }

    /** Is this identifier a parameter of the function it is written in? */
    function isParameter(node: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, node);
      return (
        variable?.defs.length === 1 && variable.defs[0].type === 'Parameter'
      );
    }

    /**
     * Is this `this.field` assigned, somewhere in its class, from a parameter?
     * `this._authorization = authorization` in a constructor is how a value
     * handed in by a caller becomes state, and the comparison that reads the
     * field later has lost every trace of where it came from.
     */
    function isFieldFromParameter(node: TSESTree.MemberExpression): boolean {
      const field = memberPropertyName(node);
      if (field === null || node.object.type !== AST_NODE_TYPES.ThisExpression)
        return false;
      let owner: TSESTree.Node | undefined = node.parent;
      while (owner && owner.type !== AST_NODE_TYPES.ClassBody)
        owner = owner.parent;
      if (!owner) return false;
      let found = false;
      const visit = (current: TSESTree.Node | null | undefined): void => {
        if (found || !current || typeof current.type !== 'string') return;
        if (
          current.type === AST_NODE_TYPES.AssignmentExpression &&
          current.left.type === AST_NODE_TYPES.MemberExpression &&
          current.left.object.type === AST_NODE_TYPES.ThisExpression &&
          memberPropertyName(current.left) === field
        ) {
          const value = unwrapTypeSyntax(current.right);
          if (value.type === AST_NODE_TYPES.Identifier && isParameter(value)) {
            found = true;
            return;
          }
        }
        for (const [key, value] of Object.entries(
          current as unknown as Record<string, unknown>,
        )) {
          if (key === 'parent') continue;
          if (Array.isArray(value)) {
            for (const entry of value) visit(entry as TSESTree.Node);
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(owner);
      return found;
    }

    /**
     * Could this operand be what a caller supplied — the candidate being checked
     * against a stored secret?
     *
     * A name from the secret vocabulary (`token`, `authorization`), a parameter,
     * or a field a constructor filled from a parameter. A second configured value
     * is not: two configuration values compared on the operator's own machine are
     * nobody's timing oracle (`remoteApp.apiKey === localApp.client_id`).
     */
    function isSuppliedCandidate(node: TSESTree.Node): boolean {
      const bare = unwrapChain(unwrapTypeSyntax(node));
      if (isConfiguredSecret(bare)) return false;
      if (isSecretIdentifier(bare)) return true;
      if (bare.type === AST_NODE_TYPES.Identifier) return isParameter(bare);
      return (
        bare.type === AST_NODE_TYPES.MemberExpression &&
        isFieldFromParameter(bare)
      );
    }

    /**
     * A configured secret against a caller-supplied candidate, neither read off
     * a request.
     *
     * The rule needs an attacker on one side, and a request read is how it sees
     * one. A guard class gets its candidate through a constructor and the
     * request is two files away, so the candidate carries no trace of it. What
     * IS provable is the other side: a value read from the environment or from
     * an imported config object is the process's own secret, and comparing it
     * with anything a caller supplied is the oracle.
     *
     * Names alone are deliberately not enough. Two secret-named values
     * (`bearerToken === sessionSecret`) are pinned as silent by default in
     * `found-in-the-wild.test.ts`: nothing there says which one is stored.
     */
    function comparesStoredSecret(
      left: TSESTree.Node,
      right: TSESTree.Node,
    ): boolean {
      return (
        (isConfiguredSecret(left) && isSuppliedCandidate(right)) ||
        (isConfiguredSecret(right) && isSuppliedCandidate(left))
      );
    }

    /**
     * Is this value held by the server, with no attacker-steered byte in it?
     *
     * The strict sibling of {@link isServerDerived}, used for one purpose:
     * proving that NEITHER side of a comparison is the attacker's. Looser
     * evidence is fine for "one side is the server's" and wrong for "both are",
     * because a false answer here silences a finding. So it is narrower on
     * purpose:
     *
     * - `session`, `user`, `locals`, `app` and `state` count only as the member
     *   read DIRECTLY off the request root (`req.session`, `ctx.state`,
     *   `req.app.locals`). `req.query.state` and `req.body.user` are the
     *   caller's fields that happen to share a name.
     * - an `await` counts only when the awaited call is not a method of the
     *   request itself: `await getSession(req, res)` is a store read the
     *   request chose the row of, `await req.json()` is the attacker's body.
     * - a `&&`, `||`, `??` or `?:` is server-held only when every branch is.
     * - the first parameter of `find`/`filter`/`some`/`every`/`findIndex` is an
     *   element of the receiver, so it is server-held when the receiver is.
     *
     * Everything else, including a bare parameter, is unresolved, not safe.
     */
    function isServerHeld(
      node: TSESTree.Node,
      visited: Set<TSESTree.Node> = new Set(),
    ): boolean {
      if (visited.has(node)) return false;
      visited.add(node);
      const bare = unwrapChain(unwrapTypeSyntax(node));
      if (bare !== node) return isServerHeld(bare, visited);

      switch (node.type) {
        case AST_NODE_TYPES.AssignmentExpression:
          return isServerHeld(assignedValue(node), visited);
        case AST_NODE_TYPES.AwaitExpression: {
          const call = unwrapChain(unwrapTypeSyntax(node.argument));
          return (
            call.type === AST_NODE_TYPES.CallExpression &&
            !readsUntrusted(call.callee)
          );
        }
        case AST_NODE_TYPES.LogicalExpression:
          return (
            isServerHeld(node.left, visited) &&
            isServerHeld(node.right, visited)
          );
        case AST_NODE_TYPES.ConditionalExpression:
          return (
            isServerHeld(node.consequent, visited) &&
            isServerHeld(node.alternate, visited)
          );
        case AST_NODE_TYPES.MemberExpression: {
          if (isRequestStateRead(node)) return true;
          return isServerHeld(node.object, visited);
        }
        case AST_NODE_TYPES.Identifier: {
          const init = bindingInit(sourceCode, node);
          if (init !== undefined) return isServerHeld(init, visited);
          return isServerElement(node, visited);
        }
        default:
          return false;
      }
    }

    /**
     * Is this value an import itself: a bound name, or a chain of property
     * reads from one? A call is not, because its arguments can carry the
     * request (`Buffer.from(req.headers.token)` is rooted at `Buffer`).
     */
    function isImportedRoot(node: TSESTree.Node): boolean {
      let root: TSESTree.Node = unwrapChain(unwrapTypeSyntax(node));
      while (root.type === AST_NODE_TYPES.MemberExpression) {
        if (root.computed && root.property.type !== AST_NODE_TYPES.Literal) {
          return false;
        }
        root = unwrapChain(unwrapTypeSyntax(root.object));
      }
      if (root.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = findVariable(sourceCode, root);
      return (
        variable !== null &&
        variable.defs.length > 0 &&
        variable.defs.every((def) => def.type === 'ImportBinding')
      );
    }

    /**
     * Is this identifier the element parameter of `receiver.find(cb)` (or
     * `filter`, `some`, `every`, `findIndex`) over a server-held receiver?
     *
     * Resolved through the scope manager, not the spelling: the identifier must
     * be the first, plain parameter of the function literal that is the first
     * argument of the call, so a second parameter (the index), a destructured
     * one and a function passed by name all stay unresolved.
     */
    function isServerElement(
      node: TSESTree.Identifier,
      visited: Set<TSESTree.Node>,
    ): boolean {
      const variable = findVariable(sourceCode, node);
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type !== 'Parameter') return false;
      const fn = def.node;
      if (
        fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        fn.type !== AST_NODE_TYPES.FunctionExpression
      ) {
        return false;
      }
      if (fn.params[0] !== def.name) return false;
      const call = fn.parent;
      if (
        call.type !== AST_NODE_TYPES.CallExpression ||
        call.arguments[0] !== fn
      ) {
        return false;
      }
      const callee = unwrapChain(call.callee);
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = propertyName(callee);
      return (
        method !== null &&
        ELEMENT_CALLBACK_METHODS.has(method) &&
        isServerHeld(callee.object, visited)
      );
    }

    /**
     * Did this value come from the SERVER, whatever the request steered?
     *
     * The taint reader answers "is there visible flow from the request", and
     * that answer is `true` for both operands of the canonical webhook check —
     * because the expected signature is an HMAC **of the request body**. The
     * `exactly one side untrusted` gate then suppressed the single finding
     * this rule exists for. Measured on this corpus: 13.3% recall, with
     * `no-timing-unsafe-compare` silent on its own headline shape.
     *
     * The missing distinction is not "does the request reach it" but "did the
     * value cross a boundary the attacker is not on the other side of":
     *
     * - an `await` — the value came back from a store, and the request only
     *   chose which row
     * - a crypto derivation — the request went IN, but so did a server secret,
     *   and what came out is the thing being protected
     * - `process.env` — configuration, loaded at boot
     */
    function isServerDerived(
      node: TSESTree.Node,
      // The walk is one path (no branching), so one set serves it. It used to
      // be a depth cap of four, which dropped `req.session` five hops up an
      // alias chain and silenced the finding; the set only stops a cycle.
      visited: Set<TSESTree.Node> = new Set(),
    ): boolean {
      if (visited.has(node)) return false;
      visited.add(node);
      const bare = unwrapTypeSyntax(node);
      if (bare !== node) return isServerDerived(bare, visited);

      // `const stored = req.cache = await store.get()` holds what the store
      // returned, whatever slot it was also written to.
      if (node.type === AST_NODE_TYPES.AssignmentExpression) {
        return isServerDerived(assignedValue(node), visited);
      }
      if (node.type === AST_NODE_TYPES.AwaitExpression) return true;
      const unkeyed = unkeyedDigestInputs(node);
      // A plain digest takes no key: the caller can compute it from what they
      // sent. Unleash `edge-hmac-verifier.ts:58` compares the SHA-256 of the
      // request body with the `content-sha256` header the client sent — its
      // own input against its own input. It crossed a boundary only if
      // something it hashed did.
      if (unkeyed !== null) return hashesHiddenInput(unkeyed);
      if (containsCryptoDerivation(node)) return true;
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        // No `process.env` arm here on purpose: this function is only ever
        // consulted when BOTH operands read the request, and a `process.env`
        // read is never one of those — `process` is deliberately absent from
        // DEFAULT_UNTRUSTED_SOURCES. An arm for it would be unreachable code
        // wearing the appearance of a safeguard.
        const propertyName = memberPropertyName(node);
        if (
          propertyName !== null &&
          SERVER_STATE_REQUEST_PROPERTIES.has(propertyName)
        ) {
          return true;
        }
        return isServerDerived(node.object, visited);
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = bindingInit(sourceCode, node);
        if (init !== undefined && isServerDerived(init, visited)) return true;
        // `hash = await store.etagFor(id)` after the initializer: the binding
        // may hold what that wrote by the comparison.
        // The initializer is in `visited` by now, so its own write is not
        // walked twice.
        const variable = findVariable(sourceCode, node);
        return (
          variable !== null &&
          variable.references.some(
            (ref) =>
              ref.writeExpr != null && isServerDerived(ref.writeExpr, visited),
          )
        );
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = unwrapChain(node.callee);
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
        // `cache.getSync(req.params.id)` — the request chose WHICH row; the
        // value came out of `cache`. Not every store read is awaited, and
        // requiring an `await` made an in-process LRU an evasion. The receiver
        // is the evidence: if the attacker cannot steer the OBJECT the method
        // was called on, the result is the server's.
        return (
          !readsUntrusted(callee.object) ||
          isServerDerived(callee.object, visited)
        );
      }
      return false;
    }

    /**
     * Is this a read of an `If-None-Match` / `If-Match` request header —
     * `req.headers['if-none-match']`, `request.headers.get('If-None-Match')`,
     * `req.get('if-match')` — directly or through a `const` bound to one?
     */
    function readsConditionalHeader(
      node: TSESTree.Node,
      seen: ReadonlySet<TSESTree.Node> = new Set(),
    ): boolean {
      const bare = unwrapTypeSyntax(node);
      if (bare.type === AST_NODE_TYPES.Identifier) {
        // A binding written again after its initializer may hold anything
        // by the comparison, so only one written once is followed.
        const writes = findVariable(sourceCode, bare)?.references.filter(
          (ref) => ref.isWrite(),
        );
        if (writes?.length !== 1) return false;
        // `let a = b; let b = a` initialise each other; stop on the loop.
        const init = bindingInit(sourceCode, bare);
        return (
          init !== undefined &&
          !seen.has(init) &&
          readsConditionalHeader(init, new Set([...seen, init]))
        );
      }
      if (bare.type === AST_NODE_TYPES.MemberExpression) {
        const header = propertyName(bare);
        return (
          header !== null &&
          CONDITIONAL_REQUEST_HEADERS.has(header.toLowerCase()) &&
          bare.object.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(bare.object) === 'headers'
        );
      }
      if (
        bare.type === AST_NODE_TYPES.CallExpression &&
        bare.callee.type === AST_NODE_TYPES.MemberExpression
      ) {
        const header = staticString(bare.arguments[0]);
        // The getter must be the request's: `headers.get(…)` on a Fetch
        // `Headers`, or `req.get(…)` on the request itself. A `Map` of
        // submitted credentials has a `get` too.
        const receiver = bare.callee.object;
        return (
          header !== null &&
          CONDITIONAL_REQUEST_HEADERS.has(header.toLowerCase()) &&
          HEADER_GETTERS.has(propertyName(bare.callee) ?? '') &&
          ((receiver.type === AST_NODE_TYPES.MemberExpression &&
            propertyName(receiver) === 'headers') ||
            readsUntrusted(receiver))
        );
      }
      return false;
    }

    /**
     * Could this be the entity tag a conditional header is checked against?
     * A keyless digest of content under any name (`const hash =
     * createHash('sha1').update(body).digest('hex')`), which an etag usually
     * is, and otherwise anything neither named as a secret nor derived with
     * crypto: `const expected = createHmac(…).digest('hex')` is keyed, so it
     * is not an entity tag whatever it is called.
     */
    function isEntityTag(node: TSESTree.Node): boolean {
      return (
        isContentDigest(node) ||
        !(isSecretIdentifier(node) || isCryptoSecret(node))
      );
    }

    /**
     * The last alias in a chain of single-write bindings, whose initializer is
     * the value itself: `const expected = derived` with `const derived =
     * createHmac(…)` ends at `derived`. It stops at a binding written more
     * than once, and where a loop closes.
     */
    function aliasedValue(
      node: TSESTree.Node,
      seen: ReadonlySet<TSESTree.Node> = new Set(),
    ): TSESTree.Node {
      const bare = unwrapTypeSyntax(node);
      if (bare.type !== AST_NODE_TYPES.Identifier) return bare;
      const writes = findVariable(sourceCode, bare)?.references.filter((ref) =>
        ref.isWrite(),
      );
      const init = bindingInit(sourceCode, bare);
      if (writes?.length !== 1 || init === undefined || seen.has(init)) {
        return bare;
      }
      return unwrapTypeSyntax(init).type === AST_NODE_TYPES.Identifier
        ? aliasedValue(init, new Set([...seen, init]))
        : bare;
    }

    /**
     * A digest-result chain rooted in `createHash(…)` — `createHash(…)
     * .update(…).digest(…)` — quoted with string literals at most
     * (`'"' + digest + '"'`, `` `"${digest}"` ``), through single-write aliases, stopping on a
     * binding loop. Anything else concatenated in is not the digest.
     */
    function isContentDigest(
      node: TSESTree.Node,
      seen: ReadonlySet<TSESTree.Node> = new Set(),
    ): boolean {
      const bare = unwrapTypeSyntax(node);
      if (bare.type === AST_NODE_TYPES.Identifier) {
        const writes = findVariable(sourceCode, bare)?.references.filter(
          (ref) => ref.isWrite(),
        );
        if (writes?.length !== 1) return false;
        const init = bindingInit(sourceCode, bare);
        return (
          init !== undefined &&
          !seen.has(init) &&
          isContentDigest(init, new Set([...seen, init]))
        );
      }
      if (bare.type === AST_NODE_TYPES.BinaryExpression) {
        const operands = [bare.left, bare.right];
        return (
          bare.operator === '+' &&
          operands.some((operand) => isContentDigest(operand, seen)) &&
          operands.every(
            (operand) =>
              operand.type === AST_NODE_TYPES.Literal ||
              isContentDigest(operand, seen),
          )
        );
      }
      if (bare.type === AST_NODE_TYPES.TemplateLiteral) {
        // `"${digest}"`: the quasis are literal text, so only the
        // interpolations have to be the digest. One with none is a constant,
        // which holds no secret, so passing it is harmless.
        return bare.expressions.every((expression) =>
          isContentDigest(expression, seen),
        );
      }
      return isDigestChain(bare);
    }

    /** `createHash(…)`, then `.update(…)` calls, ending in `.digest(…)`. */
    function isDigestChain(start: TSESTree.Node): boolean {
      // `.digest('hex').slice(0, 32)` (Langfuse `elk-worker.ts:36`): a prefix
      // of a digest is as public as the digest. Only cuts by a literal count
      // qualify; one by a computed index is read as the call it is.
      let node: TSESTree.Node = start;
      while (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        TRUNCATING_METHODS.has(propertyName(node.callee) ?? '') &&
        node.arguments.every(
          (argument) => argument.type === AST_NODE_TYPES.Literal,
        )
      ) {
        node = node.callee.object;
      }
      if (
        node.type !== AST_NODE_TYPES.CallExpression ||
        node.callee.type !== AST_NODE_TYPES.MemberExpression ||
        propertyName(node.callee) !== 'digest'
      ) {
        return false;
      }
      let link: TSESTree.Node = node.callee.object;
      while (
        link.type === AST_NODE_TYPES.CallExpression &&
        link.callee.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(link.callee) === 'update'
      ) {
        link = link.callee.object;
      }
      if (link.type !== AST_NODE_TYPES.CallExpression) return false;
      const root = link.callee;
      return (
        (root.type === AST_NODE_TYPES.Identifier &&
          root.name === 'createHash') ||
        (root.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(root) === 'createHash')
      );
    }

    /**
     * Is this a read off a handler parameter the framework fills from the
     * request — NestJS `@Body()` / `@Query()` / `@Param()`, resolved through
     * the import? Docmost refuses to revoke the caller's own session with
     * `dto.sessionId === (req.raw as any).sessionId` (`session.controller.ts:
     * 49`): both sides are the caller's, but `dto` is a decorated parameter
     * the name-based reader cannot see, so only one side read as untrusted.
     */
    function readsPayloadParameter(
      node: TSESTree.Node,
      seen: ReadonlySet<unknown> = new Set(),
    ): boolean {
      let root = unwrapTypeSyntax(node);
      while (root.type === AST_NODE_TYPES.MemberExpression) {
        root = unwrapTypeSyntax(root.object);
      }
      if (root.type !== AST_NODE_TYPES.Identifier) return false;
      // Only a parameter carries a parameter decorator, so the declaration
      // itself is the test. A parameter is never written by its declaration,
      // so a later write replaced the payload: `dto = stored` makes it server
      // data, `dto = other` (another decorated parameter) keeps it the
      // caller's.
      const variable = findVariable(sourceCode, root);
      if (variable === null) return false;
      // Back on a parameter already being checked: the loop brings in nothing
      // the other writes do not.
      if (seen.has(variable)) return true;
      const [id] = variable.identifiers;
      const next = new Set([...seen, variable]);
      return (
        id !== undefined &&
        requestSource.hasPayloadDecorator(id, valueFollow.envOf(context)) &&
        variable.references.every(
          (ref) =>
            !ref.isWrite() ||
            (ref.writeExpr != null &&
              readsPayloadParameter(ref.writeExpr, next)),
        )
      );
    }

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return nameLooksSecret(node.name);
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        if (isNonSecretMember(node)) return false;
        const propertyName = memberPropertyName(node);
        if (propertyName !== null) {
          return nameLooksSecret(propertyName);
        }
      }
      return false;
    }

    /**
     * Is this operand a constant the source file already contains?
     *
     * Extends {@link isSourceConstant} by one hop through a `const` binding, so
     * a string written once and referred to by name is judged as the string it
     * is. `auth0/express-openid-connect` `lib/context.js:97` declares
     *
     * ```js
     * const SESSION_TRANSFER_TOKEN_IDENTIFIER = 'urn:ietf:params:oauth:token-type:session_transfer';
     * ```
     *
     * and two comparisons against it were reported purely because the constant's
     * NAME contains `token`. Resolving the binding — rather than trusting the
     * SCREAMING_SNAKE convention — is what keeps
     * `const API_KEY = process.env.API_KEY; API_KEY === supplied` reporting: an
     * env read is not a literal, so it does not qualify.
     */
    function isResolvedConstant(node: TSESTree.Node): boolean {
      if (isSourceConstant(node)) return true;
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        return isFollowedConstant(node) || isEnumMemberConstant(node);
      }
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      if (constLiteralOf(sourceCode, node) !== undefined) return true;
      return isFollowedConstant(node);
    }

    /**
     * A member of a TypeScript `enum` the project declares, in this file or in
     * a module it imports by a RELATIVE path:
     *
     * ```ts
     * // webhook-types.ts
     * export enum WebhookEvents { SecretModified = 'secret.modified' }
     * // webhook-fns.ts
     * if (event.type === WebhookEvents.SecretModified) { … }
     * ```
     *
     * Infisical `webhook-fns.ts:159` and Logto `actor-token.ts:20` were reported
     * because the enum MEMBER is spelled `SecretModified` / `AccessToken`. An
     * enum member is a value the declaration writes out, so the comparison is
     * against a constant exactly as `=== 'secret.modified'` is. The enum has to
     * be found and has to contain the member with a written-out value: an
     * import from a package or a path alias is never opened, and stays judged
     * by its spelling as before.
     */
    function isEnumMemberConstant(node: TSESTree.MemberExpression): boolean {
      const key = propertyName(node);
      if (key === null) return false;
      const found = valueFollow.enumMember(
        node.object,
        key,
        valueFollow.valueAt(node, valueFollow.envOf(context)),
      );
      return (
        found !== null && isLiteralEnumInitializer(found.member.initializer)
      );
    }

    /**
     * Is the value of this operand drawn from a set the source writes out?
     *
     * A name declared with a literal union or an `enum` type
     * (`kind: 'access' | 'refresh'`, `status: Status`) holds one of the listed
     * values, the same set a reader finds by reading the type.
     *
     * Only the annotation on the binding itself counts, and a name that is
     * merely imported does not: its type is not in this file to read.
     */
    function hasClosedDomain(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = findVariable(sourceCode, node);
      if (variable === null || variable.defs.length !== 1) return false;
      const declared = variable.defs[0].name as TSESTree.Identifier;
      const annotation = declared.typeAnnotation?.typeAnnotation;
      return annotation !== undefined && isClosedType(annotation, 0);
    }

    /** Is every value of this type written out: literals, `null`, an enum? */
    function isClosedType(type: TSESTree.TypeNode, depth: number): boolean {
      switch (type.type) {
        case AST_NODE_TYPES.TSLiteralType:
        case AST_NODE_TYPES.TSNullKeyword:
        case AST_NODE_TYPES.TSUndefinedKeyword:
          return true;
        case AST_NODE_TYPES.TSUnionType:
          return type.types.every((member) => isClosedType(member, depth));
        case AST_NODE_TYPES.TSTypeReference: {
          if (type.typeName.type !== AST_NODE_TYPES.Identifier) return false;
          const name = type.typeName;
          const def = valueFollow.lookup(name.name, sourceCode.getScope(name))
            ?.defs[0];
          if (def?.type === 'TSEnumName') return true;
          // `type Status = 'active' | 'pending'`, written in this file. Bounded:
          // an alias that names itself must not loop.
          if (def?.node.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
            return (
              depth < MAX_ALIAS_DEPTH &&
              isClosedType(def.node.typeAnnotation, depth + 1)
            );
          }
          // An enum imported by a relative path.
          return (
            valueFollow.follow(
              valueFollow.valueAt(name, valueFollow.envOf(context)),
            ).node.type === AST_NODE_TYPES.TSEnumDeclaration
          );
        }
        default:
          return false;
      }
    }

    /** Is this identifier a `const` bound to `{ … } as const` in this file? */
    function isConstAssertedObject(node: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, node);
      if (variable === null || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      return (
        def.type === 'Variable' &&
        def.parent.kind === 'const' &&
        isConstAssertion(def.node.init)
      );
    }

    /**
     * An imported name that is a literal where it is written:
     *
     * ```js
     * // events/index.js
     * export const API_TOKEN_DELETED = 'api-token-deleted';
     * // api-token-service.js
     * if (event.type === API_TOKEN_DELETED) { … }
     * ```
     *
     * Unleash `api-token-v2-service.ts:289` was reported because the event
     * name contains `token`. The binding is followed across relative imports
     * and read where it is declared; a value written there as anything but a
     * literal (`process.env.API_KEY`, a call) is not a constant and stays
     * reportable. A package or a path alias is out of reach and is judged as
     * before.
     */
    function isFollowedConstant(
      node: TSESTree.Identifier | TSESTree.MemberExpression,
    ): boolean {
      // `ROUTES.resetPassword`, with `ROUTES` an imported object of literals
      // (Ghost `server/auth/better-auth/routes.ts`): the import decides, and
      // the property is read where the object is written. The same holds for
      // an object this file declares `as const` — `Role.Admin` after
      // `const Role = { Admin: 'admin' } as const` — which TypeScript makes
      // readonly.
      let root: TSESTree.Node = node;
      while (root.type === AST_NODE_TYPES.MemberExpression) root = root.object;
      if (
        root.type !== AST_NODE_TYPES.Identifier ||
        !(isImportedBinding(root) || isConstAssertedObject(root))
      )
        return false;
      const landed = valueFollow.follow(
        valueFollow.valueAt(node, valueFollow.envOf(context)),
      );
      // An import that cannot be followed lands on itself, an identifier, so
      // only a literal written in the imported module passes.
      return isSourceConstant(landed.node) && !rewrittenLater(landed);
    }

    /**
     * Is the object property this literal initialises written again in its
     * module? `export const KEYS = { api: '' }; KEYS.api = process.env.KEY;`
     * declares a placeholder: the value compared at runtime is the env read.
     * Any member write, delete or `Object.assign` on the object counts.
     */
    function rewrittenLater(landed: valueFollow.Value): boolean {
      // Climb from the literal to the object that holds it. A value, unlike
      // a pattern, sits in a Property only inside an ObjectExpression.
      let property: TSESTree.Node = landed.node;
      while (property.parent?.type === AST_NODE_TYPES.Property) {
        property = property.parent.parent;
      }
      const declarator = property.parent;
      if (
        declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
        declarator.id.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      const variable = valueFollow.lookup(
        declarator.id.name,
        landed.env.scopeOf(declarator.id),
      );
      return (
        variable !== null &&
        variable.references.some((reference) =>
          mutatesObject(reference.identifier),
        )
      );
    }

    /** Is this read of an object the target of a write into it? */
    function mutatesObject(read: TSESTree.Node): boolean {
      let node = read;
      while (
        node.parent?.type === AST_NODE_TYPES.MemberExpression &&
        node.parent.object === node
      ) {
        node = node.parent;
      }
      const parent = node.parent;
      if (node === read) {
        // `Object.assign(KEYS, …)` writes into its first argument.
        return (
          parent?.type === AST_NODE_TYPES.CallExpression &&
          parent.arguments[0] === read &&
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(parent.callee) === 'assign'
        );
      }
      return (
        (parent?.type === AST_NODE_TYPES.AssignmentExpression &&
          parent.left === node) ||
        parent?.type === AST_NODE_TYPES.UpdateExpression ||
        (parent?.type === AST_NODE_TYPES.UnaryExpression &&
          parent.operator === 'delete')
      );
    }

    /** The function a callee identifier resolves to, if it is a local one. */
    function resolveLocalFunction(
      callee: TSESTree.Identifier,
    ): TSESTree.FunctionLike | null {
      const variable = findVariable(sourceCode, callee);
      if (!variable || variable.defs.length !== 1) return null;
      const def = variable.defs[0];
      if (def.type === 'FunctionName') return def.node as TSESTree.FunctionLike;
      if (def.type !== 'Variable') return null;
      const init = def.node.init;
      if (!init) return null;
      const bare = unwrapTypeSyntax(init);
      if (
        bare.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        bare.type === AST_NODE_TYPES.FunctionExpression
      ) {
        return bare as TSESTree.FunctionLike;
      }
      return null;
    }

    /** Is either side of this comparison a `.length` read? */
    function comparesLengths(node: TSESTree.BinaryExpression): boolean {
      const isLength = (operand: TSESTree.Node): boolean =>
        operand.type === AST_NODE_TYPES.MemberExpression &&
        memberPropertyName(operand) === 'length';
      return isLength(node.left as TSESTree.Node) || isLength(node.right);
    }

    /**
     * Is this a local function that decides equality with `===`?
     *
     * Two shapes, one predicate:
     *
     * ```js
     * const timingSafeEqual = (a, b) => a === b;        // the trusted NAME,
     *                                                   // the untrusted body
     * function constantTimeEquals(a, b) {               // the FAKE mitigation
     *   if (a.length !== b.length) return false;
     *   for (let i = 0; i < a.length; i++) {
     *     if (a.charCodeAt(i) !== b.charCodeAt(i)) return false;   // ← here
     *   }
     *   return true;
     * }
     * ```
     *
     * Both are found by the same question: does an equality operator anywhere
     * in the body compare values rooted at the function's two parameters? A
     * REAL constant-time implementation cannot answer yes — it accumulates
     * `diff |= a[i] ^ b[i]` and compares the accumulator to zero, never the
     * two inputs to each other. The `.length` guard is excluded because a
     * correct implementation needs it and the length of a digest is public.
     *
     * A fake mitigation is worse than no mitigation: the name and the comment
     * stop the next reader from looking.
     */
    function equalityWrapperParams(
      callee: TSESTree.Identifier,
    ): [number, number] | null {
      const fn = resolveLocalFunction(callee);
      if (!fn || fn.params.length < 2) return null;
      // Which parameter is which is answered by the body, not by position: the
      // corpus's `safeCompare(a, b, label)` emits a metric from a third
      // argument and is otherwise the same leak. Requiring exactly two
      // parameters made the extra argument an evasion.
      // Exact membership, keyed by the function's OWN parameter spellings —
      // there is no vocabulary here and nothing is matched by substring. A
      // Map rather than an array scan so that stays legible.
      const paramIndex = new Map<string, number>();
      fn.params.forEach((param, index) => {
        if (param.type === AST_NODE_TYPES.Identifier)
          paramIndex.set(param.name, index);
      });

      let found: [number, number] | null = null;
      const visit = (node: TSESTree.Node | null | undefined): void => {
        if (found || !node || typeof node.type !== 'string') return;
        if (node.type === AST_NODE_TYPES.BinaryExpression) {
          const isEquality =
            node.operator === '===' ||
            node.operator === '!==' ||
            node.operator === '==' ||
            node.operator === '!=';
          if (isEquality && !comparesLengths(node)) {
            const leftIndex = paramIndex.get(
              memberRoot(node.left as TSESTree.Node)?.name ?? '',
            );
            const rightIndex = paramIndex.get(
              memberRoot(node.right)?.name ?? '',
            );
            if (
              leftIndex !== undefined &&
              rightIndex !== undefined &&
              leftIndex !== rightIndex
            ) {
              found = [leftIndex, rightIndex];
              return;
            }
          }
        }
        for (const [key, value] of Object.entries(
          node as unknown as Record<string, unknown>,
        )) {
          // `parent` points back up the tree. Following it turns this walk
          // into an infinite loop — measured as a "Maximum call stack size
          // exceeded" crash on the very first fixture with a nested function.
          if (key === 'parent') continue;
          if (Array.isArray(value)) {
            for (const entry of value) visit(entry as TSESTree.Node);
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(fn.body as TSESTree.Node);
      return found;
    }

    /**
     * The two values a comparison API is comparing, or null when the call is
     * not one.
     *
     * `===` is not the only short-circuiting comparison a Node service reaches
     * for, and the alternatives are picked precisely BY the developer who knew
     * enough to convert the values to Buffers first.
     */
    function comparisonOperands(
      node: TSESTree.CallExpression,
    ): [TSESTree.Node, TSESTree.Node] | null {
      const args = node.arguments;
      if (
        args.some((argument) => argument.type === AST_NODE_TYPES.SpreadElement)
      ) {
        return null;
      }
      const callee = node.callee;

      if (callee.type === AST_NODE_TYPES.Identifier) {
        if (BINARY_EQUALITY_FUNCTIONS.has(callee.name) && args.length >= 2) {
          return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
        }
        const wrapped = equalityWrapperParams(callee);
        if (!wrapped) return null;
        const [leftIndex, rightIndex] = wrapped;
        const leftArg = args[leftIndex];
        const rightArg = args[rightIndex];
        if (!leftArg || !rightArg) return null;
        return [leftArg as TSESTree.Node, rightArg as TSESTree.Node];
      }

      if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
      // `presented['localeCompare'](stored)` compares the same two values in
      // the same non-constant time.
      const method = propertyName(callee);
      if (method === null) return null;

      // `Buffer.compare(a, b)` — the static form of `buf.equals`.
      if (
        method === 'compare' &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Buffer' &&
        args.length === 2
      ) {
        return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
      }

      // `_.isEqual(a, b)` — namespaced deep equality.
      if (BINARY_EQUALITY_FUNCTIONS.has(method) && args.length >= 2) {
        return [args[0] as TSESTree.Node, args[1] as TSESTree.Node];
      }

      // `buf.equals(other)`, `token.startsWith(prefix)`, `a.localeCompare(b)`.
      if (RECEIVER_COMPARE_METHODS.has(method) && args.length === 1) {
        return [callee.object, args[0] as TSESTree.Node];
      }

      return null;
    }

    function checkComparison(
      node: TSESTree.Node,
      rawLeft: TSESTree.Node,
      rawRight: TSESTree.Node,
    ) {
      // `a?.b` arrives wrapped in a ChainExpression. Unwrap once, here, so
      // every guard below sees the member expression it was written for.
      const left = unwrapChain(rawLeft);
      const right = unwrapChain(rawRight);

      // Opt-in: a secret-named value against a string literal reports on the
      // name alone. Checked before the constant guard below, which is what
      // skips the literal by default.
      if (reportLiteralComparands) {
        const literalLeft = isStringLiteral(left);
        if (literalLeft !== isStringLiteral(right)) {
          if (isSecretIdentifier(literalLeft ? right : left)) {
            context.report({ node, messageId: 'timingUnsafeCompare' });
            return;
          }
        }
      }

      // Comparing against a constant that is already in the source — a string,
      // a number, `null`, `undefined` — cannot leak a secret, because the value
      // being compared against is not one an attacker is trying to discover.

      if (isResolvedConstant(left) || isResolvedConstant(right)) {
        return;
      }

      // …or a value the source lists in full: a name typed with a literal
      // union or an enum.
      if (hasClosedDomain(left) || hasClosedDomain(right)) {
        return;
      }

      // …and neither can a constant reached through its name.
      if (isNamedConstant(left) || isNamedConstant(right)) {
        return;
      }

      // One value compared against a reading of itself is an assertion about
      // its format, not a check against a second value.
      if (isSelfComparison(left, right)) {
        return;
      }

      // A configured secret against a caller-supplied candidate needs no
      // request in sight (see `comparesStoredSecret`).
      if (comparesStoredSecret(left, right)) {
        context.report({ node, messageId: 'timingUnsafeCompare' });
        return;
      }

      // A conditional-request validator against the entity tag: the tag went
      // out in the `ETag` response header, so every client holds it, hash of
      // the content or not. Only the etag is exempt; the same header against
      // a value NAMED as a secret (`storedToken`) is still the caller timing
      // a credential.
      if (
        (readsConditionalHeader(left) && isEntityTag(right)) ||
        (readsConditionalHeader(right) && isEntityTag(left))
      ) {
        return;
      }

      // Check if either side looks like a secret. A crypto derivation counts
      // as a secret on evidence rather than on spelling, which is the only
      // thing available when both operands are named `v` and `expected`.
      const leftIsSecret = isSecretIdentifier(left) || isCryptoSecret(left);
      const rightIsSecret = isSecretIdentifier(right) || isCryptoSecret(right);

      if (leftIsSecret || rightIsSecret) {
        // A timing oracle needs an attacker on ONE side and a secret on the
        // other. Both conditions matter, and the rule used to check only the
        // second — which is why it reported `remoteApp.apiKey === localApp.
        // configuration.client_id` (Shopify/cli `app-context.ts:148`), two
        // config values a CLI compares on the developer's own machine, where
        // nobody is timing anything.
        //
        // `exactly one` is the test, not `at least one`. In
        // `okta/okta-auth-js` `routes/authenticator.js:187` both
        // `password` and `confirmPassword` are destructured from `req.body`:
        // the user is comparing their own input to their own input, and there
        // is no secret in the process for the timing to reveal.
        if (!reportUnverifiedComparisons) {
          // A value the server holds against another value the server holds
          // has no attacker on either side, however much of the request each
          // was looked up with: `req.session.csrfSecret` against the memo of
          // itself, an element of `req.user.sessions` against the current
          // session's id.
          if (isServerHeld(left) && isServerHeld(right)) return;
          const leftUntrusted = readsUntrusted(left);
          const rightUntrusted = readsUntrusted(right);
          if (leftUntrusted === rightUntrusted) {
            // Neither operand is attacker-readable: nothing is being timed.
            if (!leftUntrusted) return;
            // BOTH are, which is what the taint reader answers for the
            // canonical webhook check — the expected signature is an HMAC of
            // the request body, so the request reaches both sides. Ask the
            // second question instead: did either value cross a boundary the
            // attacker is not on the other side of? If neither did, this is
            // the user's own input against their own input.
            if (!isServerDerived(left) && !isServerDerived(right)) return;
          }
        }

        context.report({
          node,
          messageId: 'timingUnsafeCompare',
        });
      }
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      if (skipFile) return;
      // Check for === or == comparisons
      if (
        node.operator !== '===' &&
        node.operator !== '==' &&
        node.operator !== '!==' &&
        node.operator !== '!='
      ) {
        return;
      }
      checkComparison(node, node.left as TSESTree.Node, node.right);
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (skipFile) return;
      const operands = comparisonOperands(node);
      if (!operands) return;
      checkComparison(node, operands[0], operands[1]);
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        ({
          secretPatterns = DEFAULT_SECRET_PATTERNS,
          untrustedSources = DEFAULT_UNTRUSTED_SOURCES,
          reportUnverifiedComparisons = false,
          reportLiteralComparands = false,
          includeBrowserCode = false,
          nonSecretWords = [...DEFAULT_NON_SECRET_WORDS],
          nonSecretTails = [...DEFAULT_NON_SECRET_TAILS],
        } = options as Options);
        skipFile =
          !includeBrowserCode &&
          isBrowserModule(context.sourceCode.ast, context.filename);
        // Lower-cased once. `identifierWords` already lower-cases what it returns,
        // so a user who writes `['Author']` must still match `postAuthorId` — the
        // built-ins are lower-case and the option has to behave identically.
        nonSecretWordSet = new Set(
          nonSecretWords.map((word) => word.toLowerCase()),
        );
        nonSecretTailSet = new Set(
          nonSecretTails.map((word) => word.toLowerCase()),
        );
        sourceCode = context.sourceCode;
        const readsRequest = makeReadsTaintSource(
          sourceCode,
          new Set(untrustedSources.map((source) => source.toLowerCase())),
        );
        // `var cookieId = req.sessionID = getcookie(req, name)` binds the name
        // to an assignment, and an assignment EXPRESSION evaluates to the value
        // it assigned. The shared reader stops at it, so `cookieId` read as
        // not-from-the-request, and `cookieId !== req.sessionID` — one
        // client-held id against another copy of itself — looked like an
        // attacker input against a server secret (`expressjs/session`
        // `index.js:466`). Followed here, not in the shared reader, because
        // sixteen other rules read taint through it.
        //
        // The VALUE is read, never the destination: `const x = req.cache =
        // await store.get()` stores a server value in a request-looking slot,
        // and calling `x` a request read would hide a real comparison.
        // Only a binding written once counts, so a later write cannot make
        // the initializer a stale answer.
        readsUntrusted = (node) => {
          // An imported binding is a module's export, never the request this
          // handler is serving, whatever it is called. NestJS's injector
          // compares a provider's DI token with the imported `REQUEST` token
          // (`packages/core/injector/injector.ts:2044`), and the name alone
          // made `REQUEST` read as the request object.
          if (isImportedRoot(node)) return false;
          if (readsRequest(node)) return true;
          if (readsPayloadParameter(node)) return true;
          const bare = unwrapTypeSyntax(node);
          if (bare.type !== AST_NODE_TYPES.Identifier) return false;
          const variable = findVariable(sourceCode, bare);
          if (
            variable === null ||
            variable.references.filter((ref) => ref.isWrite()).length !== 1
          ) {
            return false;
          }
          const init = bindingInit(sourceCode, bare);
          return (
            init?.type === AST_NODE_TYPES.AssignmentExpression &&
            readsRequest(assignedValue(init))
          );
        };
        // A short pattern matches on word boundaries, a long one anywhere (see
        // SHORT_PATTERN_LENGTH). Plain anchoring was tried once and dropped
        // because it stopped `auth` matching `req.headers.authorization`; that
        // header is now a pattern of its own, and `token` still matches
        // `accessTokenValue` because `Token` sits between two boundaries there.
        //
        // Under the DEFAULT patterns `firstKey` never reaches the guard at all,
        // because `key` is not among them. The existence-check guard below is what
        // handles the same shape when a project adds `key` back through
        // `secretPatterns` — two separate mechanisms, not one.
        // Guarded: a user pattern reaches `new RegExp` here. Measured before this
        // change: `(a+)+$` took 45-58s on a single file, and `[` threw
        // "Invalid regular expression" out of create(), killing the whole lint
        // run rather than just this rule. compileUserPattern degrades both to a
        // substring match.
        //
        // A plain-word pattern — every default is one — is matched by
        // `containsWord` instead, so a short word has to be a whole word of
        // the identifier. Only a pattern with regex syntax in it reaches the
        // compiler, and it keeps the substring semantics its author wrote.
        wordPatterns = secretPatterns.filter((p) => PLAIN_PATTERN.test(p));
        patterns = compileUserPatterns(
          secretPatterns.filter((p) => !PLAIN_PATTERN.test(p)),
          'i',
        );
      },
      BinaryExpression: checkBinaryExpression,
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoTimingUnsafeCompareOptions };
