"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
exports.streamCommand = streamCommand;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function runCommand(cmd, cwd) {
    try {
        const { stdout, stderr } = await execAsync(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 });
        return { stdout: stdout.trim(), stderr: stderr.trim() };
    }
    catch (err) {
        throw new Error(err.stderr || err.message || `Command failed: ${cmd}`);
    }
}
function streamCommand(cmd, args, cwd, onData, onError, onClose) {
    const proc = (0, child_process_1.spawn)(cmd, args, { cwd });
    proc.stdout.on('data', (data) => onData(data.toString()));
    proc.stderr.on('data', (data) => onData(data.toString()));
    proc.on('error', (err) => onError(err.message));
    proc.on('close', (code) => onClose(code));
    return () => {
        try {
            proc.kill();
        }
        catch {
            // Ignore cleanup error
        }
    };
}
