#!/bin/bash
# =============================================================================
# Reinder — push-migrations.sh
# Aplica las migraciones SQL a Supabase usando el CLI.
# 
# Requisito: haber hecho login una vez con: supabase login
# Uso: bash push-migrations.sh
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_REF="jcntdudwdtnizenhdtaa"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Reinder — Supabase Migrations         ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ─── Check CLI login ──────────────────────────────────────────────────────────
if ! supabase projects list &>/dev/null; then
  echo -e "${YELLOW}⚠ No estás logueado. Iniciando sesión...${NC}"
  supabase login
fi

# ─── Link project ─────────────────────────────────────────────────────────────
echo -e "${CYAN}Enlazando proyecto ${PROJECT_REF}...${NC}"
cd "$SCRIPT_DIR"

if supabase link --project-ref "$PROJECT_REF" 2>&1; then
  echo -e "${GREEN}✓ Proyecto enlazado.${NC}"
else
  echo -e "${RED}✗ Error al enlazar. Asegúrate de haber hecho: supabase login${NC}"
  exit 1
fi

# ─── Push migrations ──────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Aplicando migraciones SQL a Supabase...${NC}"
echo -e "${YELLOW}  Migraciones: supabase/migrations/20260101000000_initial.sql${NC}"
echo -e "${YELLOW}              supabase/migrations/20260101000001_search_preferences.sql${NC}"
echo -e "${YELLOW}              supabase/migrations/20260101000002_agent_last_seen_at.sql${NC}"
echo ""

if supabase db push 2>&1; then
  echo ""
  echo -e "${GREEN}✓ Migraciones aplicadas correctamente.${NC}"
else
  echo ""
  echo -e "${RED}✗ Error al aplicar migraciones.${NC}"
  exit 1
fi

# ─── Get credentials ──────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Obteniendo credenciales del proyecto...${NC}"
SUPABASE_STATUS=$(supabase status --project-ref "$PROJECT_REF" 2>/dev/null || true)
echo "$SUPABASE_STATUS"

echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  ✅ Migraciones aplicadas                  ║${NC}"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Siguiente paso: rellenar ${BOLD}apps/web/.env.local${NC}"
echo -e "  con el ${BOLD}anon key${NC} y ${BOLD}DATABASE_URL${NC} de tu proyecto."
echo ""
echo -e "  Dashboard: ${BOLD}https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api${NC}"
echo ""
echo -e "Luego arranca con: ${BOLD}pnpm dev${NC}"
echo ""
