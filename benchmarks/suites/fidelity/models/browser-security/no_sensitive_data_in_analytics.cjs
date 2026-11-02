const { tag } = require('../../lib.cjs');

const PROP = {
  Email: 'email: user.email',
  EmailShorthand: 'email',
  UserEmailCamel: 'userEmail: user.email',
  UserEmailSnake: 'user_email: user.email',
  UserEmailKebab: "'user-email': user.email",
  EmailsSent: 'emails_sent: stats.count',
  CreditCardCamel: 'creditCard: cardNumber',
  CreditCardSnake: 'credit_card: cardNumber',
  CardNumber: 'cardNumber',
  Ssn: 'ssn: user.ssn',
  Password: 'password: user.password',
  Phone: 'phone: user.phone',
  Phoneme: 'phoneme: lesson.sound',
  Address: 'address: user.address',
  Addressable: 'addressable: segment.ok',
  Dob: 'dob: user.dob',
  Page: "page: '/home'",
  LoyaltyTierCamel: 'loyaltyTier: user.tier',
  LoyaltyTierSnake: 'loyalty_tier: user.tier',
  LoyaltyTierKebabUpper: "'LOYALTY-TIER': user.tier",
};

module.exports = {
  domain: 120, // 20 keys x 3 sink spellings x 2 option values
  traces: 1500,
  rule: 'no-sensitive-data-in-analytics',
  key: (s) => `${tag(s.key)}|${tag(s.sink)}|custom=${s.custom}`,
  config: (s) =>
    s.custom
      ? {
          sensitiveFields: ['email', 'ssn', 'password', 'loyalty tier'].slice(
            3,
          ),
        }
      : undefined,
  code: (s) => {
    const call = {
      Track: 'analytics.track',
      WindowTrack: 'window.analytics.track',
      ComputedTrack: "analytics['track']",
    }[tag(s.sink)];
    return `declare const analytics: any;\ndeclare const user: any, stats: any, lesson: any, segment: any;\ndeclare const email: string, cardNumber: string;\n${call}('Event', { ${PROP[tag(s.key)]}, plan: 'pro' });\n`;
  },
  model: (s) => s.verdict,
};
