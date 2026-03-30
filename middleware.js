import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'bg'],

  // Used when no locale matches
  defaultLocale: 'en'
});

export const config = {
  // Match only internationalized pathnames.
  // CRITICAL: This regex explicitly ignores the /api/ folder, _next internals, and static files (.svg, .png, .jpg)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};