#!/usr/bin/env bash
set -euo pipefail

# Determinar si se usa el comando moderno `docker compose` o el antiguo `docker-compose`.
compose_cmd="docker-compose"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  compose_cmd="docker compose"
elif ! command -v docker-compose >/dev/null 2>&1; then
  echo "❌ Se requiere Docker Compose para levantar el proyecto." >&2
  exit 1
fi

# Posicionarnos en la raíz del proyecto y ejecutar el stack completo.
project_root="$(cd "$(dirname "$0")" && pwd)"
cd "$project_root"

$compose_cmd up --build "$@"
