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

