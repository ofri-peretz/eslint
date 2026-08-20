/** VULNERABLE - the cors package with the wildcard spelled out. */
const cors = require('cors');

app.use(cors({ origin: '*' }));
