/**
 * VULNERABLE - "secureFlag" is a cookie ATTRIBUTE NAME that merely starts with
 * "secure". A substring test reads it as the Secure attribute and goes quiet.
 */
document.cookie = 'a=b; secureFlag=1; SameSite=Lax';
