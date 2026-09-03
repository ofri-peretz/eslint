/** SAFE - helmet sets Content-Security-Policy by default, so it IS the fix
 *  this rule's own message recommends. */
const helmet = require('helmet');

app.use(helmet());
app.get('/', (req, res) => res.render('index'));
