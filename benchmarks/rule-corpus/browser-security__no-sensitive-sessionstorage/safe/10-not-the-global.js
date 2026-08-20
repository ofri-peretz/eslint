/**
 * SAFE - Not the sessionStorage global. `top` names a different window.
 */
mySessionStorageWrapper.setItem('password', pw);
top.sessionStorage.setItem('password', pw);
