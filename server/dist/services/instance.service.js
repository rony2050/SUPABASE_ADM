"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instanceService = exports.InstanceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const command_1 = require("../utils/command");
const port_service_1 = require("./port.service");
class InstanceService {
    baseDir;
    instancesDir;
    scriptsDir;
    constructor() {
        this.baseDir = process.env.SUPABASE_MANAGER_DIR || path_1.default.resolve(__dirname, '../../../');
        this.instancesDir = path_1.default.join(this.baseDir, 'instances');
        this.scriptsDir = path_1.default.join(this.baseDir, 'scripts');
        if (!fs_1.default.existsSync(this.instancesDir)) {
            fs_1.default.mkdirSync(this.instancesDir, { recursive: true });
        }
    }
    parseEnvFile(filePath) {
        if (!fs_1.default.existsSync(filePath))
            return {};
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const result = {};
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
                const key = trimmed.slice(0, eqIdx).trim();
                const value = trimmed.slice(eqIdx + 1).trim();
                result[key] = value;
            }
        }
        return result;
    }
    async listInstances() {
        if (!fs_1.default.existsSync(this.instancesDir))
            return [];
        const dirs = fs_1.default.readdirSync(this.instancesDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
        const instances = [];
        // Obter lista consolidada de containers Docker
        let dockerContainers = [];
        try {
            const { stdout } = await (0, command_1.runCommand)('docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.State}}"');
            if (stdout) {
                dockerContainers = stdout.split('\n').map((line) => {
                    const [name, status, state] = line.split('\t');
                    return { name: name?.trim(), status: status?.trim(), state: state?.trim()?.toLowerCase() };
                });
            }
        }
        catch {
            // Docker pode estar offline
        }
        for (const name of dirs) {
            const instanceDir = path_1.default.join(this.instancesDir, name);
            const envPath = path_1.default.join(instanceDir, '.env');
            const env = this.parseEnvFile(envPath);
            const ports = {
                postgres: parseInt(env.POSTGRES_PORT || '5432', 10),
                kongHttp: parseInt(env.KONG_HTTP_PORT || '8000', 10),
                kongHttps: parseInt(env.KONG_HTTPS_PORT || '8443', 10),
                studio: parseInt(env.STUDIO_PORT || '54323', 10),
                rest: parseInt(env.REST_PORT || '3000', 10),
                auth: parseInt(env.AUTH_PORT || '9999', 10),
                storage: parseInt(env.STORAGE_PORT || '5000', 10),
                realtime: parseInt(env.REALTIME_PORT || '4000', 10),
                meta: parseInt(env.META_PORT || '8080', 10),
            };
            const requiredServices = ['studio', 'kong', 'auth', 'rest', 'storage', 'realtime', 'meta', 'db'];
            const services = [];
            let runningCount = 0;
            for (const sName of requiredServices) {
                const fullContainerName = `supabase_${name}_${sName}`;
                const found = dockerContainers.find((c) => c.name === fullContainerName);
                if (found) {
                    const state = (found.state === 'running' ? 'running' : 'exited');
                    if (state === 'running')
                        runningCount++;
                    services.push({
                        name: sName,
                        containerName: fullContainerName,
                        state,
                        status: found.status,
                    });
                }
                else {
                    services.push({
                        name: sName,
                        containerName: fullContainerName,
                        state: 'not_found',
                        status: 'Não criado',
                    });
                }
            }
            let overallStatus = 'stopped';
            if (runningCount === requiredServices.length) {
                overallStatus = 'running';
            }
            else if (runningCount > 0) {
                overallStatus = 'partial';
            }
            const stat = fs_1.default.statSync(instanceDir);
            instances.push({
                name,
                status: overallStatus,
                createdAt: stat.birthtime.toISOString(),
                ports,
                urls: {
                    studioUrl: `http://localhost:${ports.studio}`,
                    apiUrl: `http://localhost:${ports.kongHttp}`,
                    restUrl: `http://localhost:${ports.kongHttp}/rest/v1`,
                    authUrl: `http://localhost:${ports.kongHttp}/auth/v1`,
                    storageUrl: `http://localhost:${ports.kongHttp}/storage/v1`,
                    realtimeUrl: `ws://localhost:${ports.kongHttp}/realtime/v1`,
                },
                services,
            });
        }
        return instances;
    }
    async getNextAvailablePort() {
        const instances = await this.listInstances();
        const usedPorts = [];
        for (const inst of instances) {
            Object.values(inst.ports).forEach((p) => usedPorts.push(p));
        }
        return (0, port_service_1.findNextAvailablePortBase)(usedPorts);
    }
    async createInstance(params) {
        const { name, dbPassword, startAfter = true } = params;
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            throw new Error('Nome de instância inválido. Use apenas letras, números e hífens.');
        }
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (fs_1.default.existsSync(instanceDir)) {
            throw new Error(`A instância '${name}' já existe.`);
        }
        // Remover volumes residuais antigos se existirem antes de criar
        await (0, command_1.runCommand)(`docker volume rm -f supabase_db_data_${name} supabase_storage_data_${name}`).catch(() => { });
        const portBase = params.portBase || (await this.getNextAvailablePort());
        const ctlScript = path_1.default.join(this.scriptsDir, 'supabase-ctl.sh');
        let cmd = `bash "${ctlScript}" create "${name}" --port-base ${portBase}`;
        if (dbPassword) {
            cmd += ` --db-pass "${dbPassword}"`;
        }
        if (!startAfter) {
            cmd += ' --no-start';
        }
        await (0, command_1.runCommand)(cmd, this.baseDir);
        if (startAfter) {
            await this.syncDatabaseCredentials(name);
        }
        return {
            message: `Instância '${name}' criada com sucesso no bloco de portas ${portBase}.`,
            portBase,
        };
    }
    async syncDatabaseCredentials(name) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        const envPath = path_1.default.join(instanceDir, '.env');
        if (!fs_1.default.existsSync(envPath)) return;
        const env = this.parseEnvFile(envPath);
        const dbPassword = env.POSTGRES_PASSWORD;
        if (!dbPassword) return;

        const dbContainer = `supabase_${name}_db`;
        for (let i = 0; i < 30; i++) {
            try {
                await (0, command_1.runCommand)(`docker exec ${dbContainer} pg_isready -h 127.0.0.1 -U postgres`);
                break;
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        try {
            const sql = `
                ALTER USER supabase_admin WITH PASSWORD '${dbPassword}';
                ALTER USER postgres WITH PASSWORD '${dbPassword}';
                ALTER USER anon WITH PASSWORD '${dbPassword}';
                ALTER USER authenticated WITH PASSWORD '${dbPassword}';
                ALTER USER authenticator WITH PASSWORD '${dbPassword}';
                ALTER USER supabase_auth_admin WITH PASSWORD '${dbPassword}';
                ALTER USER supabase_storage_admin WITH PASSWORD '${dbPassword}';
                CREATE SCHEMA IF NOT EXISTS _realtime;
                ALTER SCHEMA _realtime OWNER TO supabase_admin;
            `;
            await (0, command_1.runCommand)(`docker exec ${dbContainer} psql -h 127.0.0.1 -U supabase_admin -d postgres -c "${sql.replace(/\r?\n/g, ' ')}"`);
        } catch {
            // Falhas silenciosas se container estiver indisponivel
        }
    }
    async startInstance(name) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (!fs_1.default.existsSync(instanceDir)) {
            throw new Error(`Instância '${name}' não encontrada.`);
        }
        const { stdout } = await (0, command_1.runCommand)('docker compose up -d', instanceDir);
        await this.syncDatabaseCredentials(name);
        return stdout || `Instância ${name} iniciada com sucesso.`;
    }
    async stopInstance(name) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (!fs_1.default.existsSync(instanceDir)) {
            throw new Error(`Instância '${name}' não encontrada.`);
        }
        const { stdout } = await (0, command_1.runCommand)('docker compose stop', instanceDir);
        return stdout || `Instância ${name} parada com sucesso.`;
    }
    async restartInstance(name) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (!fs_1.default.existsSync(instanceDir)) {
            throw new Error(`Instância '${name}' não encontrada.`);
        }
        const { stdout } = await (0, command_1.runCommand)('docker compose restart', instanceDir);
        await this.syncDatabaseCredentials(name);
        return stdout || `Instância ${name} reiniciada com sucesso.`;
    }
    async destroyInstance(name, keepVolumes = false) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (!fs_1.default.existsSync(instanceDir)) {
            throw new Error(`Instância '${name}' não encontrada.`);
        }
        const downCmd = keepVolumes ? 'docker compose down' : 'docker compose down -v';
        await (0, command_1.runCommand)(downCmd, instanceDir).catch(() => { });
        if (!keepVolumes) {
            await (0, command_1.runCommand)(`docker volume rm -f supabase_db_data_${name} supabase_storage_data_${name}`).catch(() => { });
        }
        fs_1.default.rmSync(instanceDir, { recursive: true, force: true });
        return `Instância '${name}' removida com sucesso.`;
    }
    async backupDatabase(name) {
        const backupsDir = path_1.default.join(this.baseDir, 'backups');
        if (!fs_1.default.existsSync(backupsDir)) {
            fs_1.default.mkdirSync(backupsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path_1.default.join(backupsDir, `${name}_backup_${timestamp}.sql`);
        const containerName = `supabase_${name}_db`;
        await (0, command_1.runCommand)(`docker exec -t ${containerName} pg_dump -U postgres postgres > "${backupFile}"`);
        return {
            backupFile,
            message: `Backup realizado com sucesso em ${backupFile}`,
        };
    }
    getCredentials(name) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        const envPath = path_1.default.join(instanceDir, '.env');
        if (!fs_1.default.existsSync(envPath)) {
            throw new Error(`Instância '${name}' ou arquivo .env não encontrados.`);
        }
        const env = this.parseEnvFile(envPath);
        const pgPort = env.POSTGRES_PORT || '5432';
        const kongPort = env.KONG_HTTP_PORT || '8000';
        const studioPort = env.STUDIO_PORT || '54323';
        const pgPass = env.POSTGRES_PASSWORD || '';
        return {
            name,
            anonKey: env.ANON_KEY || '',
            serviceRoleKey: env.SERVICE_ROLE_KEY || '',
            jwtSecret: env.JWT_SECRET || '',
            postgresPassword: pgPass,
            dashboardPassword: env.DASHBOARD_PASSWORD || '',
            connectionString: `postgresql://postgres:${pgPass}@localhost:${pgPort}/postgres`,
            directDbString: `postgresql://postgres:${pgPass}@127.0.0.1:${pgPort}/postgres`,
            urls: {
                studio: `http://localhost:${studioPort}`,
                api: `http://localhost:${kongPort}`,
                rest: `http://localhost:${kongPort}/rest/v1`,
                auth: `http://localhost:${kongPort}/auth/v1`,
                storage: `http://localhost:${kongPort}/storage/v1`,
                realtime: `ws://localhost:${kongPort}/realtime/v1`,
            },
        };
    }
    streamLogs(name, service, onLogChunk, onClose) {
        const instanceDir = path_1.default.join(this.instancesDir, name);
        if (!fs_1.default.existsSync(instanceDir)) {
            throw new Error(`Instância '${name}' não encontrada.`);
        }
        const args = ['compose', 'logs', '-f', '--tail=100'];
        if (service) {
            args.push(service);
        }
        return (0, command_1.streamCommand)('docker', args, instanceDir, (chunk) => onLogChunk(chunk), (err) => onLogChunk(`[ERROR] ${err}\n`), () => onClose());
    }
}
exports.InstanceService = InstanceService;
exports.instanceService = new InstanceService();
