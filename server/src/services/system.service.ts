import os from 'os';
import { runCommand } from '../utils/command';

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

export async function getSystemInfo(): Promise<SystemInfo> {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  let dockerAvailable = false;
  let dockerVersion = 'N/A';
  let runningContainersCount = 0;

  try {
    const versionRes = await runCommand('docker --version');
    dockerAvailable = true;
    dockerVersion = versionRes.stdout;

    const countRes = await runCommand('docker ps -q');
    const ids = countRes.stdout.split('\n').filter((id) => id.trim().length > 0);
    runningContainersCount = ids.length;
  } catch {
    dockerAvailable = false;
  }

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptime: Math.round(os.uptime()),
    totalMemoryMb: totalMem,
    freeMemoryMb: freeMem,
    usedMemoryPercent: usedMemPercent,
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Generic CPU',
    dockerAvailable,
    dockerVersion,
    runningContainersCount,
  };
}

export async function restartApplication(): Promise<{ message: string }> {
  setTimeout(() => {
    process.exit(0);
  }, 1000);
  return { message: 'Serviço do Supabase Manager reiniciando...' };
}
