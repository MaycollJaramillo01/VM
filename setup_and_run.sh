#!/usr/bin/env bash
set -euo pipefail

# Script integral para instalar dependencias, preparar la base de datos
# y levantar frontend + backend.

ROOT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PRISMA_SCHEMA="$ROOT_DIR/prisma/schema.prisma"
BACKEND_ENV="$BACKEND_DIR/.env"
FRONTEND_ENV="$FRONTEND_DIR/.env.local"
DEFAULT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/angelshop"

info() { printf "[setup] %s\n" "$*"; }
warn() { printf "[setup][warn] %s\n" "$*"; }

create_backend_env() {
  if [[ -f "$BACKEND_ENV" ]]; then
    info "Usando variables existentes en $BACKEND_ENV"
    return
  fi

  local db_url
  db_url=${DATABASE_URL:-$DEFAULT_DATABASE_URL}

  cat >"$BACKEND_ENV" <<EOF_ENV
DATABASE_URL=$db_url
PORT=4000
JWT_SECRET=dev-secret
REFRESH_SECRET=dev-refresh
ADMIN_DEFAULT_EMAIL=admin@angelshop.cr
ADMIN_DEFAULT_PASSWORD=changeme
ALLOWED_ORIGINS=http://localhost:5173
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM="Angel Shop <no-reply@angelshop.cr>"
EOF_ENV
  info "Archivo .env generado en backend con valores por defecto"
}

create_frontend_env() {
  if [[ -f "$FRONTEND_ENV" ]]; then
    info "Usando variables existentes en $FRONTEND_ENV"
    return
  fi

  cat >"$FRONTEND_ENV" <<EOF_ENV
VITE_API_URL=http://localhost:4000
EOF_ENV
  info "Archivo .env.local generado en frontend con valores por defecto"
}

create_database_if_possible() {
  local db_url
  db_url=${DATABASE_URL:-$DEFAULT_DATABASE_URL}
  export DATABASE_URL="$db_url"

  if ! command -v psql >/dev/null 2>&1; then
    warn "psql no está instalado; asegúrate de que la base de datos exista antes de continuar"
    return
  fi

  python - <<'PY'
import os
import subprocess
from urllib.parse import urlparse

db_url = os.environ["DATABASE_URL"]
parsed = urlparse(db_url)
db_name = parsed.path.lstrip("/") or "postgres"
admin_url = parsed._replace(path="/postgres").geturl()

check_cmd = ["psql", admin_url, "-tc", f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"]
result = subprocess.run(check_cmd, capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit("No se pudo conectar a PostgreSQL usando la URL proporcionada.")

if "1" in result.stdout:
    print("[setup] Base de datos existente; no se crea una nueva")
else:
    create_cmd = ["psql", admin_url, "-c", f"CREATE DATABASE {db_name}"]
    subprocess.check_call(create_cmd)
    print(f"[setup] Base de datos '{db_name}' creada")
PY
}

install_dependencies() {
  info "Instalando dependencias del backend"
  (cd "$BACKEND_DIR" && npm install)

  info "Instalando dependencias del frontend"
  (cd "$FRONTEND_DIR" && npm install)
}

prepare_prisma() {
  export DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
  info "Generando cliente Prisma"
  (cd "$BACKEND_DIR" && npx prisma generate --schema "$PRISMA_SCHEMA")

  info "Aplicando esquema a la base de datos (prisma db push)"
  (cd "$BACKEND_DIR" && npx prisma db push --schema "$PRISMA_SCHEMA")
}

start_services() {
  info "Levantando backend (npm run dev)"
  (cd "$BACKEND_DIR" && npm run dev) &
  BACK_PID=$!

  info "Levantando frontend (npm run dev -- --host --port 5173)"
  (cd "$FRONTEND_DIR" && npm run dev -- --host --port 5173) &
  FRONT_PID=$!

  trap 'info "Deteniendo servicios"; kill $BACK_PID $FRONT_PID 2>/dev/null' SIGINT SIGTERM
  wait $BACK_PID $FRONT_PID
}

main() {
  info "Preparando entorno..."
  create_backend_env
  create_frontend_env
  create_database_if_possible
  install_dependencies
  prepare_prisma
  start_services
}

main "$@"
