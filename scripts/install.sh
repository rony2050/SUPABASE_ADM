#!/usr/bin/env bash
# ==============================================================================
# Supabase Local Manager - Linux Automated Installer
# Instala Docker, dependências, CLI (supabase-ctl), API e Dashboard Web
# ==============================================================================

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="/opt/supabase-manager"
SCRIPT_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "\n${BOLD}${GREEN}"
cat << "EOF"
  ____                        _                        __  __                                   
 / ___| _   _ _ __   __ _    | |    ___   ___ __ _  |  \/  | __ _ _ __   __ _  __ _  ___ _ __ 
 \___ \| | | | '_ \ / _` |   | |   / _ \ / __/ _` | | |\/| |/ _` | '_ \ / _` |/ _` |/ _ \ '__|
  ___) | |_| | |_) | (_| |   | |__| (_) | (_| (_| | | |  | | (_| | | | | (_| | (_| |  __/ |   
 |____/ \__,_| .__/ \__,_|   |_____\___/ \___\__,_| |_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|   
             |_|                                                               |___/           
EOF
echo -e "${NC}${BOLD}Instalador Automatizado para Linux (Docker + CLI + Dashboard Web)${NC}\n"

# Checar privilégios de root
if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}✖ Este script precisa ser executado como root ou com sudo.${NC}"
  echo -e "Exemplo: sudo bash install.sh"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-$USER}"

log_step() { echo -e "\n${BLUE}==>${NC} ${BOLD}$1${NC}"; }
log_ok() { echo -e "${GREEN}✔ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

# 1. Identificar Distribuição Linux
log_step "Detectando distribuição Linux..."
DISTRO="unknown"
if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  DISTRO="$ID"
fi
echo -e "Distribuição detectada: ${CYAN}${DISTRO}${NC} (${PRETTY_NAME:-Linux})"

# 2. Instalar dependências básicas
log_step "Verificando e instalando pacotes essenciais (curl, jq, openssl)..."
case "$DISTRO" in
  ubuntu|debian|pop|linuxmint)
    apt-get update -qq
    apt-get install -y -qq curl jq openssl ca-certificates gnupg lsb-release net-tools
    ;;
  fedora|rhel|centos|rocky|almalinux)
    dnf install -y curl jq openssl ca-certificates iproute net-tools
    ;;
  arch|manjaro)
    pacman -Sy --noconfirm curl jq openssl ca-certificates iproute2 net-tools
    ;;
  alpine)
    apk add --no-cache curl jq openssl ca-certificates bash iproute2
    ;;
  *)
    log_warn "Distribuição não mapeada automaticamente. Certifique-se de ter curl, jq e openssl instalados."
    ;;
esac
log_ok "Pacotes essenciais instalados."

# 3. Instalar Docker e Docker Compose Plugin se não estiverem presentes
log_step "Verificando instalação do Docker e Docker Compose..."
if ! command -v docker >/dev/null 2>&1; then
  echo -e "Docker não encontrado. Instalando Docker Engine oficial..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  systemctl enable --now docker
  log_ok "Docker instalado e ativado."
else
  log_ok "Docker já está instalado: $(docker --version)"
fi

# Certificar que o serviço Docker está ativo
systemctl is-active --quiet docker || systemctl start docker

# Adicionar usuário ao grupo docker
if id -nG "$CURRENT_USER" | grep -qw "docker"; then
  log_ok "Usuário '${CURRENT_USER}' já faz parte do grupo docker."
else
  usermod -aG docker "$CURRENT_USER"
  log_ok "Usuário '${CURRENT_USER}' adicionado ao grupo docker."
fi

# Verificar plugin docker compose
if ! docker compose version >/dev/null 2>&1; then
  log_warn "Plugin 'docker compose' não encontrado. Instalando plugin compose..."
  case "$DISTRO" in
    ubuntu|debian|pop|linuxmint)
      apt-get update -qq && apt-get install -y -qq docker-compose-plugin
      ;;
    fedora|rhel|centos|rocky|almalinux)
      dnf install -y docker-compose-plugin
      ;;
    *)
      curl -SL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
      chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
      ;;
  esac
fi
log_ok "Docker Compose disponível: $(docker compose version)"

# 4. Verificar ou Instalar Node.js (necessário para o Dashboard e API do Manager)
log_step "Verificando Node.js para o Dashboard do Gerenciador..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 18 ]]; then
  echo -e "Instalando Node.js v20 LTS via NodeSource..."
  case "$DISTRO" in
    ubuntu|debian|pop|linuxmint)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
      ;;
    fedora|rhel|centos|rocky|almalinux)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      dnf install -y nodejs
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm nodejs npm
      ;;
    *)
      log_warn "Por favor, certifique-se de que o Node.js v18+ está instalado."
      ;;
  esac
fi
log_ok "Node.js instalado: $(node -v) (npm $(npm -v))"

# 5. Criar diretório do gerenciador e copiar arquivos
log_step "Configurando diretório de instalação em ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"/{scripts,server,client,instances,backups}

# Copiar arquivos do projeto
cp -r "${SCRIPT_SRC_DIR}/scripts"/* "${INSTALL_DIR}/scripts/"
cp -r "${SCRIPT_SRC_DIR}/server"/* "${INSTALL_DIR}/server/"
cp -r "${SCRIPT_SRC_DIR}/client"/* "${INSTALL_DIR}/client/"
cp -r "${SCRIPT_SRC_DIR}/systemd"/* "${INSTALL_DIR}/systemd/" 2>/dev/null || true
cp -r "${SCRIPT_SRC_DIR}/docker"/* "${INSTALL_DIR}/docker/" 2>/dev/null || true

# Permissões de execução nos scripts
chmod +x "${INSTALL_DIR}/scripts"/*.sh
chmod +x "${INSTALL_DIR}/scripts/lib"/*.sh

# Criar link simbólico para supabase-ctl no PATH global
ln -sf "${INSTALL_DIR}/scripts/supabase-ctl.sh" /usr/local/bin/supabase-ctl
log_ok "CLI 'supabase-ctl' instalado globalmente em /usr/local/bin/supabase-ctl."

# 6. Instalar dependências e compilar API e Dashboard
log_step "Compilando Backend e Frontend do Gerenciador..."
cd "${INSTALL_DIR}/server"
npm install --silent
npm run build 2>/dev/null || true

cd "${INSTALL_DIR}/client"
npm install --silent
npm run build

# Configurar permissões de diretório
chown -R "$CURRENT_USER":"$CURRENT_USER" "${INSTALL_DIR}"
chmod -R u+rwX "${INSTALL_DIR}"

# 7. Criar e Ativar Serviço Systemd
log_step "Registrando serviço systemd (supabase-manager.service)..."
cat << EOF > /etc/systemd/system/supabase-manager.service
[Unit]
Description=Supabase Local Instance Manager Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/server
ExecStart=/usr/bin/node ${INSTALL_DIR}/server/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8585
Environment=SUPABASE_MANAGER_DIR=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable supabase-manager.service
systemctl restart supabase-manager.service

# Obter IP local da máquina
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

# 8. Sucesso e Instruções
log_ok "Instalação concluída com sucesso!"
echo -e "\n${BOLD}${GREEN}======================================================================${NC}"
echo -e "${BOLD}🎉 SUPABASE LOCAL MANAGER INSTALADO COM SUCESSO!${NC}"
echo -e "${BOLD}${GREEN}======================================================================${NC}\n"
echo -e "  🌐 ${BOLD}Dashboard Web:${NC}     ${CYAN}http://${HOST_IP}:8585${NC} ou ${CYAN}http://localhost:8585${NC}"
echo -e "  ⚡ ${BOLD}CLI Terminal:${NC}      ${GREEN}supabase-ctl help${NC}"
echo -e "  📁 ${BOLD}Diretório Base:${NC}    ${PURPLE}${INSTALL_DIR}${NC}"
echo -e "  🔧 ${BOLD}Status Serviço:${NC}    ${YELLOW}systemctl status supabase-manager${NC}\n"

echo -e "${BOLD}Primeiros passos:${NC}"
echo -e "  1. Acesse o Dashboard pelo navegador em: ${CYAN}http://${HOST_IP}:8585${NC}"
echo -e "  2. Ou crie uma instância via terminal:"
echo -e "     ${GREEN}supabase-ctl create meu-projeto${NC}"
echo -e "  3. Visualize as credenciais e status com:"
echo -e "     ${GREEN}supabase-ctl keys meu-projeto${NC}"
echo -e "${BOLD}${GREEN}======================================================================${NC}\n"
