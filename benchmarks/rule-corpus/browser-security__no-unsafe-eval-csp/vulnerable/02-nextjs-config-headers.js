/** VULNERABLE - Next.js ships its CSP from next.config.js. The policy is a
 *  `value` field nested two objects deep inside an array; nothing about it is
 *  an assignment or a call the rule can key on. */
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          },
        ],
      },
    ];
  },
};
