/** SAFE - the correct remediation: one named origin. */
const cors = require('cors');

app.use(cors({ origin: 'https://app.example.com', credentials: true }));
