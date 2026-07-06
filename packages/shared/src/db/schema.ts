/**
 * Drizzle ORM Schema — única fuente de verdad del schema de base de datos de Reinder.
 *
 * Drizzle version: drizzle-orm ^0.45.x
 *
 * NOTAS IMPORTANTES:
 * - La tabla `users` es gestionada por Supabase Auth en auth.users — NO se crea aquí.
 * - Drizzle usa camelCase en TypeScript y snake_case en la base de datos (mapeado automático).
 * - RLS debe activarse de forma separada via rls-policies.sql (no lo hace drizzle-kit).
 * - Este archivo es importable desde @reinder/shared en web y mobile — NO duplicar.
 *
 * Source: architecture.md#Data Architecture
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
  index,
  unique,
  char,
  bigint,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums de PostgreSQL
// ---------------------------------------------------------------------------

/**
 * Roles RBAC de la plataforma.
 * Source: architecture.md#RBAC Roles
 */
export const appRoleEnum = pgEnum("app_role", [
  "buyer",
  "agent",
  "agency_admin",
  "platform_admin",
]);

// ---------------------------------------------------------------------------
// Tabla: user_profiles
// Datos personales del comprador / agente.
// Su `id` referencia auth.users.id (gestionado por Supabase Auth).
// ---------------------------------------------------------------------------

export const userProfiles = pgTable("user_profiles", {
  // REQUERIDO: id debe proveerse explícitamente al insertar — viene de auth.uid().
  // NO tiene .defaultRandom(). Un insert sin `id` falla en DB, no en TypeScript.
  id: uuid("id").primaryKey(), // Mismo UUID que auth.users.id — NO es una secuencia propia
  role: appRoleEnum("role").notNull().default("buyer"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  /** Story 5.4: links agency_admin / agent users to their agency for ownership guards */
  agencyId: uuid("agency_id").references(() => agencies.id),
  /** SearchPreferences jsonb — Story 2.9 */
  searchPreferences: jsonb("search_preferences").$type<{
    zones: string[];
    maxPrice?: number;
    minRooms?: number;
    minSqm?: number;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Tabla: agencies
// Agencias inmobiliarias integradas en la plataforma.
// ---------------------------------------------------------------------------

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Tabla: agency_crm_connections
// Conexiones CRM de cada agencia (credenciales cifradas).
// ---------------------------------------------------------------------------

export const agencyCrmConnections = pgTable("agency_crm_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id")
    .notNull()
    .references(() => agencies.id),
  crmType: text("crm_type").notNull(),
  credentialsEncrypted: text("credentials_encrypted"),
  status: text("status").notNull().default("pending_sync"), // pending_sync | active | error
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Tabla: listings
// Propiedades activas, vendidas, retiradas o en revisión.
// ---------------------------------------------------------------------------

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id),
    externalId: text("external_id"), // ID en el sistema CRM de la agencia
    title: text("title").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 15, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    bedrooms: integer("bedrooms"),
    sizeSqm: numeric("size_sqm", { precision: 10, scale: 2 }),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    images: jsonb("images").$type<string[]>().default([]), // Array de URLs de imágenes
    status: text("status").notNull().default("active"), // active | sold | withdrawn | pending_review
    exclusivityVerified: boolean("exclusivity_verified").notNull().default(false),
    catastralRef: text("catastral_ref"),
    /** Story 5.4: timestamp when listing was marked as sold — used by auto_remove_sold_listings() */
    soldAt: timestamp("sold_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxListingsAgencyId: index("idx_listings_agency_id").on(table.agencyId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: swipe_events
// Registro de swipes del comprador (match/reject).
// GDPR: sólo IDs anónimos — nunca exponer a agencias.
// ---------------------------------------------------------------------------

export const swipeEvents = pgTable(
  "swipe_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id").notNull(), // Referencia a auth.users.id
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    action: text("action").notNull(), // match | reject
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxSwipeEventsBuyerId: index("idx_swipe_events_buyer_id").on(table.buyerId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: match_events
// Matches confirmados entre comprador y propiedad.
// ---------------------------------------------------------------------------

export const matchEvents = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").notNull(), // Referencia a auth.users.id
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id),
  agentId: uuid("agent_id"), // nullable — puede no estar asignado al confirmar
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Tabla: referral_tokens
// Tokens de invitación agente→comprador.
// RLS: ver packages/shared/src/db/rls-referral-tokens-policies.sql (Story 3.1)
// ---------------------------------------------------------------------------

export const referralTokens = pgTable(
  "referral_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(), // Referencia a auth.users.id
    buyerId: uuid("buyer_id"), // null hasta que el comprador usa el token
    token: text("token").notNull(),
    // SEGURIDAD: expiresAt es obligatorio — un token sin expiración es válido indefinidamente.
    // El caller debe establecer siempre un límite (ej. +30 días desde creación).
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenUnique: unique("referral_tokens_token_unique").on(table.token),
    idxReferralTokensToken: index("idx_referral_tokens_token").on(table.token),
  })
);

// ---------------------------------------------------------------------------
// Tabla: push_tokens
// Tokens de push notifications por usuario y plataforma.
// ---------------------------------------------------------------------------

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(), // Referencia a auth.users.id
    token: text("token").notNull(),
    platform: text("platform").notNull(), // ios | android | web
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxPushTokensUserId: index("idx_push_tokens_user_id").on(table.userId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: agent_buyer_bonds
// Vínculo activo entre un agente representante y un comprador.
// Creado cuando el comprador acepta el referral link del agente.
// RLS: ver packages/shared/src/db/rls-agent-buyer-bonds-policies.sql (Story 3.2)
// ---------------------------------------------------------------------------

export const agentBuyerBonds = pgTable(
  "agent_buyer_bonds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(),   // Referencia a auth.users.id del agente
    buyerId: uuid("buyer_id").notNull(),   // Referencia a auth.users.id del comprador
    referralTokenId: uuid("referral_token_id")
      .notNull()
      .references(() => referralTokens.id),
    // active | expired | revoked
    status: text("status").notNull().default("active"),
    // Bond TTL — same as the referral token expiry, renewable in Story 3.3
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Story 4.1: tracks when agent last viewed this client's matches — used to compute hasNewMatches */
    agentLastSeenAt: timestamp("agent_last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // A buyer can only have one active bond per agent
    uniqueAgentBuyer: unique("agent_buyer_bonds_unique").on(
      table.agentId,
      table.buyerId
    ),
    idxBuyerId: index("idx_agent_buyer_bonds_buyer_id").on(table.buyerId),
    idxAgentId: index("idx_agent_buyer_bonds_agent_id").on(table.agentId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: crm_sync_queue
// Cola de procesamiento asíncrono para ingesta de listings (Story 5.2).
// ---------------------------------------------------------------------------

export const crmSyncStatusEnum = pgEnum("crm_sync_status", [
  "pending",
  "processing",
  "completed",
  "error",
]);

export const crmSyncQueue = pgTable(
  "crm_sync_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id"), // opcional inicialmente, por si se infiere del payload
    payload: jsonb("payload").notNull(),
    status: crmSyncStatusEnum("status").notNull().default("pending"),
    retryCount: integer("retry_count").notNull().default(0),
    errorLog: text("error_log"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxCrmSyncQueueStatus: index("idx_crm_sync_queue_status").on(table.status),
  })
);

// ---------------------------------------------------------------------------
// Enums de Experimentos A/B (Story 9.1)
// ---------------------------------------------------------------------------

/**
 * Estados del ciclo de vida de un experimento A/B.
 * Source: story 9-1, AC1
 */
export const experimentStatusEnum = pgEnum("experiment_status", [
  "draft",
  "running",
  "paused",
  "completed",
  "cancelled",
]);

/**
 * Tipos de contenido que se pueden testear en un experimento A/B.
 * Source: story 9-1, AC1
 */
export const experimentTypeEnum = pgEnum("experiment_type", [
  "cover_image",
  "title",
  "description",
  "title_and_description",
]);

// ---------------------------------------------------------------------------
// Tabla: listing_experiments
// Experimentos A/B sobre contenido de listings.
// NOTA: La restricción UNIQUE parcial (1 experimento activo por listing)
// se crea en la migración SQL — Drizzle no soporta partial unique nativamente.
// Source: story 9-1, AC1
// ---------------------------------------------------------------------------

export const listingExperiments = pgTable(
  "listing_experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id),
    name: text("name").notNull(),
    status: experimentStatusEnum("status").notNull().default("draft"),
    experimentType: experimentTypeEnum("experiment_type").notNull(),
    variantA: jsonb("variant_a").notNull(),
    variantB: jsonb("variant_b").notNull(),
    minSampleSize: integer("min_sample_size").notNull().default(100),
    targetPValue: numeric("target_p_value", { precision: 4, scale: 3 })
      .notNull()
      .default("0.050"),
    winnerVariant: text("winner_variant"), // 'a' | 'b' | null
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxListingExperimentsListingId: index("idx_listing_experiments_listing_id").on(
      table.listingId
    ),
    idxListingExperimentsAgencyId: index("idx_listing_experiments_agency_id").on(
      table.agencyId
    ),
  })
);

// ---------------------------------------------------------------------------
// Tabla: experiment_assignments
// Asignación de variante por comprador/experimento.
// Un comprador solo tiene una asignación por experimento (UNIQUE constraint).
// GDPR: agencias NUNCA ven asignaciones individuales (NFR8 → RLS deny).
// Source: story 9-1, AC2
// ---------------------------------------------------------------------------

export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => listingExperiments.id),
    buyerId: uuid("buyer_id").notNull(), // Referencia a auth.users.id
    variant: text("variant").notNull(), // 'a' | 'b'
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    experimentAssignmentsUnique: unique("experiment_assignments_unique").on(
      table.experimentId,
      table.buyerId
    ),
    idxExperimentAssignmentsBuyerVariant: index(
      "idx_experiment_assignments_buyer_variant"
    ).on(table.buyerId, table.experimentId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: experiment_results
// Métricas agregadas por variante (2 filas por experimento: a + b).
// Read model pre-agregado que se actualiza incrementalmente (Story 9.3).
// Source: story 9-1, AC3
// ---------------------------------------------------------------------------

export const experimentResults = pgTable(
  "experiment_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => listingExperiments.id),
    variant: text("variant").notNull(), // 'a' | 'b'
    impressions: integer("impressions").notNull().default(0),
    totalViewTimeMs: bigint("total_view_time_ms", { mode: "bigint" })
      .notNull()
      .default(0n),
    /** Story 9.3: sum of (view_time_ms)^2 — needed for variance in Story 9.4 Welch's t-test */
    sumViewTimeSqMs: bigint("sum_view_time_sq_ms", { mode: "bigint" })
      .notNull()
      .default(0n),
    matchCount: integer("match_count").notNull().default(0),
    reaffirmCount: integer("reaffirm_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    experimentResultsUnique: unique("experiment_results_unique").on(
      table.experimentId,
      table.variant
    ),
  })
);

// ---------------------------------------------------------------------------
// Tabla: experiment_results_timeseries
// Hourly cumulative snapshots per variant for time-series dashboard charts.
// One row per (experiment, variant, hour) — upserted by aggregation job.
// Source: story 9-3, AC3
// ---------------------------------------------------------------------------

export const experimentResultsTimeseries = pgTable(
  "experiment_results_timeseries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => listingExperiments.id),
    variant: text("variant").notNull(), // 'a' | 'b'
    bucketHour: timestamp("bucket_hour", { withTimezone: true }).notNull(),
    impressions: integer("impressions").notNull().default(0),
    totalViewTimeMs: bigint("total_view_time_ms", { mode: "bigint" })
      .notNull()
      .default(0n),
    matchCount: integer("match_count").notNull().default(0),
    reaffirmCount: integer("reaffirm_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    experimentResultsTimeseriesUnique: unique(
      "experiment_results_timeseries_unique"
    ).on(table.experimentId, table.variant, table.bucketHour),
    idxExperimentResultsTimeseriesExperiment: index(
      "idx_experiment_results_timeseries_experiment"
    ).on(table.experimentId),
  })
);

// ---------------------------------------------------------------------------
// Tabla: ai_generation_usage
// Tracks AI variant generation calls per agency for rate limiting and billing.
// Source: story 9-6, AC4
// ---------------------------------------------------------------------------

export const aiGenerationUsage = pgTable(
  "ai_generation_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    userId: uuid("user_id").notNull(),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxAiGenerationUsageAgencyCreated: index(
      "idx_ai_generation_usage_agency_created"
    ).on(table.agencyId, table.createdAt),
  })
);

