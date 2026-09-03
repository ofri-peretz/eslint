/**
 * VULNERABLE (adversarial, TypeScript) - The same interpolation the logging
 * path reports, in an exception message. Error messages reach the log stream
 * through the unhandled-rejection handler and, in most Express stacks, the
 * response body as well.
 */
export function assertRefreshToken(refreshToken: string | undefined): string {
  if (!refreshToken) {
    throw new Error('refresh token missing');
  }
  if (refreshToken.length < 40) {
    throw new Error(`auth_token: ${refreshToken} is too short to be valid`);
  }
  return refreshToken;
}
