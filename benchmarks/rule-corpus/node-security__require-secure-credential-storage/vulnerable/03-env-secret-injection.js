/**
 * VULNERABLE - a CLI bootstrap pulls the Stripe secret out of Vault and pushes
 * it into process.env so that downstream libraries pick it up. Every child
 * process the CLI spawns now inherits it, it is readable at /proc/<pid>/environ,
 * and crash reporters ship process.env upstream verbatim.
 */
const vault = require('./vault');

async function bootstrap() {
  const secret = await vault.read('stripe/live');
  process.env.STRIPE_SECRET_KEY = secret;
  return require('./server').start();
}

module.exports = { bootstrap };
