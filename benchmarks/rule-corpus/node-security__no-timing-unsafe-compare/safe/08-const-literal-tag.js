/**
 * SAFE - a comparison against a string constant declared once and used by name.
 *
 * The URN is a protocol tag published in an RFC. It is in the source file, in
 * the spec, and on the wire; the constant's NAME containing `token` is the
 * only thing that makes it look like a secret.
 */
'use strict';

const SESSION_TRANSFER_TOKEN_IDENTIFIER =
  'urn:ietf:params:oauth:token-type:session_transfer';

function isSessionTransfer(req) {
  const requestedType = req.body.subject_token_type;
  return requestedType === SESSION_TRANSFER_TOKEN_IDENTIFIER;
}

module.exports = { isSessionTransfer, SESSION_TRANSFER_TOKEN_IDENTIFIER };
