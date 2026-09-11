import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(cmd: string, cwd?: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err: any) {
    throw new Error(err.stderr || err.message || `Command failed: ${cmd}`);
  }
}

export function streamCommand(
  cmd: string,
  args: string[],
  cwd: string | undefined,
  onData: (chunk: string) => void,
  onError: (err: string) => void,
  onClose: (code: number | null) => void
) {
  const proc = spawn(cmd, args, { cwd });

  proc.stdout.on('data', (data) => onData(data.toString()));
  proc.stderr.on('data', (data) => onData(data.toString()));
  proc.on('error', (err) => onError(err.message));
  proc.on('close', (code) => onClose(code));

  return () => {
    try {
      proc.kill();
    } catch {
      // Ignore cleanup error
    }
  };
}
