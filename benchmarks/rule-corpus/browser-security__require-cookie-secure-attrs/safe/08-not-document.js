/**
 * SAFE - Not document.cookie. `top` names a different window.
 */
res.cookie = 'a=b';
top.document.cookie = 'a=b';
