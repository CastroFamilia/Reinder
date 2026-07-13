-- Story 4.1: Lista de Clientes Vinculados en el Panel del Agente
-- Adds agent_last_seen_at to agent_buyer_bonds table.
-- Used to compute hasNewMatches (whether agent has seen latest match for a client).
-- Nullable: NULL means the agent has never viewed this client's match history.

ALTER TABLE "agent_buyer_bonds" ADD COLUMN IF NOT EXISTS "agent_last_seen_at" TIMESTAMPTZ;
