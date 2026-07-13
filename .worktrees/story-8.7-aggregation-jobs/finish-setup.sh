#!/bin/bash
# =============================================================================
# Reinder — finish-setup.sh
# Completa la configuración con las 2 credenciales que faltan y aplica migraciones.
#
# Uso: bash finish-setup.sh
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/apps/web/.env.local"
PROJECT_REF="jcntdudwdtnizenhdtaa"

echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Reinder — Final Setup (2 datos)       ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Proyecto Supabase: ${BOLD}${PROJECT_REF}${NC}"
echo -e "URL configurada:   ${BOLD}https://${PROJECT_REF}.supabase.co${NC}"
echo ""
echo -e "${YELLOW}Abre: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api${NC}"
echo ""

# ─── 1. Anon Key ─────────────────────────────────────────────────────────────
if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=ey" "$ENV_FILE" 2>/dev/null; then
  echo -e "${GREEN}✓ Anon Key ya configurada.${NC}"
  ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d= -f2-)
else
  echo -e "${BOLD}Anon / Public Key${NC} (Settings → API → anon public, empieza por eyJ...):"
  read -r ANON_KEY
  # Update .env.local
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}|" "$ENV_FILE"
  echo -e "${GREEN}✓ Anon Key guardada.${NC}"
fi

echo ""

# ─── 2. Database Password ─────────────────────────────────────────────────────
if grep -q "DATABASE_URL=postgresql://" "$ENV_FILE" 2>/dev/null; then
  echo -e "${GREEN}✓ DATABASE_URL ya configurada.${NC}"
else
  echo -e "${BOLD}Database Password${NC} (Settings → Database → Database password):"
  echo -e "${YELLOW}  (el password que configuraste al crear el proyecto)${NC}"
  read -rs DB_PASS
  echo ""
  
  DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASS}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
  sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=${DB_URL}|" "$ENV_FILE"
  echo -e "${GREEN}✓ DATABASE_URL configurada.${NC}"
fi

echo ""
echo -e "${CYAN}Aplicando migraciones de Drizzle...${NC}"
echo -e "${YELLOW}(Las migraciones crean todas las tablas en tu proyecto Supabase)${NC}"
echo ""

# Load env
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# Run Drizzle migrations
cd "$SCRIPT_DIR"
if pnpm db:migrate 2>&1; then
  echo ""
  echo -e "${GREEN}✓ Migraciones aplicadas correctamente.${NC}"
else
  echo ""
  echo -e "${RED}✗ Error en migraciones. Verifica tu DATABASE_URL y database password.${NC}"
  echo ""
  echo -e "DATABASE_URL actual:"
  grep "DATABASE_URL" "$ENV_FILE"
  exit 1
fi

echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  ✅ Configuración completa                 ║${NC}"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Arranca el servidor: ${BOLD}pnpm dev${NC}"
echo -e "  URL:                 ${BOLD}http://localhost:3000${NC}"
echo ""
