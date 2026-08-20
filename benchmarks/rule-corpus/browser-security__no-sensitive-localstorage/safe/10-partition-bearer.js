/**
 * SAFE (for this rule) - A real vulnerability owned by no-jwt-in-storage.
 */
localStorage.setItem('access_token', response.access_token);
