/**
 * SAFE (adversarial) - the credential vocabulary appears only in a string
 * literal and a comment. The delete removes a form's UI state.
 *
 * Positive control for this probe: vulnerable/01 proves the rule DOES fire on
 * `delete user.password`.
 */
const PASSWORD_HELP = 'Your password must be at least 12 characters.';

// The secret and token fields are handled by the auth module, not here.
function resetFormState(form) {
  delete form.touched;
  delete form.submitCount;
  return { form, help: PASSWORD_HELP };
}

module.exports = { resetFormState, PASSWORD_HELP };
