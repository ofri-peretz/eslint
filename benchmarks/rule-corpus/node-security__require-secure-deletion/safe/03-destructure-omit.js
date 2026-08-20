/**
 * SAFE - the secret is never copied into the outgoing object in the first
 * place. Rest destructuring builds a new object without the field, so there is
 * no deletion to be incomplete.
 */
function toPublicProfile(user) {
  const { password, refreshToken, ...publicProfile } = user;
  void password;
  void refreshToken;
  return publicProfile;
}

module.exports = { toPublicProfile };
