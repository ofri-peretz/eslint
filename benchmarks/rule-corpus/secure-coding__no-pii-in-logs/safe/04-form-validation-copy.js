/**
 * SAFE - A form validator logging WHICH FIELD failed, never the value. The
 * strings are UI copy naming a form field; no personal data is in scope
 * anywhere in this module.
 *
 * A rule that matches the literal text `email:` reports the label rather than
 * the data - the sink name appearing in a string, not the PII.
 */
export function reportValidationFailure(field) {
  if (field === 'email') {
    console.error('Validation failed - email: must be a valid address');
    return;
  }
  console.error('Validation failed - field is required');
}
