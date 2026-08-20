/**
 * VULNERABLE - The value arrives via an array index.
 */
const answers = collectSecurityAnswers();
sessionStorage.setItem('passphrase', answers[0]);
