/** SAFE - an explicit allowlist. */
const cors = require('cors');

const ALLOWED = ['https://app.example.com', 'https://admin.example.com'];

app.use(cors({ origin: ALLOWED, credentials: true }));
