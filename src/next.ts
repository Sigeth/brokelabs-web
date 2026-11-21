/** Where to go after signing in: a local path only (no open redirect). */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  return next.includes('\\') ? '/' : next;
}

/** The SSO sign-in URL, coming back to `next`. */
export function ssoLoginUrl(next: string): string {
  return next === '/'
    ? '/api/v1/auth/oidc/login'
    : `/api/v1/auth/oidc/login?next=${encodeURIComponent(next)}`;
}
