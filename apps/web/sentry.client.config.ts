/**
 * sentry.client.config.ts
 *
 * Story 7.1: Sentry SDK configuration — client-side (browser)
 * AC4: Sentry configured in apps/web capturing errors with user role context
 *
 * This file is loaded by @sentry/nextjs automatically.
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging production issues
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Don't send in development by default
  enabled: process.env.NODE_ENV === 'production',

  // Integrate with Vercel source maps
  integrations: [
    Sentry.replayIntegration(),
  ],
});
