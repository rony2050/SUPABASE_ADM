# ⚡ Supabase Local Instance Manager para Linux

> Sistema completo para provisionar, gerenciar e monitorar múltiplas instâncias locais isoladas do **Supabase** via **Docker** e **Docker Compose** no Linux, com CLI automatizado (`supabase-ctl`) e **Dashboard Web** em tempo real.

![Supabase Local Manager](https://img.shields.io/badge/Supabase-Docker%20Compose-3ecf8e?style=for-the-badge&logo=supabase)
![Linux](https://img.shields.io/badge/Platform-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-v20%20LTS-339933?style=for-the-badge&logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
[![GitHub Repo](https://img.shields.io/badge/GitHub-rony2050%2FADM-181717?style=for-the-badge&logo=github)](https://github.com/rony2050/ADM)

---

## 🎯 Principais Recursos

- 🚀 **Multi-Tenant / Múltiplas Instâncias no Mesmo Servidor:** Execute N instâncias do Supabase concorrentes sem conflito de portas, graças ao cálculo e alocação automática de blocos de portas livres (`port offset`).
- 🔑 **Geração Automática de Credenciais Criptográficas:** Criação de `JWT_SECRET`, tokens `anon` e `service_role` (HS256 com claims e expiração de 10 anos), senhas seguras do PostgreSQL e chaves de criptografia para o Vault.
- 💻 **CLI Poderoso (`supabase-ctl`):** Crie, inicie, pare, reinicie, faça backup, visualize logs e remova instâncias diretamente pelo terminal do Linux.
- 📊 **Dashboard Web Moderno (Glassmorphism Dark Theme):**
  - Monitoramento de saúde dos containers de cada serviço (**Studio**, **Kong API**, **PostgreSQL**, **GoTrue Auth**, **PostgREST**, **Storage**, **Realtime**).
  - Acesso direto ao **Supabase Studio** oficial em 1 clique.
  - Modal de credenciais com visualização segura e cópia rápida de chaves e Connection Strings (`Prisma`, `Drizzle`, `psql`).
  - Terminal interativo com streaming de logs em tempo real (**Server-Sent Events**) com filtro por microserviço.
  - Wizard para criar novas instâncias com detecção de portas livres.
- 🐧 **Instalador Automatizado para Linux:** Suporte a Ubuntu, Debian, CentOS, RHEL, Fedora, Rocky Linux, AlmaLinux e Arch Linux. Instala Docker, Docker Compose, Node.js e registra o serviço no `systemd`.

---

## 🏗️ Arquitetura dos Microserviços por Instância

Cada instância criada é isolada em sua própria rede Docker (`supabase_net_<nome>`) e volumes dedicados:

| Serviço | Imagem Docker Oficial | Função | Porta Padrão (Base 54300) |
| :--- | :--- | :--- | :--- |
| **Studio UI** | `supabase/studio:latest` | Painel oficial web do Supabase | `Base + 3` (Ex: 54303) |
| **Kong Gateway** | `kong:2.8.1` | API Gateway unificada & CORS | `Base + 1` (Ex: 54301) |
| **PostgreSQL** | `supabase/postgres:15.6.1.143` | Banco com pgvector, pg_graphql, etc. | `Base + 0` (Ex: 54300) |
| **GoTrue Auth** | `supabase/gotrue:v2.158.1` | Autenticação (JWT, OAuth, Magic Link) | `Base + 5` (Ex: 54305) |
| **PostgREST** | `postgrest/postgrest:v12.2.0` | API REST instantânea | `Base + 4` (Ex: 54304) |
| **Storage API** | `supabase/storage-api:v1.11.13` | Armazenamento de arquivos e buckets | `Base + 6` (Ex: 54306) |
| **Realtime** | `supabase/realtime:v2.30.23` | WebSockets e presença | `Base + 7` (Ex: 54307) |
| **Meta** | `supabase/postgres-meta:v0.84.2`| Metadados internos do Postgres | `Base + 8` (Ex: 54308) |

---

## 🚀 Instalação Rápida no Linux

### Opção 1: Instalador Automatizado (Recomendado)

Clone o repositório no seu servidor Linux e execute o script de instalação como `root` ou `sudo`:

```bash
git clone https://github.com/rony2050/ADM.git /opt/supabase-manager
cd /opt/supabase-manager
sudo bash scripts/install.sh
```

O script irá automaticamente:
1. Validar ou instalar **Docker Engine** e o plugin **Docker Compose**.
2. Adicionar seu usuário ao grupo `docker`.
3. Instalar **Node.js LTS** e compilar o backend e o dashboard web.
4. Criar o link simbólico global do CLI `/usr/local/bin/supabase-ctl`.
5. Registrar e iniciar o serviço `supabase-manager.service` no `systemd`.

Ao final da instalação, o painel estará acessível em:
👉 **`http://<SEU_IP_DO_SERVIDOR>:8585`** ou **`http://localhost:8585`**

---

### Opção 2: Execução via Docker Compose (Sem instalar Node.js no Host)

Se preferir rodar o próprio gerenciador em um container Docker isolado:

```bash
docker compose -f docker/docker-compose.manager.yml up -d --build
```

O painel será iniciado na porta `8585`, acessando o Docker daemon do host através do socket `/var/run/docker.sock`.

---

## 💻 Guia do CLI (`supabase-ctl`)

O CLI `supabase-ctl` pode ser executado diretamente em qualquer terminal do Linux.

### 1. Criar uma nova instância
```bash
# Cria e inicia automaticamente a instância com credenciais seguras e portas auto-alocadas
supabase-ctl create meu-projeto

# Ou especificando um bloco de portas e senha customizada:
supabase-ctl create loja-virtual --port-base 54500 --db-pass "MinhaSenhaSuperForte123!"
```

### 2. Listar todas as instâncias e status
```bash
supabase-ctl list
```
*Saída de exemplo:*
```text
⚡ INSTÂNCIAS SUPABASE INSTALADAS
INSTÂNCIA          STATUS                 POSTGRES     KONG API     STUDIO UI                
─────────────────────────────────────────────────────────────────────────────────
meu-projeto        ● RUNNING              54300        54301        http://localhost:54303   
loja-virtual       ● RUNNING              54500        54501        http://localhost:54503   
```

### 3. Exibir chaves de API e strings de conexão
```bash
supabase-ctl keys meu-projeto
```
Exibe a **Anon Key**, **Service Role Key**, **JWT Secret**, endpoints de API e a **Connection String** pronta para colar no `.env` do seu frontend ou backend.

### 4. Editar configuração oficial (config.toml)
```bash
supabase-ctl config meu-projeto
```
Abre o arquivo `config.toml` da instância no editor de terminal (`$EDITOR`, `nano` ou `vim`) e pergunta se deseja reiniciar os containers para aplicar as alterações.

### 5. Iniciar, parar ou reiniciar
```bash
supabase-ctl stop meu-projeto
supabase-ctl start meu-projeto
supabase-ctl restart meu-projeto
```

### 6. Visualizar logs em tempo real
```bash
# Logs gerais da instância
supabase-ctl logs meu-projeto

# Logs específicos do serviço de autenticação ou banco de dados
supabase-ctl logs meu-projeto auth
supabase-ctl logs meu-projeto db
```

### 7. Fazer backup (Dump SQL)
```bash
# Gera backup com data e hora em /opt/supabase-manager/backups/
supabase-ctl backup meu-projeto
```

### 8. Destruir uma instância
```bash
# Remove containers e volumes permanentemente
supabase-ctl destroy meu-projeto
```

---

## 🖥️ Utilizando o Dashboard Web

Acesse `http://<IP_DO_SERVIDOR>:8585` no navegador para:
1. **Visualizar Cards de Telemetria:** Instâncias ativas, memória RAM e status do Docker Engine.
2. **Abrir o Studio:** Clique no botão **"Abrir Studio"** no card de qualquer instância para ser redirecionado diretamente ao painel oficial do Supabase para criar tabelas, gerenciar autenticação e buckets de Storage.
3. **Editar config.toml no Navegador:** Clique em **"Config"** para abrir o editor com syntax monospaced do `config.toml`, ajustar portas, domínios, redirects e salvar com reinício automático.
4. **Copiar Chaves Facilmente:** Clique em **"Credenciais"** para revelar e copiar em 1 clique a `anon_key`, `service_role_key` ou URI do PostgreSQL.
5. **Live Logs:** Clique em **"Logs"** para abrir o terminal integrado que faz streaming dos logs dos containers via Server-Sent Events (SSE).
6. **Reiniciar Serviços:** Botão **"Reiniciar"** individual em cada card de instância e botão **"Reiniciar App"** no cabeçalho do gerenciador.
7. **Criar Novas Instâncias:** Use o botão **"+ Nova Instância"** para configurar novos projetos em segundos.

---

## 📁 Estrutura de Diretórios

```text
/opt/supabase-manager/
├── scripts/
│   ├── install.sh                  # Script mestre de instalação no Linux
│   ├── supabase-ctl.sh             # CLI do terminal
│   ├── lib/
│   │   └── keygen.sh               # Gerador OpenSSL de tokens JWT e segredos
│   └── templates/
│       ├── docker-compose.template.yml  # Template dos containers Supabase
│       ├── .env.template                # Template de variáveis por porta
│       └── kong.template.yml            # Roteamento do API Gateway
├── server/                         # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/                 # Endpoints REST e streaming SSE
│   │   └── services/               # Ciclo de vida Docker, portas e telemetria
│   └── dist/                       # Backend compilado
├── client/                         # Frontend React + Vite + Tailwind
│   ├── src/
│   │   ├── components/             # Cards, Header, Modais de Credenciais e Logs
│   │   └── index.css               # Estilos glassmorphism e dark mode
│   └── dist/                       # Frontend compilado (servido pela API)
├── systemd/
│   └── supabase-manager.service    # Unidade systemd para execução contínua
├── docker/
│   ├── Dockerfile.manager          # Dockerfile para rodar o manager em container
│   └── docker-compose.manager.yml  # Compose do próprio manager
├── instances/                      # Diretório com as instâncias criadas
│   └── <nome-da-instancia>/
│       ├── docker-compose.yml
│       ├── .env
│       └── kong.yml
└── backups/                        # Dumps SQL gerados automaticamente
```

---

## 🛠️ Gerenciamento do Serviço no Linux

Caso o gerenciador seja instalado via `systemd`:

```bash
# Verificar status
sudo systemctl status supabase-manager

# Reiniciar serviço
sudo systemctl restart supabase-manager

# Ver logs do serviço
sudo journalctl -u supabase-manager -f
```

---

## 📄 Licença

MIT License. Desenvolvido para máxima produtividade em ambientes locais e servidores Linux de desenvolvimento e homologação.
