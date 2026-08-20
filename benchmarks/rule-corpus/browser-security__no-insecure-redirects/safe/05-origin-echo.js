/**
 * SAFE - `location.origin` is the origin the user is ALREADY on. Echoing it
 * back cannot send anybody anywhere new.
 */
window.location.href = window.location.origin + '/dashboard';
