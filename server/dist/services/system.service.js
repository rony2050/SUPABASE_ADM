"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemInfo = getSystemInfo;
const os_1 = __importDefault(require("os"));
const command_1 = require("../utils/command");
async function getSystemInfo() {
    const totalMem = Math.round(os_1.default.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os_1.default.freemem() / (1024 * 1024));
    const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    let dockerAvailable = false;
    let dockerVersion = 'N/A';
    let runningContainersCount = 0;
    try {
        const versionRes = await (0, command_1.runCommand)('docker --version');
        dockerAvailable = true;
        dockerVersion = versionRes.stdout;
        const countRes = await (0, command_1.runCommand)('docker ps -q');
        const ids = countRes.stdout.split('\n').filter((id) => id.trim().length > 0);
        runningContainersCount = ids.length;
    }
    catch {
        dockerAvailable = false;
    }
    return {
        hostname: os_1.default.hostname(),
        platform: `${os_1.default.type()} ${os_1.default.release()} (${os_1.default.arch()})`,
        uptime: Math.round(os_1.default.uptime()),
        totalMemoryMb: totalMem,
        freeMemoryMb: freeMem,
        usedMemoryPercent: usedMemPercent,
        cpuCount: os_1.default.cpus().length,
        cpuModel: os_1.default.cpus()[0]?.model || 'Generic CPU',
        dockerAvailable,
        dockerVersion,
        runningContainersCount,
    };
}
