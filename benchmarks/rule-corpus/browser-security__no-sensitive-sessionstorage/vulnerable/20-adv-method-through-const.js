/**
 * VULNERABLE (wave 2) - The method name through a binding.
 */
const WRITE = 'setItem';
sessionStorage[WRITE]('cvv', form.cvv);
