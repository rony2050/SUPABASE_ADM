#!/usr/bin/env bash
# ==============================================================================
# Docker & Docker Compose Automated Installer for Linux
# Suporta: Ubuntu, Debian, Pop!_OS, Linux Mint, CentOS, RHEL, Rocky Linux,
#          AlmaLinux, Fedora, Arch Linux, Alpine Linux e derivados.
# ==============================================================================

set -euo pipefail

# Paleta de Cores ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_step() { echo -e "\n${BLUE}==>${NC} ${BOLD}$1${NC}"; }
log_ok()   { echo -e "${GREEN}✔ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_info() { echo -e "${CYAN}ℹ $1${NC}"; }
log_err()  { echo -e "${RED}✖ $1${NC}"; }

echo -e "\n${BOLD}${CYAN}"
cat << "EOF"
  ____             _             ___           _        _ _           
 |  _ \  ___   ___| | _____ _ __|_ _|_ __  ___| |_ __ _| | | ___ _ __ 
 | | | |/ _ \ / __| |/ / _ \ '__|| || '_ \/ __| __/ _` | | |/ _ \ '__|
 | |_| | (_) | (__|   <  __/ |   | || | | \__ \ || (_| | | |  __/ |   
 |____/ \___/ \___|_|\_\___|_|  |___|_| |_|___/\__\__,_|_|_|\___|_|   
EOF
echo -e "${NC}${BOLD}Instalador Automatizado do Docker Engine & Docker Compose para Linux${NC}\n"

# 1. Verificar privilégios de root
if [[ $EUID -ne 0 ]]; then
  log_err "Este instalador precisa ser executado como root ou com privilégios sudo."
  echo -e "Exemplo: ${BOLD}sudo bash install-docker.sh${NC}\n"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-$USER}"

# 2. Identificar Distribuição Linux e Arquitetura
log_step "Identificando sistema operacional e arquitetura..."
DISTRO="unknown"
DISTRO_LIKE=""
PRETTY_NAME="Linux"

if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  DISTRO="${ID:-unknown}"
  DISTRO_LIKE="${ID_LIKE:-}"
  PRETTY_NAME="${PRETTY_NAME:-$DISTRO}"
fi

ARCH="$(uname -m)"
echo -e "Sistema:      ${BOLD}${PRETTY_NAME}${NC} (${DISTRO})"
echo -e "Arquitetura:  ${BOLD}${ARCH}${NC}"
echo -e "Usuário alvo: ${BOLD}${CURRENT_USER}${NC}"

# 3. Verificar se Docker e Compose já estão instalados
log_step "Verificando se Docker já está instalado..."
DOCKER_PRESENT=false
COMPOSE_PRESENT=false

if command -v docker >/dev/null 2>&1; then
  DOCKER_PRESENT=true
  DOCKER_VER="$(docker --version 2>/dev/null || echo 'desconhecido')"
  log_info "Docker já detectado: ${BOLD}${DOCKER_VER}${NC}"
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_PRESENT=true
  COMPOSE_VER="$(docker compose version 2>/dev/null || echo 'desconhecido')"
  log_info "Docker Compose já detectado: ${BOLD}${COMPOSE_VER}${NC}"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_PRESENT=true
  COMPOSE_VER="$(docker-compose --version 2>/dev/null || echo 'desconhecido')"
  log_info "docker-compose (standalone) detectado: ${BOLD}${COMPOSE_VER}${NC}"
fi

if [[ "$DOCKER_PRESENT" = true && "$COMPOSE_PRESENT" = true ]]; then
  log_ok "Docker e Docker Compose já se encontram instalados!"
  read -r -p "Deseja reinstalar/atualizar o Docker e reconfigurar o ambiente? [s/N]: " REINSTALL || REINSTALL="n"
  if [[ ! "$REINSTALL" =~ ^[sSyY]$ ]]; then
    log_info "Pulando instalação de pacotes e indo para checagem de serviço e permissões..."
    SKIP_PKG_INSTALL=true
  else
    SKIP_PKG_INSTALL=false
  fi
else
  SKIP_PKG_INSTALL=false
fi

# 4. Instalação do Docker Engine e plugins
if [[ "${SKIP_PKG_INSTALL:-false}" = false ]]; then
  log_step "Instalando pré-requisitos essenciais..."
  case "$DISTRO" in
    ubuntu|debian|pop|linuxmint|elementary|raspbian)
      apt-get update -qq
      apt-get install -y -qq curl ca-certificates gnupg lsb-release iptables
      ;;
    fedora|rhel|centos|rocky|almalinux|amazonlinux)
      if command -v dnf >/dev/null 2>&1; then
        dnf install -y -q curl ca-certificates iptables
      elif command -v yum >/dev/null 2>&1; then
        yum install -y -q curl ca-certificates iptables
      fi
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm --needed curl ca-certificates iptables
      ;;
    alpine)
      apk add --no-cache curl ca-certificates bash iptables
      ;;
    opensuse*|sles)
      zypper install -y curl ca-certificates iptables
      ;;
    *)
      log_warn "Distribuição não mapeada diretamente ($DISTRO). Tentaremos usar 'curl'."
      ;;
  esac

  log_step "Baixando e executando instalador oficial do Docker Engine..."
  case "$DISTRO" in
    arch|manjaro)
      log_info "Instalando Docker e Docker Compose via pacman..."
      pacman -S --noconfirm docker docker-compose
      ;;
    alpine)
      log_info "Instalando Docker e Docker Compose via apk..."
      apk add --no-cache docker docker-cli-compose
      ;;
    *)
      # Script oficial Docker para a grande maioria das distribuições Linux
      INSTALL_SCRIPT="/tmp/get-docker.sh"
      curl -fsSL https://get.docker.com -o "$INSTALL_SCRIPT"
      sh "$INSTALL_SCRIPT"
      rm -f "$INSTALL_SCRIPT"
      ;;
  esac
  log_ok "Docker Engine e plugins instalados com sucesso!"
fi

# 5. Otimização do Daemon Docker (/etc/docker/daemon.json)
log_step "Configurando /etc/docker/daemon.json (rotação de logs e live-restore)..."
mkdir -p /etc/docker

if [[ ! -f /etc/docker/daemon.json ]]; then
  cat <<'EOF' > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF
  log_ok "Configuração de daemon criada com rotação de logs (max 20MB x 3 arquivos) e live-restore."
else
  log_info "Arquivo /etc/docker/daemon.json já existente. Preservando configuração atual."
fi

# 6. Habilitar e Iniciar o Serviço Docker
log_step "Habilitando e inicializando serviço Docker no sistema..."
if command -v systemctl >/dev/null 2>&1; then
  systemctl daemon-reload || true
  systemctl enable docker
  systemctl restart docker
  log_ok "Serviço Docker ativado e iniciado via systemd."
elif command -v service >/dev/null 2>&1; then
  service docker restart || service docker start
  log_ok "Serviço Docker iniciado via sysvinit/service."
elif command -v rc-service >/dev/null 2>&1; then
  rc-update add docker default || true
  rc-service docker restart || rc-service docker start
  log_ok "Serviço Docker iniciado via OpenRC."
fi

# 7. Configurar Grupo Docker e Permissões de Usuário
log_step "Configurando permissões para o usuário '${CURRENT_USER}'..."
if ! getent group docker >/dev/null 2>&1; then
  groupadd docker
  log_ok "Grupo 'docker' criado."
fi

if [[ "$CURRENT_USER" != "root" ]]; then
  if id -nG "$CURRENT_USER" | grep -qw "docker"; then
    log_ok "Usuário '${CURRENT_USER}' já faz parte do grupo 'docker'."
  else
    usermod -aG docker "$CURRENT_USER"
    log_ok "Usuário '${CURRENT_USER}' adicionado ao grupo 'docker'."
    log_warn "Nota: Para rodar comandos sem sudo na sessão atual, execute: ${BOLD}newgrp docker${NC}"
  fi
fi

# 8. Validação Final
log_step "Validando instalação do Docker..."
if docker --version >/dev/null 2>&1; then
  FINAL_DOCKER_VER="$(docker --version)"
  log_ok "${FINAL_DOCKER_VER}"
else
  log_err "Falha na detecção do binário docker."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  FINAL_COMPOSE_VER="$(docker compose version)"
  log_ok "${FINAL_COMPOSE_VER}"
elif command -v docker-compose >/dev/null 2>&1; then
  FINAL_COMPOSE_VER="$(docker-compose --version)"
  log_ok "${FINAL_COMPOSE_VER}"
else
  log_warn "Docker Compose Plugin não detectado diretamente. Verifique os plugins instalados."
fi

# Teste de comunicação com o Daemon
if docker info >/dev/null 2>&1; then
  log_ok "Comunicação com o Docker Daemon validada com sucesso!"
else
  log_warn "O Docker Daemon ainda pode estar inicializando ou com permissão restrita."
fi

echo -e "\n${BOLD}${GREEN}========================================================================${NC}"
echo -e "${BOLD}${GREEN}✔ Instalação do Docker e Docker Compose concluída com sucesso!${NC}"
echo -e "${BOLD}${GREEN}========================================================================${NC}\n"
echo -e "Instruções adicionais:"
if [[ "$CURRENT_USER" != "root" ]]; then
  echo -e "  1. Para atualizar o grupo sem deslogar, execute: ${BOLD}newgrp docker${NC}"
fi
echo -e "  2. Teste executando: ${BOLD}docker run --rm hello-world${NC}"
echo -e "  3. Para instalar o Supabase Local Manager: ${BOLD}sudo bash scripts/install.sh${NC}\n"
