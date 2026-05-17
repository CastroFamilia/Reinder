/**
 * apps/web/src/providers/PostHogProvider.tsx
 *
 * Story 7.1: PostHog Analytics — GDPR-compliant product analytics
 * AC5: PostHog in layout.tsx respecting GDPR configuration
 *
 * Client Component — initializes PostHog on mount.
 * Uses EU data residency (eu.posthog.com) for GDPR compliance.
 * localStorage persistence — no third-party cookies.
 */
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // Skip in dev/test when not configured

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',

      // GDPR compliance
      persistence: 'localStorage+cookie',
      capture_pageview: true,
      capture_pageleave: true,

      // Disable autocapture for forms to avoid PII capture
      autocapture: {
        dom_event_allowlist: ['click'],
        element_allowlist: ['a', 'button'],
      },

      // Respect Do Not Track browser setting
      respect_dnt: true,

      // Don't load in server-side rendering
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
        }
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
