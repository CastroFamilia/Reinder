/**
 * sentry.server.config.ts
 *
 * Story 7.1: Sentry SDK configuration — server-side (Node.js / Edge Runtime)
 * AC4: Sentry configured in apps/web capturing errors with user role context
 *
 * This file is loaded by @sentry/nextjs automatically for server-side.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Don't send in development
  enabled: process.env.NODE_ENV === 'production',
});
