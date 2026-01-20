import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export async function findPicoDrive(): Promise<string | null> {
    const platform = process.platform;

    try {
        if (platform === 'darwin') {
            const drivePath = '/Volumes/RPI-RP2';
            if (fs.existsSync(drivePath)) return drivePath;
        } else if (platform === 'win32') {
            // Use WMIC to find logical disk with VolumeName 'RPI-RP2'
            const { stdout } = await execAsync('wmic logicaldisk where "VolumeName=\'RPI-RP2\'" get DeviceID');
            // Output format matches:
            // DeviceID
            // E:
            const match = stdout.match(/[A-Z]:/);
            if (match) return match[0];
        } else if (platform === 'linux') {
            // Common mount points
            const user = process.env.USER || process.env.USERNAME;
            const candidates = [`/media/${user}/RPI-RP2`, '/mnt/RPI-RP2'];
            for (const p of candidates) {
                if (fs.existsSync(p)) return p;
            }
        }
    } catch (e) {
        console.error('Drive detection error:', e);
    }
    return null;
}