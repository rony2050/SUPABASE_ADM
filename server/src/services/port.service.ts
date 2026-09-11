import net from 'net';

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

export async function isPortBlockAvailable(startPort: number, count: number = 10): Promise<boolean> {
  for (let i = 0; i < count; i++) {
    const available = await isPortAvailable(startPort + i);
    if (!available) return false;
  }
  return true;
}

export async function findNextAvailablePortBase(usedPorts: number[] = []): Promise<number> {
  let candidate = 54300;
  while (candidate < 65000) {
    let conflict = false;
    for (let i = 0; i < 10; i++) {
      if (usedPorts.includes(candidate + i)) {
        conflict = true;
        break;
      }
    }

    if (!conflict) {
      const isAvailable = await isPortBlockAvailable(candidate, 10);
      if (isAvailable) {
        return candidate;
      }
    }
    candidate += 100;
  }
  return 54300;
}
