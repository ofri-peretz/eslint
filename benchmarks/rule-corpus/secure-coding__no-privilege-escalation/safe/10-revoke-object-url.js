/**
 * SAFE (adversarial wave) - Browser memory management. `URL.revokeObjectURL`
 * releases a blob handle; it touches no authorisation state whatsoever, and the
 * "user input" it is handed is the preview URL the same form just created.
 *
 * `revoke` is a whole word here, so whole-word matching alone does not clear
 * this - the operation is simply not a privilege operation.
 */
export function discardUpload(request) {
  const previewUrl = request.body.previewUrl;

  URL.revokeObjectURL(previewUrl);
  URL.revokeObjectURL(request.body.thumbnailUrl);

  return { discarded: true };
}
