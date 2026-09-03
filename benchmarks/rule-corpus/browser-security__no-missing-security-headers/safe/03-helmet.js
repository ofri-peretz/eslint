/** SAFE - helmet sets all three by default. It IS the fix this rule's message
 *  recommends. */
const helmet = require('helmet');

app.use(helmet());
app.get('/', (req, res) => res.render('index'));
