/**
 * VULNERABLE - The handle is stored nowhere at all. It exists for the lifetime
 * of the document and no code can ever reach it to revoke it.
 */
export function warmUp(blob) {
  URL.createObjectURL(blob);
  console.info('blob warmed');
}
