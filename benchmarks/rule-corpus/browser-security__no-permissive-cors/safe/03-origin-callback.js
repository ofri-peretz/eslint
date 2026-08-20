/** SAFE - an origin callback that validates against an allowlist before
 *  approving. This is the shape the cors package documents for dynamic
 *  origins, and it approves nothing it has not checked. */
const cors = require('cors');

const ALLOWED = new Set(['https://app.example.com']);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, origin !== undefined && ALLOWED.has(origin));
    },
  }),
);
