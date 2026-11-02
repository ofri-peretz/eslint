const { tag } = require('../../lib.cjs');

const CALL = {
  Track: "analytics.track('Item Purchased', { price: 9.99 })",
  Identify: "analytics.identify('user_123', { plan: 'pro' })",
  Gtag: "gtag('event', 'login')",
  Alias: "analytics.alias('user_123')",
};
const GUARD = {
  HasConsent: 'hasConsent',
  PrivacyOk: 'privacyOk',
  ConsentFn: 'getConsentStatus()',
  IsMobile: 'isMobile',
};

module.exports = {
  domain: 768, // 4 calls x 12 shapes x 4 guards x 2 x 2 options
  traces: 10000,
  rule: 'no-tracking-without-consent',
  key: (s) =>
    `${tag(s.call)}|${tag(s.shape)}|${tag(s.guard)}|custom=${s.custom}|methods=${s.methodsOpt}`,
  config: (s) => ({
    ...(s.custom ? { consentIdentifiers: ['privacyOk', 'cmpAccepted'] } : {}),
    analyticsMethods: s.methodsOpt
      ? ['track', 'identify', 'page', 'alias']
      : ['track', 'identify', 'page'],
  }),
  code: (s) => {
    const c = CALL[tag(s.call)];
    const g = GUARD[tag(s.guard)];
    const body = {
      NoGuard: `${c};`,
      IfPos: `if (${g}) {\n    ${c};\n  }`,
      IfNeg: `if (!${g}) {\n    ${c};\n  }`,
      ElseOfPos: `if (${g}) {\n    renderBanner();\n  } else {\n    ${c};\n  }`,
      TernaryPos: `${g} ? ${c} : console.log('skipped');`,
      TernaryNeg: `!${g} ? ${c} : console.log('skipped');`,
      TernaryElse: `${g} ? console.log('skipped') : ${c};`,
      AndPos: `${g} && ${c};`,
      AndNeg: `!${g} && ${c};`,
      OrPos: `${g} || ${c};`,
      EarlyReturnNeg: `if (!${g}) return;\n  ${c};`,
      EarlyReturnPos: `if (${g}) return;\n  ${c};`,
    }[tag(s.shape)];
    return [
      'declare const analytics: any;',
      'declare function gtag(...args: unknown[]): void;',
      'declare function renderBanner(): void;',
      'declare function getConsentStatus(): boolean;',
      'declare const hasConsent: boolean, privacyOk: boolean, isMobile: boolean;',
      `export function report() {\n  ${body}\n}`,
      '',
    ].join('\n');
  },
  model: (s) => s.verdict,
};
