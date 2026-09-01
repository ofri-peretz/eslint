// CWE-400: safe — for-of over Object.keys is bounded by the object, it is not an unchecked loop
// @author        (not ours — see @source)
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-31
// @source        auth0/express-openid-connect@9cdf98448485a4e36c11429a8be8d97549ac7727 lib/appSession.js:124
// @sealed        secure-coding/no-unchecked-loop-condition
// @expected      safe
// This MUST NOT be flagged
  function setCookie(
    req,
    res,
    {
      uat = epoch(),
      iat = uat,
      exp = calculateExp(iat, uat, req[sessionName]?.sessionExpiresAt),
    },
  ) {
    const cookies = req[COOKIES];
    const { transient: cookieTransient, ...cookieOptions } = cookieConfig;
    cookieOptions.expires = cookieTransient ? 0 : new Date(exp * 1000);

    // session was deleted or is empty, this matches all session cookies (chunked or unchunked)
    // and clears them, essentially cleaning up what we've set in the past that is now trash
    if (!req[sessionName] || !Object.keys(req[sessionName]).length) {
      debug(
        'session was deleted or is empty, clearing all matching session cookies',
      );
      for (const cookieName of Object.keys(cookies)) {
        if (cookieName.match(`^${sessionName}(?:\\.\\d)?$`)) {
          clearCookie(cookieName, res);
        }
      }
    } else {
      debug(
        'found session, creating signed session cookie(s) with name %o(.i)',
        sessionName,
      );

      const value = encryptSync(JSON.stringify(req[sessionName]), current, {
        iat,
        uat,
        exp,
      });

      const chunkCount = Math.ceil(value.length / cookieChunkSize);

      if (chunkCount > 1) {
        debug('cookie size greater than %d, chunking', cookieChunkSize);
        for (let i = 0; i < chunkCount; i++) {
          const chunkValue = value.slice(
            i * cookieChunkSize,
            (i + 1) * cookieChunkSize,
          );

          const chunkCookieName = `${sessionName}.${i}`;
          res.cookie(chunkCookieName, chunkValue, cookieOptions);
        }
        if (sessionName in cookies) {
          debug('replacing non chunked cookie with chunked cookies');
          clearCookie(sessionName, res);
        }
      } else {
        res.cookie(sessionName, value, cookieOptions);
        for (const cookieName of Object.keys(cookies)) {
          debug('replacing chunked cookies with non chunked cookies');
          if (cookieName.match(`^${sessionName}\\.\\d$`)) {
            clearCookie(cookieName, res);
          }
        }
      }
    }
  }
