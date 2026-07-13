-- rls-policies.sql
-- Ejecutar en Supabase Dashboard → SQL Editor o via: supabase db push
-- Activa Row Level Security en todas las tablas del schema de Reinder.
--
-- Comportamiento por defecto de Supabase RLS:
--   Sin políticas explícitas = acceso DENEGADO para todos los roles.
--   Las políticas específicas por rol se añaden en las stories de feature.
--
-- Source: architecture.md#Security — RLS Policy

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- NOTA: Sin sentencias CREATE POLICY aquí → deny-by-default para todos los
-- roles (anon, authenticated, service_role).
-- Las políticas RLS específicas por feature se añadirán en stories futuras.
