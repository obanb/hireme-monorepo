import { promises as fs } from 'fs';
import path from 'path';

const logPath = path.join(__dirname, 'debug.log');

export const fsLog = async (message: string) => {
    const timestamp = new Date().toISOString();
    try {
        await fs.appendFile(logPath, `[${timestamp}] ${message}\n`);
    } catch (err) {
        // optional: avoid printing to stdout/stderr if it’s blocked
        // handle error silently or store elsewhere
    }
};