/**
 * VULNERABLE - the reset token is assigned onto an existing model instance.
 *
 * ORM/ActiveRecord idiom: mutate the loaded row, then save. No declarator is
 * involved, so the only structure carrying the security meaning is the
 * assignment target.
 */
'use strict';

async function beginRecovery(userModel) {
  userModel.passwordResetToken = Math.random().toString(36).slice(2);
  userModel.passwordResetExpiresAt = new Date(Date.now() + 3600_000);

  await userModel.save();
  return userModel.passwordResetToken;
}

module.exports = { beginRecovery };
