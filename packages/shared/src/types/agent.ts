/**
 * Agent-related types for the Agent Panel feature (Epic 4).
 * Used by GET /api/v1/agent/clients and AgentClientCard component.
 *
 * Source: story 4-1-lista-clientes-vinculados-panel-agente.md
 * Architecture: features/agent-panel/ (web only)
 */

/**
 * Represents a buyer client bonded to an agent, with match activity data.
 * Returned by GET /api/v1/agent/clients
 */
export interface AgentClient {
  /** UUID of the agent_buyer_bonds record */
  bondId: string;
  /** UUID of the buyer (auth.users.id) */
  buyerId: string;
  /** Full name of the buyer from user_profiles */
  buyerName: string | null;
  /** Avatar URL of the buyer from user_profiles */
  buyerAvatarUrl: string | null;
  /** ISO 8601 datetime when the bond was created */
  bondCreatedAt: string;
  /** Total number of matches by this buyer */
  totalMatches: number;
  /** ISO 8601 datetime of the most recent match, null if no matches */
  lastMatchAt: string | null;
  /**
   * True if there are new matches since the agent last viewed this client.
   * Derived from: lastMatchAt > agentLastSeenAt (or totalMatches > 0 if agentLastSeenAt is null)
   * Used to show orange badge on AgentClientCard.
   */
  hasNewMatches: boolean;
}
