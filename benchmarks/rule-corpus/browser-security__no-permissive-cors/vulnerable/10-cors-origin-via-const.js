/** VULNERABLE - ADVERSARIAL. The cors package's origin reached through a
 *  config constant, the shape any multi-environment setup produces. */
const CORS_CONFIG = { origin: '*', credentials: false };

app.use(cors(CORS_CONFIG));
