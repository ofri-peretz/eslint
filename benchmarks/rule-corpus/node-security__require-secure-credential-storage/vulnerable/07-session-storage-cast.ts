/**
 * VULNERABLE - TypeScript. The cast is not decoration: the auth context types
 * the token as `string | null`, so `as string` is required to compile. It also
 * hides the value from anything that reads the argument's shape rather than
 * its binding.
 */
interface AuthContext {
  authToken: string | null;
}

export function persist(ctx: AuthContext): void {
  sessionStorage.setItem('auth', ctx.authToken as string);
}
