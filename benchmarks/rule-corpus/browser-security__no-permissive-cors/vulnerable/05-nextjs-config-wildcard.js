/** VULNERABLE - Next.js declares CORS in config. No call to key on. */
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};
