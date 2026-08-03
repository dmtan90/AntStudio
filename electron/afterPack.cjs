/**
 * afterPack.cjs — electron-builder afterPack hook
 *
 * Runs after electron-builder packs the app (but BEFORE creating the archive).
 * Sets executable bit (chmod +x) on all .sh files and the main executables
 * in the packaged output directory so Linux/macOS users don't need to do it manually.
 */

const fs   = require('fs');
const path = require('path');

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
    const { appOutDir, packager } = context;
    const platform = packager.platform.name; // 'linux' | 'mac' | 'windows'

    if (platform === 'windows') {
        // No chmod needed on Windows
        return;
    }

    console.log(`\n[afterPack] Setting executable permissions for ${platform} build in:\n  ${appOutDir}\n`);

    // Patterns that must be executable
    const executablePatterns = [
        /\.sh$/,                    // all shell scripts
        /AntStudio$/,               // main executable (case-sensitive Linux)
        /antstudio$/,               // lowercase variant
        /AntStudio\.app\//,         // macOS .app bundle contents
    ];

    /**
     * Recursively walk a directory and chmod +x matching files.
     * Skips node_modules and .asar archives (can't chmod inside them).
     */
    function walkAndChmod(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip internal asar-unpacked (electron handles those) and node_modules
                if (entry.name === 'node_modules') continue;
                walkAndChmod(fullPath);
            } else if (entry.isFile()) {
                const shouldMakeExecutable = executablePatterns.some(p => p.test(fullPath));
                if (shouldMakeExecutable) {
                    try {
                        const current = fs.statSync(fullPath).mode;
                        // Add owner+group+other execute bits (0111)
                        const updated  = current | 0o111;
                        if (current !== updated) {
                            fs.chmodSync(fullPath, updated);
                            console.log(`  [chmod +x] ${path.relative(appOutDir, fullPath)}`);
                        }
                    } catch (err) {
                        console.warn(`  [chmod] Failed on ${fullPath}: ${err.message}`);
                    }
                }
            }
        }
    }

    walkAndChmod(appOutDir);

    console.log('[afterPack] Executable permissions applied.\n');
};
