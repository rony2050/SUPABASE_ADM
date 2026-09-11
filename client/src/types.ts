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

export interface SystemInfo {
  hostname: string;
  platform: string;
  uptime: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  usedMemoryPercent: number;
  cpuCount: number;
  cpuModel: string;
  dockerAvailable: boolean;
  dockerVersion: string;
  runningContainersCount: number;
}
