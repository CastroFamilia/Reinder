'use client';
/**
 * apps/web/src/components/layout/BuyerBondOverlay.tsx
 *
 * Client-side overlay for buyer bond features:
 * - Shows BondRenewalBanner when bond is expiring (Story 3.3)
 * - Provides bond context for child components
 *
 * Integrated into the protected layout for all buyer pages.
 */
import { useBuyerBond } from '@/features/agent-link/hooks/use-buyer-bond';
import { BondRenewalBanner } from '@/features/agent-link/components/bond-renewal-banner';

export function BuyerBondOverlay() {
  const { bond, isLoading } = useBuyerBond();

  // Don't render anything while loading or if no bond
  if (isLoading || !bond) return null;

  // Show renewal banner if bond is expiring
  if (bond.isExpiring) {
    return <BondRenewalBanner agentName={bond.agentName} />;
  }

  return null;
}
