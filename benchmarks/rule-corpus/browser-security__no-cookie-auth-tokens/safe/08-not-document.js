/**
 * SAFE - A response object and a cookie library are not document.cookie.
 */
res.cookie = 'access_token=' + token;
cookies.set('access_token', token, { httpOnly: true });
