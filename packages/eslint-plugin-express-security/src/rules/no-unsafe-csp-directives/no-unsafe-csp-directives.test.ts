import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeCspDirectives } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unsafe-csp-directives', () => {
  ruleTester.run('no-unsafe-csp-directives', noUnsafeCspDirectives, {
    valid: [
      // THE safe pattern — self-only sources, explicit frame-ancestors
      {
        code: `
          app.use(
            helmet({
              contentSecurityPolicy: {
                useDefaults: false,
                directives: {
                  defaultSrc: ["'self'"],
                  scriptSrc: ["'self'"],
                  frameAncestors: ["'self'"],
                },
              },
            }),
          );
        `,
      },
      // helmet defaults kept — frame-ancestors comes from useDefaults
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'"] } } }));`,
      },
      { code: `app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { scriptSrc: ["'self'"] } } }));` },
      // Header spelling of the directive keys
      {
        code: `app.use(helmet.contentSecurityPolicy({ directives: { 'script-src': ["'self'"], 'frame-ancestors': ["'none'"] } }));`,
      },
      // unsafe-inline in style-src, explicitly opted out of
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { styleSrc: ["'self'", "'unsafe-inline'"] } } }));`,
        options: [{ checkStyleSrc: false }],
      },
      // Directives we do not police
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { imgSrc: ['*'], fontSrc: ['data:'] } } }));`,
      },
      // upgrade-insecure-requests kept (empty array is the "enabled" spelling)
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: [] } } }));`,
      },
      // Non-analysable shapes
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: allowedScriptSources } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: [nonceSource] } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: [, "'self'"] } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: [1] } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { ...base } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { [key]: ['*'] } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { ...cspConfig } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { useDefaults: flag, directives: { scriptSrc: ["'self'"] } } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: cspConfig }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: true }));` },
      { code: `app.use(helmet.contentSecurityPolicy());` },
      { code: `app.use(helmet({ ...defaults }));` },
      { code: `app.use(helmet({ noSniff: true }));` },
      { code: `app.use(helmet(cspConfig));` },
      { code: `app.use(helmet());` },
      // Not helmet
      { code: `app.use(csp({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(helmet.hsts({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(other.contentSecurityPolicy({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(helmet[dynamic]({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(helmet['contentSecurityPolicy']({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(getHelmet().contentSecurityPolicy({ directives: { scriptSrc: ["'unsafe-inline'"] } }));` },
      { code: `app.use(helmet({ contentSecurityPolicy: { directives: { 1: ['*'] } } }));` },
    ],
    invalid: [
      // 'unsafe-inline' in script-src — the SonarJS S5728 case
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'", "'unsafe-inline'"] } } }));`,
        errors: [
          {
            messageId: 'unsafeInlineSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'"] } } }));`,
              },
            ],
          },
        ],
      },
      // 'unsafe-eval' first in the list — trailing-comma removal
      {
        code: `app.use(helmet.contentSecurityPolicy({ directives: { scriptSrc: ["'unsafe-eval'", "'self'"] } }));`,
        errors: [
          {
            messageId: 'unsafeInlineSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet.contentSecurityPolicy({ directives: { scriptSrc: [ "'self'"] } }));`,
              },
            ],
          },
        ],
      },
      // Sole source — plain removal
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'unsafe-inline'"] } } }));`,
        errors: [
          {
            messageId: 'unsafeInlineSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: [] } } }));`,
              },
            ],
          },
        ],
      },
      // Style directives are checked by default
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { styleSrc: ["'self'", "'unsafe-inline'"] } } }));`,
        errors: [
          {
            messageId: 'unsafeInlineSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { styleSrc: ["'self'"] } } }));`,
              },
            ],
          },
        ],
      },
      // Wildcard script source
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ['*'] } } }));`,
        errors: [
          {
            messageId: 'wildcardSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: [] } } }));`,
              },
            ],
          },
        ],
      },
      // data: in object-src
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { 'object-src': ["'none'", 'data:'] } } }));`,
        errors: [
          {
            messageId: 'wildcardSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { 'object-src': ["'none'"] } } }));`,
              },
            ],
          },
        ],
      },
      // https: scheme wildcard in worker-src
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { workerSrc: ['https:'] } } }));`,
        errors: [
          {
            messageId: 'wildcardSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { directives: { workerSrc: [] } } }));`,
              },
            ],
          },
        ],
      },
      // frame-ancestors wide open — the SonarJS S5732 case
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { frameAncestors: ['*'] } } }));`,
        errors: [{ messageId: 'permissiveFrameAncestors' as const }],
      },
      // frame-ancestors absent while helmet's defaults are off
      {
        code: `app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'self'"] } } }));`,
        errors: [{ messageId: 'missingFrameAncestors' as const }],
      },
      // Mixed-content upgrade dropped — the SonarJS S5730 case
      {
        code: `app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));`,
        errors: [{ messageId: 'mixedContentAllowed' as const }],
      },
      // Several weaknesses in one policy
      {
        code: `app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: { scriptSrc: ["'unsafe-inline'", '*'] } } }));`,
        errors: [
          { messageId: 'missingFrameAncestors' as const },
          {
            messageId: 'unsafeInlineSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: { scriptSrc: [ '*'] } } }));`,
              },
            ],
          },
          {
            messageId: 'wildcardSource' as const,
            suggestions: [
              {
                messageId: 'removeUnsafeSource' as const,
                output: `app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: { scriptSrc: ["'unsafe-inline'"] } } }));`,
              },
            ],
          },
        ],
      },
    ],
  });
});
