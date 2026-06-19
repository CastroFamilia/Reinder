'use client';
/**
 * apps/web/src/components/layout/ToastHandler.tsx
 *
 * Reads toast query params from the URL and displays a notification.
 * Used after redirects (e.g., bond acceptance → /swipe?toast=bond_accepted&agent=Elena).
 *
 * Story 3.2 integration fix.
 */
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const TOAST_MESSAGES: Record<string, (params: URLSearchParams) => string> = {
  bond_accepted: (p) =>
    `${p.get('agent') || 'Tu agente'} es ahora tu agente representante 🤝`,
  bond_renewed: () => 'Vínculo renovado con éxito ✅',
  bond_revoked: () => 'Vínculo desvinculado',
};

export function ToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const toastKey = searchParams.get('toast');
    if (toastKey && TOAST_MESSAGES[toastKey]) {
      const message = TOAST_MESSAGES[toastKey](searchParams);
      setToast(message);

      // Clear query params without full reload
      const url = new URL(window.location.href);
      url.searchParams.delete('toast');
      url.searchParams.delete('agent');
      router.replace(url.pathname, { scroll: false });

      // Auto-dismiss after 4s
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!toast) return null;

  return (
    <div
      id="toast-notification"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(30, 25, 20, 0.95)',
        border: '1px solid rgba(255,107,0,0.3)',
        borderRadius: '12px',
        padding: '12px 20px',
        color: '#F5F0E8',
        fontSize: '14px',
        fontWeight: 500,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 200,
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      {toast}
    </div>
  );
}
