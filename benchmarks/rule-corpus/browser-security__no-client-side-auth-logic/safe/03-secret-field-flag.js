/**
 * SAFE - A presence/flag comparison, not a credential comparison. okta's
 * ion-string-handler asks whether to DRAW the field as a password input.
 */
if (formField.secret === true) {
  renderAsPasswordInput(formField);
}
