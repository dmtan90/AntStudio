const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SERVER_ROOT = path.join(__dirname, '..');
const CLIENT_ROOT = path.join(SERVER_ROOT, '..', 'client');
const STANDALONE_DIR = path.join(SERVER_ROOT, 'standalone');
const BIN_DIR = path.join(SERVER_ROOT, 'bin');

async function build() {
    try {
        console.log('🚀 Starting Standalone Build Process...');

        // 1. Ensure directories exist
        await fs.ensureDir(STANDALONE_DIR);
        await fs.ensureDir(BIN_DIR);
        await fs.emptyDir(STANDALONE_DIR);

        // 2. Build Client (if not already built or fresh is needed)
        // 2. Build Client
        console.log('📦 Building Frontend...');
        // execSync('pnpm run build', { cwd: CLIENT_ROOT, stdio: 'inherit' });

        // 3. Build Server (TypeScript to JS)
        // 3. Build Server (TypeScript to JS)
        console.log('⚙️ Compiling Backend (TSC)...');
        // execSync('pnpm run build', { cwd: SERVER_ROOT, stdio: 'inherit' });

        // 4. Bundle Server with NCC
        console.log('🎯 Bundling Backend with NCC...');
        const bundleTempDir = path.join(SERVER_ROOT, 'standalone-temp');
        await fs.ensureDir(bundleTempDir);
        await fs.emptyDir(bundleTempDir);
        
        execSync(`npx ncc build dist/index.js -o "${bundleTempDir}" -m --no-cache`, { 
            cwd: SERVER_ROOT, 
            stdio: 'inherit' 
        });

        // The bundle is at standalone-temp/index.js
        const bundleFile = path.join(bundleTempDir, 'index.js');
        const finalBundle = path.join(STANDALONE_DIR, 'bundle.js');
        await fs.copy(bundleFile, finalBundle);
        await fs.remove(bundleTempDir);

        // 5. Integrate Frontend
        console.log('🖼️ Integrating Frontend Assets...');
        const clientDist = path.join(CLIENT_ROOT, 'dist');
        const standaloneClient = path.join(STANDALONE_DIR, 'client');
        await fs.copy(clientDist, standaloneClient);

        // 6. Obfuscate Backend Bundle - SKIPPED FOR PERFORMANCE (Already bundled/minified)
        console.log('🔐 Bundling is complete. Skipping extra obfuscation for performance on large bundle.');
        /*
        const bundleContent = await fs.readFile(finalBundle, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(bundleContent, {
            compact: true,
            controlFlowFlattening: false, // Too heavy for 70MB
            deadCodeInjection: false,     // Too heavy for 70MB
            debugProtection: false,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: false,  // Heavy
            renameGlobals: false,
            selfDefending: false,         // Heavy
            simplify: true,
            splitStrings: false,          // Heavy
            stringArray: true,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false
        });
        await fs.writeFile(finalBundle, obfuscationResult.getObfuscatedCode());
        */

        // 7. Create temporary package.json for PKG
        console.log('📦 Preparing Packaging Configuration...');
        const pkgConfig = {
            name: "antflow-standalone",
            version: "1.0.0",
            main: "bundle.js",
            bin: "bundle.js",
            pkg: {
                assets: [
                    "client/**/*",
                    "../../public/**/*"
                ],
                targets: [
                    "node18-win-x64",
                    "node18-linux-x64",
                    "node18-macos-x64"
                ],
                outputPath: "../bin"
            }
        };
        await fs.writeJson(path.join(STANDALONE_DIR, 'package.json'), pkgConfig, { spaces: 2 });

        // 8. Run PKG
        console.log('🔨 Generating Standalone Binaries (Win/Linux/Mac)...');
        execSync('npx pkg .', { cwd: STANDALONE_DIR, stdio: 'inherit' });

        console.log('✅ Standalone Build Complete! Binaries are in the "server/bin" folder.');

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
