import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { Logger } from './Logger.js';

/**
 * Attempt to auto-install Playwright Chromium browser.
 * Uses a guaranteed physical CWD (os.tmpdir()) so that the shell
 * process can always be spawned, even when running inside app.asar.
 */
async function installPlaywrightChromium(): Promise<boolean> {
    return new Promise((resolve) => {
        // Use system temp dir as cwd — always a real, writable directory,
        // unlike __dirname which may resolve to a virtual path inside app.asar.
        const safeCwd = os.tmpdir();

        // Use 'npx' on Windows via shell:true so cmd.exe is invoked correctly.
        const child = spawn('npx', ['playwright', 'install', 'chromium'], {
            cwd: safeCwd,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
        });

        let stderr = '';
        child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

        child.on('error', (err) => {
            Logger.error(
                `[PlaywrightHelper] Failed to spawn install process: ${err.message}`,
                'PlaywrightHelper',
                { stderr }
            );
            resolve(false);
        });

        child.on('close', (code) => {
            if (code === 0) {
                Logger.info('[PlaywrightHelper] Playwright Chromium browser installed successfully.');
                resolve(true);
            } else {
                Logger.error(
                    `[PlaywrightHelper] Playwright install exited with code ${code}`,
                    'PlaywrightHelper',
                    { stderr }
                );
                resolve(false);
            }
        });
    });
}

export async function ensurePlaywrightBrowsers(): Promise<void> {
    try {
        Logger.info('[PlaywrightHelper] Checking if Playwright browser is installed...');
        // Try launching chromium in headless mode to verify installation
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        Logger.info('[PlaywrightHelper] Playwright browser is already installed.');
    } catch (error: any) {
        Logger.warn(`[PlaywrightHelper] Playwright browser check failed: ${error.message}`);
        Logger.info('[PlaywrightHelper] Installing Playwright Chromium browser automatically...');

        const success = await installPlaywrightChromium();
        if (!success) {
            Logger.warn(
                '[PlaywrightHelper] Could not auto-install Playwright. ' +
                'Features requiring a browser (e.g. web scraping) will be unavailable. ' +
                'Run "npx playwright install chromium" manually to enable them.'
            );
        }
    }
}
