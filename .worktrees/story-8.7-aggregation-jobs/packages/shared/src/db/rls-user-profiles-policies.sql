-- rls-user-profiles-policies.sql
-- Ejecutar en Supabase Dashboard → SQL Editor (New snippet)
-- DESPUÉS de ejecutar rls-policies.sql (que activa RLS con deny-by-default)
--
-- Estas políticas permiten a los usuarios autenticados:
-- 1. Insertar su propio perfil en user_profiles al registrarse
-- 2. Leer su propio perfil
--
-- Source: Story 1.3 — Registro de comprador

-- Política INSERT: solo el propio usuario puede crear su fila
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Política SELECT: solo el propio usuario puede leer su fila
CREATE POLICY "Users can read own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Política UPDATE: solo el propio usuario puede actualizar su perfil
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
