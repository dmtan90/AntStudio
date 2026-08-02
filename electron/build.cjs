const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { encryptEnvFile } = require('./crypto-env.cjs');

const rootDir = path.join(__dirname, '..');

// Read CLI arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const envFileName = envArg ? envArg.split('=')[1] : (process.env.ENV_FILE || '.env');
const sourceEnvPath = path.join(rootDir, envFileName);
const targetEncPath = path.join(__dirname, '.env.enc');

// Read target platform argument (--target=win|linux|mac|all)
const targetArg = args.find(arg => arg.startsWith('--target='));
const targetPlatform = targetArg ? targetArg.split('=')[1].toLowerCase() : 'win';

const distDir = path.join(__dirname, 'dist');

try {
  // 0. Clean old build output directory
  if (fs.existsSync(distDir)) {
    console.log('🧹 Cleaning previous build output in electron/dist...');
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn('⚠️ Could not remove all files in dist directory:', rmErr.message);
    }
  }

  // 1. Encrypt specified .env file for defaults
  if(envArg){
    console.log(`1. Encrypting environment file: ${envFileName}...`);
    if (fs.existsSync(sourceEnvPath)) {
      encryptEnvFile(sourceEnvPath, targetEncPath);
    } else {
      console.warn(`⚠️ Warning: Source env file "${envFileName}" not found at ${sourceEnvPath}. Skipped encryption.`);
    }
  }

  // 2. Prepare dependencies under electron/server-deps
  console.log('2. Preparing server dependencies...');
  execSync('node electron/prepare-deps.cjs', { cwd: rootDir, stdio: 'inherit' });

  // 3. Packaging application with electron-builder
  console.log(`3. Packaging application with electron-builder (Target: ${targetPlatform})...`);

  if (targetPlatform === 'win' || targetPlatform === 'all') {
    console.log('📦 Building for Windows (ZIP & unpacked dir)...');
    execSync('electron-builder --win zip dir --config.npmRebuild=false --publish never', { cwd: rootDir, stdio: 'inherit' });
  }

  if (targetPlatform === 'linux' || targetPlatform === 'all') {
    console.log('📦 Building for Linux...');
    execSync('electron-builder --linux tar.gz dir --config.npmRebuild=false --publish never', { cwd: rootDir, stdio: 'inherit' });
  }

  if (targetPlatform === 'mac') {
    console.log('📦 Building for macOS (ZIP, DMG & unpacked dir)...');
    execSync('electron-builder --mac zip dmg dir --config.npmRebuild=false --publish never', { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('✅ Build and packaging completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
