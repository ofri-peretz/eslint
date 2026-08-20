/**
 * VULNERABLE - the secret reaches the environment through one intermediate
 * `const`. A credential-refresh job re-publishes the rotated token into
 * process.env so already-loaded SDK clients pick it up on their next call.
 */
async function refreshServiceCredential(sts) {
  const grant = await sts.assumeRole({ RoleArn: process.env.ROLE_ARN });
  const value = grant.Credentials.SessionToken;
  process.env.AWS_SESSION_TOKEN = value;
}

module.exports = { refreshServiceCredential };
