/**
 * VULNERABLE - console.* runs its first argument through util.format the moment
 * a second argument follows. A `%s` inside the user's message consumes the next
 * value, so the webhook secret is printed into the log line the attacker
 * shaped.
 */
function logWebhookFailure(req, config) {
  console.error(req.body.message, config.webhookSecret);
}

module.exports = { logWebhookFailure };
