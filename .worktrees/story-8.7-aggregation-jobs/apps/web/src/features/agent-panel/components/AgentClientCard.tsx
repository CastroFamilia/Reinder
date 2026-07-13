"use client";

/**
 * AgentClientCard
 *
 * Card component for the Agent Panel client list (Story 4.1).
 * Displays buyer client info: name, avatar/initials, bond date, match count, new-match badge.
 *
 * Features:
 * - Orange badge indicator when hasNewMatches is true (UX-DR9)
 * - Avatar with initials fallback
 * - Glassmorphism styling consistent with the design system
 * - Full keyboard/click accessibility
 *
 * Source: story 4-1-lista-clientes-vinculados-panel-agente.md (Task 3)
 * Source: architecture.md#frontend-architecture (Glassmorphism design system)
 */

import type { AgentClient } from "@reinder/shared/types/agent";

interface AgentClientCardProps {
  client: AgentClient;
  onPress: () => void;
}

/**
 * Derives up to 2 initials from a full name string.
 * Example: "Ana García" → "AG", "Carlos" → "C"
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Formats a ISO 8601 date string to a localized short date.
 * Example: "2026-04-01T00:00:00.000Z" → "1 abr 2026" (es-ES locale)
 */
function formatBondDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function AgentClientCard({ client, onPress }: AgentClientCardProps) {
  const initials = getInitials(client.buyerName);
  const bondDateFormatted = formatBondDate(client.bondCreatedAt);
  const displayName = client.buyerName ?? "Cliente sin nombre";

  return (
    <button
      onClick={onPress}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded-2xl"
      aria-label={`Ver historial de ${displayName}`}
    >
      {/* Glass card */}
      <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 hover:shadow-xl transition-all duration-200 cursor-pointer">
        {/* Avatar / Initials */}
        <div className="relative flex-shrink-0">
          {client.buyerAvatarUrl ? (
            <img
              src={client.buyerAvatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-white/30">
              {initials}
            </div>
          )}

          {/* New-matches badge (orange dot) */}
          {client.hasNewMatches && (
            <span
              data-testid="new-matches-badge"
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white/80 shadow-sm"
              aria-label="Nuevos matches"
            />
          )}
        </div>

        {/* Client info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white truncate text-sm leading-snug">
              {displayName}
            </h3>

            {/* Match count badge */}
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-white/70 bg-white/10 rounded-full px-2 py-0.5">
              <svg
                className="w-3 h-3 text-orange-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              {client.totalMatches}
            </span>
          </div>

          {/* Bond creation date */}
          <p
            data-testid="bond-date"
            className="text-xs text-white/50 mt-0.5 truncate"
          >
            Vinculado el {bondDateFormatted}
          </p>

          {/* New matches indicator text */}
          {client.hasNewMatches && (
            <p className="text-xs text-orange-400 font-medium mt-1">
              Nuevo match
            </p>
          )}
        </div>

        {/* Chevron right */}
        <svg
          className="flex-shrink-0 w-4 h-4 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}

/**
 * Empty state component shown when agent has no bonded clients yet.
 * Source: story 4.1 AC4
 */
export function AgentClientsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      </div>

      <h2 className="text-white/80 font-semibold text-lg mb-2">
        Sin clientes vinculados
      </h2>
      <p className="text-white/50 text-sm max-w-xs leading-relaxed">
        Aún no tienes clientes vinculados — envía tu link de referral para
        empezar
      </p>
    </div>
  );
}
