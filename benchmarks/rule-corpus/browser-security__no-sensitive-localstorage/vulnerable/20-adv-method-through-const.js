/**
 * VULNERABLE (wave 2) - The method name through a binding.
 */
const WRITE = 'setItem';
localStorage[WRITE]('user_password', pw);
