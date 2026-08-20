/**
 * SAFE (for this rule) - A real vulnerability, owned by
 * no-sensitive-localstorage. Reporting it here too is the double-report this
 * partition exists to remove.
 */
localStorage.setItem('user_password', form.password.value);
