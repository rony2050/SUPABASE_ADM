"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPortAvailable = isPortAvailable;
exports.isPortBlockAvailable = isPortBlockAvailable;
exports.findNextAvailablePortBase = findNextAvailablePortBase;
const net_1 = __importDefault(require("net"));
async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net_1.default.createServer();
        server.once('error', () => {
            resolve(false);
        });
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, '0.0.0.0');
    });
}
async function isPortBlockAvailable(startPort, count = 10) {
    for (let i = 0; i < count; i++) {
        const available = await isPortAvailable(startPort + i);
        if (!available)
            return false;
    }
    return true;
}
async function findNextAvailablePortBase(usedPorts = []) {
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
