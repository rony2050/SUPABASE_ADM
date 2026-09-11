#!/usr/bin/env bash
# ==============================================================================
# Supabase Local CLI Controller (supabase-ctl)
# Gerenciamento avançado de instâncias Supabase via Docker no Linux
# ==============================================================================

set -euo pipefail

# Cores e Formatação
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Diretórios padrão
SCRIPT_SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SCRIPT_SOURCE" ]; do
  SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  SCRIPT_SOURCE="$(readlink "$SCRIPT_SOURCE")"
  [[ $SCRIPT_SOURCE != /* ]] && SCRIPT_SOURCE="$SCRIPT_DIR/$SCRIPT_SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
BASE_DIR="${SUPABASE_MANAGER_DIR:-/opt/supabase-manager}"
INSTANCES_DIR="${BASE_DIR}/instances"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"
LIB_DIR="${SCRIPT_DIR}/lib"

if [[ ! -d "$LIB_DIR" && -d "${BASE_DIR}/scripts/lib" ]]; then
  LIB_DIR="${BASE_DIR}/scripts/lib"
fi
if [[ ! -d "$TEMPLATES_DIR" && -d "${BASE_DIR}/scripts/templates" ]]; then
  TEMPLATES_DIR="${BASE_DIR}/scripts/templates"
fi

mkdir -p "${INSTANCES_DIR}"

# Carregar biblioteca de chaves
if [[ -f "${LIB_DIR}/keygen.sh" ]]; then
  # shellcheck source=/dev/null
  source "${LIB_DIR}/keygen.sh"
elif [[ -f "${BASE_DIR}/scripts/lib/keygen.sh" ]]; then
  source "${BASE_DIR}/scripts/lib/keygen.sh"
else
  echo "Erro: keygen.sh não encontrado em ${LIB_DIR} ou ${BASE_DIR}/scripts/lib" >&2
  exit 1
fi

log_info() { echo -e "${BLUE}ℹ${NC} ${BOLD}$1${NC}"; }
log_success() { echo -e "${GREEN}✔${NC} ${BOLD}$1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠${NC} ${BOLD}$1${NC}"; }
log_error() { echo -e "${RED}✖${NC} ${BOLD}$1${NC}"; }

# Verificar se uma porta está em uso no sistema host
is_port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tuln | grep -q ":${port} "
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | grep -q ":${port} "
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i ":${port}" >/dev/null 2>&1
  else
    (echo > "/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
  fi
}

# Encontrar o próximo bloco de portas livre
find_next_free_port_base() {
  local base_candidate=54300
  local found=0

  while [[ $found -eq 0 ]]; do
    local in_use=0
    # Checar intervalo de 10 portas consecutivas para a instância
    for ((p=0; p<10; p++)); do
      local check_port=$((base_candidate + p))
      if is_port_in_use "$check_port"; then
        in_use=1
        break
      fi
    done

    # Checar se já existe instância configurada com esse base
    if [[ -d "${INSTANCES_DIR}" ]]; then
      for inst in "${INSTANCES_DIR}"/*; do
        if [[ -f "${inst}/.env" ]]; then
          if grep -q "POSTGRES_PORT=${base_candidate}" "${inst}/.env" 2>/dev/null; then
            in_use=1
            break
          fi
        fi
      done
    fi

    if [[ $in_use -eq 0 ]]; then
      found=1
      echo "$base_candidate"
      return 0
    fi
    base_candidate=$((base_candidate + 100))
  done
}

# Criar nova instância
cmd_create() {
  local name="${1:-}"
  shift || true

  if [[ -z "$name" ]]; then
    log_error "Uso: supabase-ctl create <nome-da-instancia> [--port-base <porta>] [--db-pass <senha>] [--no-start]"
    exit 1
  fi

  # Validar nome
  if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    log_error "Nome inválido! Use apenas letras, números, hífens e sublinhados."
    exit 1
  fi

  local instance_dir="${INSTANCES_DIR}/${name}"
  if [[ -d "$instance_dir" ]]; then
    log_error "A instância '${name}' já existe em ${instance_dir}!"
    exit 1
  fi

  local custom_port_base=""
  local custom_db_pass=""
  local custom_domain="jcode.api.br"
  local custom_api_url=""
  local custom_studio_url=""
  local start_after=1

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --port-base)
        custom_port_base="$2"
        shift 2
        ;;
      --db-pass)
        custom_db_pass="$2"
        shift 2
        ;;
      --domain)
        custom_domain="$2"
        shift 2
        ;;
      --api-url)
        custom_api_url="$2"
        shift 2
        ;;
      --studio-url)
        custom_studio_url="$2"
        shift 2
        ;;
      --no-start)
        start_after=0
        shift
        ;;
      *)
        log_error "Opção desconhecida: $1"
        exit 1
        ;;
    esac
  done

  log_info "Provisionando nova instância Supabase: ${BOLD}${name}${NC}..."

  # Calcular portas
  local port_base
  if [[ -n "$custom_port_base" ]]; then
    port_base="$custom_port_base"
  else
    port_base=$(find_next_free_port_base)
  fi

  local port_postgres=$((port_base + 0))   # Ex: 54300
  local port_kong=$((port_base + 1))       # Ex: 54301
  local port_kong_ssl=$((port_base + 2))   # Ex: 54302
  local port_studio=$((port_base + 3))     # Ex: 54303
  local port_rest=$((port_base + 4))       # Ex: 54304
  local port_auth=$((port_base + 5))       # Ex: 54305
  local port_storage=$((port_base + 6))    # Ex: 54306
  local port_realtime=$((port_base + 7))   # Ex: 54307
  local port_meta=$((port_base + 8))       # Ex: 54308

  # Garantir que volumes residuais antigos com o mesmo nome sejam removidos
  docker volume rm -f "supabase_db_data_${name}" "supabase_storage_data_${name}" 2>/dev/null || true

  mkdir -p "$instance_dir"

  # Gerar credenciais
  log_info "Gerando chaves criptográficas (JWT, Anon, Service Role)..."
  CUSTOM_DB_PASSWORD="$custom_db_pass"
  export CUSTOM_DB_PASSWORD
  local creds
  creds=$(generate_supabase_credentials)

  # Extrair valores
  local jwt_secret anon_key service_role_key db_password dashboard_password secret_key_base vault_enc_key
  jwt_secret=$(echo "$creds" | grep '^JWT_SECRET=' | cut -d= -f2- | tr -d '\r')
  anon_key=$(echo "$creds" | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '\r')
  service_role_key=$(echo "$creds" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '\r')
  db_password=$(echo "$creds" | grep '^POSTGRES_PASSWORD=' | cut -d= -f2- | tr -d '\r')
  dashboard_password=$(echo "$creds" | grep '^DASHBOARD_PASSWORD=' | cut -d= -f2- | tr -d '\r')
  secret_key_base=$(echo "$creds" | grep '^SECRET_KEY_BASE=' | cut -d= -f2- | tr -d '\r')
  vault_enc_key=$(echo "$creds" | grep '^VAULT_ENC_KEY=' | cut -d= -f2- | tr -d '\r')

  # Calcular URLs públicas (com ou sem domínio de túnel)
  local site_url="http://localhost:${port_studio}"
  local api_external_url="http://localhost:${port_kong}"
  local supabase_public_url="http://localhost:${port_kong}"
  local allow_list="*"

  if [[ -n "$custom_domain" ]]; then
    api_external_url="https://${name}.${custom_domain}"
    supabase_public_url="https://${name}.${custom_domain}"
    site_url="https://${name}-studio.${custom_domain}"
    allow_list="${site_url},${site_url}/**,${api_external_url},${api_external_url}/**,http://localhost:3000,http://localhost:3000/**"
  fi

  if [[ -n "$custom_api_url" ]]; then
    api_external_url="$custom_api_url"
    supabase_public_url="$custom_api_url"
  fi

  if [[ -n "$custom_studio_url" ]]; then
    site_url="$custom_studio_url"
  fi

  # Gerar .env
  log_info "Configurando ambiente e portas (Base: ${port_base})..."
  sed -e "s|\${INSTANCE_NAME}|${name}|g" \
      -e "s|\${SITE_URL}|${site_url}|g" \
      -e "s|\${API_EXTERNAL_URL}|${api_external_url}|g" \
      -e "s|\${SUPABASE_PUBLIC_URL}|${supabase_public_url}|g" \
      -e "s|\${GOTRUE_URI_ALLOW_LIST}|${allow_list}|g" \
      -e "s|\${POSTGRES_PORT}|${port_postgres}|g" \
      -e "s|\${KONG_HTTP_PORT}|${port_kong}|g" \
      -e "s|\${KONG_HTTPS_PORT}|${port_kong_ssl}|g" \
      -e "s|\${STUDIO_PORT}|${port_studio}|g" \
      -e "s|\${REST_PORT}|${port_rest}|g" \
      -e "s|\${AUTH_PORT}|${port_auth}|g" \
      -e "s|\${STORAGE_PORT}|${port_storage}|g" \
      -e "s|\${REALTIME_PORT}|${port_realtime}|g" \
      -e "s|\${META_PORT}|${port_meta}|g" \
      -e "s|\${POSTGRES_PASSWORD}|${db_password}|g" \
      -e "s|\${JWT_SECRET}|${jwt_secret}|g" \
      -e "s|\${ANON_KEY}|${anon_key}|g" \
      -e "s|\${SERVICE_ROLE_KEY}|${service_role_key}|g" \
      -e "s|\${DASHBOARD_PASSWORD}|${dashboard_password}|g" \
      -e "s|\${SECRET_KEY_BASE}|${secret_key_base}|g" \
      -e "s|\${VAULT_ENC_KEY}|${vault_enc_key}|g" \
      "${TEMPLATES_DIR}/.env.template" > "${instance_dir}/.env"

  # Gerar kong.yml
  sed -e "s|\${ANON_KEY}|${anon_key}|g" \
      -e "s|\${SERVICE_ROLE_KEY}|${service_role_key}|g" \
      "${TEMPLATES_DIR}/kong.template.yml" > "${instance_dir}/kong.yml"

  # Copiar docker-compose.yml
  cp "${TEMPLATES_DIR}/docker-compose.template.yml" "${instance_dir}/docker-compose.yml"

  # Copiar arquivos do cliente de túnel (runner, client, node_modules)
  local tunnel_target="${instance_dir}/tunnel"
  mkdir -p "$tunnel_target"
  local tunnel_src=""
  if [[ -d "${TEMPLATES_DIR}/../tunnel" ]]; then
    tunnel_src="${TEMPLATES_DIR}/../tunnel"
  elif [[ -d "${BASE_DIR}/scripts/tunnel" ]]; then
    tunnel_src="${BASE_DIR}/scripts/tunnel"
  elif [[ -d "/opt/supabase-manager/scripts/tunnel" ]]; then
    tunnel_src="/opt/supabase-manager/scripts/tunnel"
  fi
  if [[ -n "$tunnel_src" && -d "$tunnel_src" ]]; then
    cp -r "$tunnel_src"/* "$tunnel_target/" 2>/dev/null || true
  fi

  # Gerar config.toml com subdomínios oficiais jcode.api.br
  local config_file="${instance_dir}/config.toml"
  cat <<EOF > "$config_file"
# Supabase Configuration for instance: ${name}
# Documentation: https://supabase.com/docs/guides/local-development/cli/config

project_id = "${name}"

[api]
enabled = true
port = ${port_kong}
external_url = "${api_external_url}"
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = ${port_postgres}
shadow_port = $((port_postgres - 2))
health_timeout = "2m"
major_version = 15

[studio]
enabled = true
port = ${port_studio}
api_url = "${supabase_public_url}"

[local_smtp]
enabled = true
port = $((port_studio + 1))

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "${site_url}"
additional_redirect_urls = [
  "${site_url}",
  "${site_url}/**",
  "${api_external_url}",
  "${api_external_url}/**",
  "http://localhost:3000",
  "http://localhost:3000/**"
]
jwt_expiry = 315360000
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = false
EOF

  # Normalizar finais de linha para UNIX (remover qualquer \r)
  sed -i 's/\r$//' "${instance_dir}/.env" "${instance_dir}/kong.yml" "${instance_dir}/docker-compose.yml" "${config_file}" 2>/dev/null || true

  log_success "Instância '${name}' configurada com sucesso!"
  echo -e "  • ${BOLD}Studio Web UI:${NC}    ${CYAN}${site_url}${NC} (Local: http://localhost:${port_studio})"
  echo -e "  • ${BOLD}Kong API Gateway:${NC} ${CYAN}${api_external_url}${NC} (Local: http://localhost:${port_kong})"
  echo -e "  • ${BOLD}PostgreSQL DB:${NC}    ${CYAN}localhost:${port_postgres}${NC}"
  echo -e "  • ${BOLD}DB Password:${NC}      ${YELLOW}${db_password}${NC}"
  echo -e "  • ${BOLD}Túneis Ativos:${NC}     ${GREEN}https://${name}.${custom_domain}${NC} | ${GREEN}https://${name}-studio.${custom_domain}${NC}"

  if [[ $start_after -eq 1 ]]; then
    log_info "Iniciando containers da instância..."
    cmd_start "$name"
  else
    log_info "Instância pronta para iniciar. Execute: supabase-ctl start ${name}"
  fi
}

# Iniciar instância
cmd_start() {
  local name="$1"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  log_info "Iniciando Supabase [${name}]..."
  (cd "$instance_dir" && docker compose up -d)

  # Sincronizar senhas e permissões diretamente no PostgreSQL via 127.0.0.1 (trust local)
  local db_container="supabase_${name}_db"
  local db_password
  db_password=$(grep '^POSTGRES_PASSWORD=' "${instance_dir}/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r')
  if [[ -n "$db_password" ]]; then
    local max_attempts=30
    local attempt=1
    while [[ $attempt -le $max_attempts ]]; do
      if docker exec "$db_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
        break
      fi
      sleep 1
      attempt=$((attempt + 1))
    done

    if docker exec "$db_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
      docker exec "$db_container" psql -h 127.0.0.1 -U supabase_admin -d postgres -c "
        ALTER USER supabase_admin WITH PASSWORD '${db_password}';
        ALTER USER postgres WITH PASSWORD '${db_password}';
        ALTER USER anon WITH PASSWORD '${db_password}';
        ALTER USER authenticated WITH PASSWORD '${db_password}';
        ALTER USER authenticator WITH PASSWORD '${db_password}';
        ALTER USER supabase_auth_admin WITH PASSWORD '${db_password}';
        ALTER USER supabase_storage_admin WITH PASSWORD '${db_password}';
        CREATE SCHEMA IF NOT EXISTS _realtime;
        ALTER SCHEMA _realtime OWNER TO supabase_admin;
      " >/dev/null 2>&1 || true

      # Reiniciar servicos para reconectar com credenciais validadas
      (cd "$instance_dir" && docker compose restart rest storage auth meta realtime >/dev/null 2>&1 || true)
    fi
  fi

  log_success "Instância [${name}] iniciada!"
}

# Parar instância
cmd_stop() {
  local name="$1"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  log_info "Parando Supabase [${name}]..."
  (cd "$instance_dir" && docker compose stop)
  log_success "Instância [${name}] parada."
}

# Reiniciar instância
cmd_restart() {
  local name="$1"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  log_info "Reiniciando Supabase [${name}]..."
  (cd "$instance_dir" && docker compose restart)
  log_success "Instância [${name}] reiniciada!"
}

# Listar instâncias e status
cmd_list() {
  echo -e "\n${BOLD}${PURPLE}⚡ INSTÂNCIAS SUPABASE INSTALADAS${NC}"
  printf "${BOLD}%-18s %-12s %-12s %-12s %-25s${NC}\n" "INSTÂNCIA" "STATUS" "POSTGRES" "KONG API" "STUDIO UI"
  echo "─────────────────────────────────────────────────────────────────────────────────"

  local count=0
  if [[ -d "${INSTANCES_DIR}" ]]; then
    for inst in "${INSTANCES_DIR}"/*; do
      if [[ -d "$inst" && -f "${inst}/.env" ]]; then
        count=$((count + 1))
        local name
        name=$(basename "$inst")
        local pg_port kong_port studio_port
        pg_port=$(grep '^POSTGRES_PORT=' "${inst}/.env" 2>/dev/null | cut -d= -f2- || echo "-")
        kong_port=$(grep '^KONG_HTTP_PORT=' "${inst}/.env" 2>/dev/null | cut -d= -f2- || echo "-")
        studio_port=$(grep '^STUDIO_PORT=' "${inst}/.env" 2>/dev/null | cut -d= -f2- || echo "-")

        # Verificar se está rodando
        local running_containers
        running_containers=$(docker ps --filter "name=supabase_${name}_" --filter "status=running" -q 2>/dev/null | wc -l || echo 0)
        local status_str
        if [[ $running_containers -ge 6 ]]; then
          status_str="${GREEN}● RUNNING${NC}"
        elif [[ $running_containers -gt 0 ]]; then
          status_str="${YELLOW}◐ PARTIAL${NC}"
        else
          status_str="${RED}○ STOPPED${NC}"
        fi

        printf "%-18s %-22b %-12s %-12s %-25s\n" \
          "$name" "$status_str" "$pg_port" "$kong_port" "http://localhost:${studio_port}"
      fi
    done
  fi

  if [[ $count -eq 0 ]]; then
    echo -e "${YELLOW}Nenhuma instância encontrada. Crie uma com: supabase-ctl create <nome>${NC}"
  fi
  echo ""
}

# Exibir chaves e dados de conexão
cmd_keys() {
  local name="$1"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -f "${instance_dir}/.env" ]]; then
    log_error "Arquivo de configuração da instância '${name}' não encontrado!"
    exit 1
  fi

  # shellcheck source=/dev/null
  source "${instance_dir}/.env"

  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD} 🔑 CREDENCIAIS DA INSTÂNCIA: ${GREEN}${INSTANCE_NAME}${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${NC}\n"

  echo -e "${BOLD}🌐 URLs de Acesso:${NC}"
  echo -e "  • Studio UI:         ${CYAN}http://localhost:${STUDIO_PORT}${NC}"
  echo -e "  • API Gateway (Kong):${CYAN}http://localhost:${KONG_HTTP_PORT}${NC}"
  echo -e "  • REST API:          ${CYAN}http://localhost:${KONG_HTTP_PORT}/rest/v1${NC}"
  echo -e "  • Auth API:          ${CYAN}http://localhost:${KONG_HTTP_PORT}/auth/v1${NC}"
  echo -e "  • Storage API:       ${CYAN}http://localhost:${KONG_HTTP_PORT}/storage/v1${NC}"
  echo -e "  • Realtime Socket:   ${CYAN}ws://localhost:${KONG_HTTP_PORT}/realtime/v1${NC}\n"

  echo -e "${BOLD}🗄️ Conexão PostgreSQL:${NC}"
  echo -e "  • Host:              localhost"
  echo -e "  • Port:              ${POSTGRES_PORT}"
  echo -e "  • User:              postgres"
  echo -e "  • Password:          ${YELLOW}${POSTGRES_PASSWORD}${NC}"
  echo -e "  • Database:          postgres"
  echo -e "  • Connection String: ${PURPLE}postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/postgres${NC}\n"

  echo -e "${BOLD}🛡️ Chaves de Autenticação:${NC}"
  echo -e "  • Anon Key (Pública):"
  echo -e "    ${CYAN}${ANON_KEY}${NC}\n"
  echo -e "  • Service Role Key (Admin):"
  echo -e "    ${RED}${SERVICE_ROLE_KEY}${NC}\n"
  echo -e "  • JWT Secret:"
  echo -e "    ${YELLOW}${JWT_SECRET}${NC}\n"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════${NC}\n"
}

# Ver logs
cmd_logs() {
  local name="$1"
  local service="${2:-}"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  if [[ -n "$service" ]]; then
    (cd "$instance_dir" && docker compose logs -f "$service")
  else
    (cd "$instance_dir" && docker compose logs -f --tail=100)
  fi
}

# Fazer backup do banco de dados (pg_dump)
cmd_backup() {
  local name="$1"
  local dest="${2:-${BASE_DIR}/backups/${name}_backup_$(date +%Y%m%d_%H%M%S).sql}"
  local container_name="supabase_${name}_db"

  mkdir -p "$(dirname "$dest")"

  log_info "Criando backup da instância '${name}' para: ${dest}..."
  if docker exec -t "$container_name" pg_dump -U postgres postgres > "$dest"; then
    log_success "Backup concluído com sucesso! Tamanho: $(du -h "$dest" | cut -f1)"
  else
    log_error "Falha ao executar pg_dump no container ${container_name}."
    exit 1
  fi
}

# Destruir instância
cmd_destroy() {
  local name="$1"
  local keep_volumes="${2:-}"
  local instance_dir="${INSTANCES_DIR}/${name}"

  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  echo -e "${RED}${BOLD}ATENÇÃO: Você está prestes a DESTRUIR a instância '${name}'!${NC}"
  read -r -p "Tem certeza absoluta que deseja continuar? (s/N): " confirm
  if [[ "$confirm" != "s" && "$confirm" != "S" && "$confirm" != "y" && "$confirm" != "Y" ]]; then
    log_warn "Operação cancelada."
    return 0
  fi

  log_info "Parando e removendo containers..."
  if [[ "$keep_volumes" == "--keep-volumes" ]]; then
    (cd "$instance_dir" && docker compose down)
  else
    (cd "$instance_dir" && docker compose down -v)
    docker volume rm -f "supabase_db_data_${name}" "supabase_storage_data_${name}" 2>/dev/null || true
  fi

  rm -rf "$instance_dir"
  log_success "Instância '${name}' removida completamente!"
}

# Editar config.toml da instância
cmd_config() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    log_error "Uso: supabase-ctl config <nome-da-instancia>"
    exit 1
  fi

  local instance_dir="${INSTANCES_DIR}/${name}"
  if [[ ! -d "$instance_dir" ]]; then
    log_error "Instância '${name}' não encontrada!"
    exit 1
  fi

  local config_file="${instance_dir}/config.toml"
  if [[ ! -f "$config_file" ]]; then
    log_info "Criando config.toml a partir do ambiente atual da instância..."
    # shellcheck source=/dev/null
    source "${instance_dir}/.env"
    cat <<EOF > "$config_file"
# Supabase Configuration for instance: ${name}
# Documentation: https://supabase.com/docs/guides/local-development/cli/config

project_id = "${name}"

[api]
enabled = true
port = ${KONG_HTTP_PORT}
external_url = "${API_EXTERNAL_URL}"
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = ${POSTGRES_PORT}
shadow_port = $((POSTGRES_PORT - 2))
health_timeout = "2m"
major_version = 15

[studio]
enabled = true
port = ${STUDIO_PORT}
api_url = "${SUPABASE_PUBLIC_URL}"

[local_smtp]
enabled = true
port = $((STUDIO_PORT + 1))

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "${SITE_URL}"
additional_redirect_urls = [
  "${SITE_URL}",
  "${API_EXTERNAL_URL}"
]
jwt_expiry = ${JWT_EXPIRY:-3600}
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = false
EOF
  fi

  log_info "Abrindo ${config_file} com o editor ${EDITOR:-nano}..."
  "${EDITOR:-nano}" "$config_file"

  read -r -p "Deseja reiniciar os containers de '${name}' para aplicar as alterações? (s/N): " restart_conf
  if [[ "$restart_conf" == "s" || "$restart_conf" == "S" || "$restart_conf" == "y" || "$restart_conf" == "Y" ]]; then
    cmd_restart "$name"
  fi
}

# Menu de ajuda
cmd_help() {
  cat <<EOF
${BOLD}Supabase Local CLI Controller (supabase-ctl)${NC}

${BOLD}USO:${NC}
  supabase-ctl <comando> [argumentos...]

${BOLD}COMANDOS DISPONÍVEIS:${NC}
  ${GREEN}create <nome>${NC} [opts]       Cria e inicializa uma nova instância Supabase
                             Opções: --port-base <porta>
                                     --db-pass <senha>
                                     --no-start
  ${GREEN}list${NC}                      Lista todas as instâncias e seus status
  ${GREEN}start <nome>${NC}              Inicia os containers da instância
  ${GREEN}stop <nome>${NC}               Para os containers da instância
  ${GREEN}restart <nome>${NC}            Reinicia os containers da instância
  ${GREEN}keys <nome>${NC}               Exibe URLs, credenciais, JWTs e string de conexão
  ${GREEN}config <nome>${NC}             Edita o arquivo config.toml da instância
  ${GREEN}logs <nome> [serviço]${NC}      Visualiza logs em tempo real (ex: logs dev auth)
  ${GREEN}backup <nome> [destino]${NC}    Exporta dump SQL do PostgreSQL
  ${GREEN}destroy <nome>${NC} [--keep-vol] Remove a instância permanentemente

${BOLD}EXEMPLOS:${NC}
  supabase-ctl create projeto-app
  supabase-ctl create loja-virtual --port-base 54500
  supabase-ctl list
  supabase-ctl config projeto-app
  supabase-ctl keys projeto-app
  supabase-ctl logs projeto-app kong
EOF
}

# Roteador principal
case "${1:-}" in
  create)      shift; cmd_create "$@" ;;
  start)       shift; cmd_start "$@" ;;
  stop)        shift; cmd_stop "$@" ;;
  restart)     shift; cmd_restart "$@" ;;
  list)        cmd_list ;;
  keys)        shift; cmd_keys "$@" ;;
  config|edit) shift; cmd_config "$@" ;;
  logs)        shift; cmd_logs "$@" ;;
  backup)      shift; cmd_backup "$@" ;;
  destroy)     shift; cmd_destroy "$@" ;;
  help|--help|-h|"") cmd_help ;;
  *)
    log_error "Comando desconhecido: $1"
    cmd_help
    exit 1
    ;;
esac
