/**
 * VULNERABLE (adversarial) - the environment written through Object.assign
 * rather than a member assignment. This is the idiomatic way to publish a batch
 * of resolved secrets, and it never forms an AssignmentExpression.
 */
async function loadSecretsIntoEnv(vault) {
  const resolved = await vault.readAll('app/prod');
  Object.assign(process.env, {
    DATABASE_PASSWORD: resolved.dbPassword,
    JWT_SIGNING_SECRET: resolved.jwtSecret,
  });
}

module.exports = { loadSecretsIntoEnv };
