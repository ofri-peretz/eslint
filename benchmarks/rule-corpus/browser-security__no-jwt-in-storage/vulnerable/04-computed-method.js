/**
 * VULNERABLE - Computed access reaches the same method.
 */
const method = 'setItem';
sessionStorage['setItem']('jwt', currentToken);
export { method };
