-- ============================================================
-- packages/shared/src/db/rls-agent-policies.sql
--
-- Políticas RLS para roles agent y agency_admin en Reinder.
-- Creadas en Story 1.5 (Login de Agente y Administrador de Agencia).
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Selecciona tu proyecto Reinder (EU-West / Frankfurt)
-- 3. Copia y pega este archivo completo en el editor
-- 4. Ejecuta (Run / F5)
-- 5. Verifica que no hay errores antes de testear el login
--
-- PREREQUISITO: Las políticas base de user_profiles se crearon en
-- rls-user-profiles-policies.sql (Story 1.2). Este archivo las COMPLEMENTA.
-- ============================================================

-- ============================================================
-- POLÍTICAS EN: user_profiles
-- ============================================================

-- Policy: agent puede leer solo su propio perfil
CREATE POLICY "agent_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'agent'
  );

-- Policy: agency_admin puede leer solo su propio perfil
CREATE POLICY "agency_admin_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'agency_admin'
  );

-- ============================================================
-- POLÍTICAS EN: agencies
-- ============================================================

-- Policy: agency_admin puede leer solo la agencia a la que pertenece.
--
-- NOTA IMPORTANTE: Esta política asume que user_profiles tendrá un campo
-- `agency_id` que relaciona el admin con su agencia. Dicho campo se añadirá
-- en Epic 5 (Story 5.1). Por ahora, si el campo no existe, comentar esta
-- política y habilitarla cuando se añada agency_id al schema.
--
-- En el MVP, las cuentas de agency_admin se crean manualmente en Supabase Auth
-- y se asignan su agencia directamente en la BD.
--
-- Descomentar cuando `user_profiles.agency_id` esté disponible:
/*
CREATE POLICY "agency_admin_can_read_own_agency"
  ON agencies
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'agency_admin'
    )
  );
*/

-- Hasta que agency_id esté en user_profiles, ningún usuario autenticado
-- puede leer agencies (deny-by-default sigue activo — consistent con Story 1.2).
-- Solo platform_admin podrá hacerlo cuando se implemente Story 7.2.
