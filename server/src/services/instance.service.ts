import fs from 'fs';
import path from 'path';
import { runCommand, streamCommand } from '../utils/command';
import { findNextAvailablePortBase } from './port.service';

export interface ServiceStatus {
  name: string;
  containerName: string;
  state: 'running' | 'exited' | 'restarting' | 'not_found';
  status: string;
}

export interface InstanceSummary {
  name: string;
  status: 'running' | 'partial' | 'stopped' | 'unknown';
  createdAt: string;
  ports: {
    postgres: number;
    kongHttp: number;
    kongHttps: number;
    studio: number;
    rest: number;
    auth: number;
    storage: number;
    realtime: number;
    meta: number;
  };
  urls: {
    studioUrl: string;
    apiUrl: string;
    restUrl: string;
    authUrl: string;
    storageUrl: string;
    realtimeUrl: string;
  };
  services: ServiceStatus[];
}

export interface InstanceCredentials {
  name: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
  postgresPassword: string;
  dashboardPassword: string;
  connectionString: string;
  directDbString: string;
  urls: {
    studio: string;
    api: string;
    rest: string;
    auth: string;
    storage: string;
    realtime: string;
  };
}

export class InstanceService {
  private baseDir: string;
  private instancesDir: string;
  private scriptsDir: string;

  constructor() {
    this.baseDir = process.env.SUPABASE_MANAGER_DIR || path.resolve(__dirname, '../../../');
    this.instancesDir = path.join(this.baseDir, 'instances');
    this.scriptsDir = path.join(this.baseDir, 'scripts');

    if (!fs.existsSync(this.instancesDir)) {
      fs.mkdirSync(this.instancesDir, { recursive: true });
    }
  }

  private parseEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        result[key] = value;
      }
    }
    return result;
  }

  async listInstances(): Promise<InstanceSummary[]> {
    if (!fs.existsSync(this.instancesDir)) return [];

    const dirs = fs.readdirSync(this.instancesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const instances: InstanceSummary[] = [];

    // Obter lista consolidada de containers Docker
    let dockerContainers: { name: string; status: string; state: string }[] = [];
    try {
      const { stdout } = await runCommand('docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.State}}"');
      if (stdout) {
        dockerContainers = stdout.split('\n').map((line) => {
          const [name, status, state] = line.split('\t');
          return { name: name?.trim(), status: status?.trim(), state: state?.trim()?.toLowerCase() };
        });
      }
    } catch {
      // Docker pode estar offline
    }

    for (const name of dirs) {
      const instanceDir = path.join(this.instancesDir, name);
      const envPath = path.join(instanceDir, '.env');
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
      const services: ServiceStatus[] = [];
      let runningCount = 0;

      for (const sName of requiredServices) {
        const fullContainerName = `supabase_${name}_${sName}`;
        const found = dockerContainers.find((c) => c.name === fullContainerName);

        if (found) {
          const state = (found.state === 'running' ? 'running' : 'exited') as any;
          if (state === 'running') runningCount++;
          services.push({
            name: sName,
            containerName: fullContainerName,
            state,
            status: found.status,
          });
        } else {
          services.push({
            name: sName,
            containerName: fullContainerName,
            state: 'not_found',
            status: 'Não criado',
          });
        }
      }

      let overallStatus: InstanceSummary['status'] = 'stopped';
      if (runningCount === requiredServices.length) {
        overallStatus = 'running';
      } else if (runningCount > 0) {
        overallStatus = 'partial';
      }

      const stat = fs.statSync(instanceDir);

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

  async getNextAvailablePort(): Promise<number> {
    const instances = await this.listInstances();
    const usedPorts: number[] = [];
    for (const inst of instances) {
      Object.values(inst.ports).forEach((p) => usedPorts.push(p));
    }
    return findNextAvailablePortBase(usedPorts);
  }

  async createInstance(params: {
    name: string;
    portBase?: number;
    dbPassword?: string;
    startAfter?: boolean;
  }): Promise<{ message: string; portBase: number }> {
    const { name, dbPassword, startAfter = true } = params;

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Nome de instância inválido. Use apenas letras, números e hífens.');
    }

    const instanceDir = path.join(this.instancesDir, name);
    if (fs.existsSync(instanceDir)) {
      throw new Error(`A instância '${name}' já existe.`);
    }

    const portBase = params.portBase || (await this.getNextAvailablePort());
    const ctlScript = path.join(this.scriptsDir, 'supabase-ctl.sh');

    let cmd = `bash "${ctlScript}" create "${name}" --port-base ${portBase}`;
    if (dbPassword) {
      cmd += ` --db-pass "${dbPassword}"`;
    }
    if (!startAfter) {
      cmd += ' --no-start';
    }

    await runCommand(cmd, this.baseDir);

    return {
      message: `Instância '${name}' criada com sucesso no bloco de portas ${portBase}.`,
      portBase,
    };
  }

  async startInstance(name: string): Promise<string> {
    const instanceDir = path.join(this.instancesDir, name);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instância '${name}' não encontrada.`);
    }
    const { stdout } = await runCommand('docker compose up -d', instanceDir);
    return stdout || `Instância ${name} iniciada com sucesso.`;
  }

  async stopInstance(name: string): Promise<string> {
    const instanceDir = path.join(this.instancesDir, name);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instância '${name}' não encontrada.`);
    }
    const { stdout } = await runCommand('docker compose stop', instanceDir);
    return stdout || `Instância ${name} parada com sucesso.`;
  }

  async restartInstance(name: string): Promise<string> {
    const instanceDir = path.join(this.instancesDir, name);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instância '${name}' não encontrada.`);
    }
    const { stdout } = await runCommand('docker compose restart', instanceDir);
    return stdout || `Instância ${name} reiniciada com sucesso.`;
  }

  async destroyInstance(name: string, keepVolumes: boolean = false): Promise<string> {
    const instanceDir = path.join(this.instancesDir, name);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instância '${name}' não encontrada.`);
    }
    const downCmd = keepVolumes ? 'docker compose down' : 'docker compose down -v';
    await runCommand(downCmd, instanceDir).catch(() => {});
    fs.rmSync(instanceDir, { recursive: true, force: true });
    return `Instância '${name}' removida com sucesso.`;
  }

  async backupDatabase(name: string): Promise<{ backupFile: string; message: string }> {
    const backupsDir = path.join(this.baseDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `${name}_backup_${timestamp}.sql`);
    const containerName = `supabase_${name}_db`;

    await runCommand(`docker exec -t ${containerName} pg_dump -U postgres postgres > "${backupFile}"`);

    return {
      backupFile,
      message: `Backup realizado com sucesso em ${backupFile}`,
    };
  }

  getCredentials(name: string): InstanceCredentials {
    const instanceDir = path.join(this.instancesDir, name);
    const envPath = path.join(instanceDir, '.env');
    if (!fs.existsSync(envPath)) {
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

  streamLogs(
    name: string,
    service: string | undefined,
    onLogChunk: (chunk: string) => void,
    onClose: () => void
  ): () => void {
    const instanceDir = path.join(this.instancesDir, name);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instância '${name}' não encontrada.`);
    }

    const args = ['compose', 'logs', '-f', '--tail=100'];
    if (service) {
      args.push(service);
    }

    return streamCommand(
      'docker',
      args,
      instanceDir,
      (chunk) => onLogChunk(chunk),
      (err) => onLogChunk(`[ERROR] ${err}\n`),
      () => onClose()
    );
  }
}

export const instanceService = new InstanceService();
