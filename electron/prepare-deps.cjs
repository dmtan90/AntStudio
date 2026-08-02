const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Recursively delete a directory (cross-platform, no shell needed).
 */
function rmrf(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (_) {}
}

/**
 * Walk node_modules and remove junk files/dirs that are never needed at runtime:
 * - test / tests / __tests__ / spec / specs folders
 * - docs / documentation / example / examples / demo folders
 * - *.md / *.ts (source maps & typings) / LICENSE files
 * - .github / .travis.yml / .eslintrc etc.
 *
 * We do NOT recurse into the removed dirs (obviously) and skip symlinks.
 */
function pruneNodeModules(nodeModulesDir) {
  const JUNK_DIRS = new Set([
    'test', 'tests', '__tests__', 'spec', 'specs',
    'docs', 'doc', 'documentation',
    'example', 'examples', 'demo', 'demos',
    '.github', '.idea', '.vscode',
    'coverage', '__mocks__', 'benchmark', 'benchmarks',
  ]);
  const JUNK_EXTENSIONS = new Set(['.ts', '.map', '.flow', '.coffee']);
  const JUNK_FILES = new Set([
    'README.md', 'readme.md', 'Readme.md', 'CHANGELOG.md', 'CHANGES.md',
    'HISTORY.md', 'CONTRIBUTING.md', 'AUTHORS', 'NOTICE',
    '.npmignore', '.gitignore', '.gitattributes', '.travis.yml',
    '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
    'Makefile', 'Gruntfile.js', 'Gulpfile.js', 'bower.json',
    'jest.config.js', 'jest.config.ts', 'mocha.opts', '.mocharc.yml',
  ]);

  // Only walk immediate children (package dirs) of node_modules
  let entries;
  try { entries = fs.readdirSync(nodeModulesDir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const pkgDir = path.join(nodeModulesDir, entry.name);

    // Handle scoped packages (@org/pkg)
    if (entry.name.startsWith('@') && entry.isDirectory()) {
      pruneNodeModules(pkgDir); // recurse one level for scoped
      continue;
    }

    // Walk inside each package directory
    let pkgEntries;
    try { pkgEntries = fs.readdirSync(pkgDir, { withFileTypes: true }); }
    catch { continue; }

    for (const pe of pkgEntries) {
      const fullPath = path.join(pkgDir, pe.name);
      if (pe.isDirectory()) {
        if (JUNK_DIRS.has(pe.name)) {
          rmrf(fullPath);
        }
      } else if (pe.isFile()) {
        const ext = path.extname(pe.name);
        if (JUNK_FILES.has(pe.name) || JUNK_EXTENSIONS.has(ext)) {
          try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
        }
      }
    }
  }
}

const rootDir = path.join(__dirname, '..');
const serverDepsDir = path.join(rootDir, 'electron', 'server-deps');
const serverDir = path.join(rootDir, 'server');

try {
  console.log('🧹 Preparing server-deps for Electron build...');
  
  // 1. Create electron/server-deps directory if it doesn't exist
  if (!fs.existsSync(serverDepsDir)) {
    fs.mkdirSync(serverDepsDir, { recursive: true });
  }
  
  // 2. Prepare lightweight server/package.json for electron/server-deps
  // Since server/dist/index.js is bundled with esbuild, 99% of JS dependencies are inside index.js.
  // We only need to install external binary dependencies (bcrypt, ffmpeg, ffprobe, genblaze).
  const serverDepsPkgJson = path.join(serverDepsDir, 'package.json');
  const rawPkg = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
  
  const EXTERNAL_DEPS = new Set([
    'playwright',
    'playwright-core',
    '@napi-rs/canvas',
    '@ffmpeg-installer/ffmpeg',
    '@ffprobe-installer/ffprobe',
    'genblaze',
    '@backblaze-labs/b2-sdk',
    '@aws-sdk/client-s3',
    'mongoose',
    'nodemailer'
  ]);

  const filteredDeps = {};
  for (const [name, version] of Object.entries(rawPkg.dependencies || {})) {
    if (EXTERNAL_DEPS.has(name)) {
      filteredDeps[name] = name === 'genblaze' ? 'file:../../genblaze' : version;
    }
  }

  const pkgData = {
    name: 'antstudio-server-deps',
    version: '1.0.0',
    private: true,
    dependencies: filteredDeps
  };

  fs.writeFileSync(serverDepsPkgJson, JSON.stringify(pkgData, null, 2));

  // 3. Run npm install --omit=dev --no-package-lock
  console.log('📦 Installing production dependencies for server...');
  execSync('npm install --omit=dev --no-package-lock', {
    cwd: serverDepsDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      YOUTUBE_DL_SKIP_PYTHON_CHECK: '1'
    }
  });

  // Ensure genblaze in node_modules is a physical directory, not a broken symlink for 7-zip packaging
  const nmDir = path.join(serverDepsDir, 'node_modules');
  const genblazeNmPath = path.join(nmDir, 'genblaze');
  if (fs.existsSync(genblazeNmPath)) {
    try {
      const stat = fs.lstatSync(genblazeNmPath);
      if (stat.isSymbolicLink()) {
        console.log('🔄 Converting genblaze symlink to physical directory for Electron bundler...');
        fs.unlinkSync(genblazeNmPath);
        fs.mkdirSync(genblazeNmPath, { recursive: true });
        const genblazeSource = path.join(rootDir, 'genblaze');
        fs.copyFileSync(path.join(genblazeSource, 'package.json'), path.join(genblazeNmPath, 'package.json'));
        if (fs.existsSync(path.join(genblazeSource, 'dist'))) {
          fs.cpSync(path.join(genblazeSource, 'dist'), path.join(genblazeNmPath, 'dist'), { recursive: true });
        }
      }
    } catch (e) {
      console.warn('⚠️ Warning handling genblaze dependency:', e.message);
    }
  }
  
  // 4. Remove large packages that are NOT needed at runtime in the Electron bundle.
  //    Each entry is { path, reason, sizeMB }.
  const packagesToRemove = [

    // geoip-lite ships a 150MB MaxMind database — use an online API instead
    { path: 'geoip-lite', reason: 'ships 150MB offline IP database, use API instead' },

    // genkit ecosystem — replaced by @google/genai
    { path: path.join('@genkit-ai', 'google-genai'),   reason: 'replaced by @google/genai' },
    { path: path.join('@genkit-ai', 'google-cloud'),   reason: 'replaced by @google/genai' },
    { path: 'genkit',                                   reason: 'replaced by @google/genai' },

    // OpenTelemetry / Cloud Monitoring — tracing/monitoring not needed in Electron app (stubbed below for @google/adk)
    { path: path.join('@google-cloud', 'opentelemetry-cloud-monitoring-exporter'), reason: 'telemetry not needed, stubbed' },
    { path: path.join('@google-cloud', 'opentelemetry-cloud-trace-exporter'),      reason: 'telemetry not needed, stubbed' },
    { path: path.join('@opentelemetry', 'sdk-node'),                               reason: 'telemetry not needed' },
    { path: path.join('@opentelemetry', 'exporter-trace-otlp-proto'),              reason: 'telemetry not needed' },
    { path: path.join('@opentelemetry', 'otlp-grpc-exporter-base'),               reason: 'telemetry not needed' },
    { path: path.join('@opentelemetry', 'exporter-trace-otlp-grpc'),              reason: 'telemetry not needed' },

    // @ts-morph — compile-time TypeScript AST tool, not needed at runtime
    { path: path.join('@ts-morph', 'common'), reason: 'compile-time only' },
    { path: 'ts-morph',                       reason: 'compile-time only' },

    // googleapis (190MB) — replaced by @googleapis/drive (direct dep only)
    { path: 'googleapis', reason: 'replaced by @googleapis/drive' },

    // Azure MSAL browser — Azure AD auth not used
    { path: path.join('@azure', 'msal-browser'), reason: 'Azure AD auth not used' },
    { path: path.join('@azure', 'msal-common'),  reason: 'Azure AD auth not used' },

    // Native C++ modules not needed at runtime (causes ABI mismatch in Electron)
    { path: 'canvas', reason: 'unused native C++ module causing ABI mismatch' },
  ];

  let totalRemoved = 0;
  for (const pkg of packagesToRemove) {
    const pkgPath = path.join(nmDir, pkg.path);
    if (fs.existsSync(pkgPath)) {
      console.log(`🗑️  Removing ${pkg.path} (${pkg.reason})...`);
      rmrf(pkgPath);
      totalRemoved++;
    }
  }
  if (totalRemoved > 0) {
    console.log(`✅ Removed ${totalRemoved} large/unused packages from bundle.`);
  }

  // Remove nested node_modules inside @google/adk so Node resolves telemetry modules from root node_modules where stubs live
  const adkNestedNm = path.join(nmDir, '@google', 'adk', 'node_modules');
  if (fs.existsSync(adkNestedNm)) {
    console.log('🗑️  Removing nested node_modules inside @google/adk...');
    rmrf(adkNestedNm);
  }

  // 4b. Create lightweight dummy stubs for OpenTelemetry/GCP telemetry modules
  //     required by @google/adk imports so @google/adk works without requiring googleapis/monitoring.
  const universalMjs = [
    'class Dummy { constructor() {} register() {} addSpanProcessor() {} flatMap() { return []; } }',
    'export const DummyClass = Dummy;',
    'export class MeterProvider extends Dummy {}',
    'export class PeriodicExportingMetricReader extends Dummy {}',
    'export class NodeTracerProvider extends Dummy {}',
    'export class BatchSpanProcessor extends Dummy {}',
    'export class SimpleSpanProcessor extends Dummy {}',
    'export class ConsoleSpanExporter extends Dummy {}',
    'export class BatchLogRecordProcessor extends Dummy {}',
    'export class LoggerProvider extends Dummy {}',
    'export class OTLPLogExporter extends Dummy {}',
    'export class OTLPMetricExporter extends Dummy {}',
    'export class OTLPTraceExporter extends Dummy {}',
    'export class MetricExporter extends Dummy {}',
    'export class TraceExporter extends Dummy {}',
    'export const gcpDetector = {};',
    'export function detectResources() { return {}; }',
    'export const metrics = { setGlobalMeterProvider() {} };',
    'export const trace = { setGlobalTracerProvider() {} };',
    'export const logs = { setGlobalLoggerProvider() {} };',
    'export default Dummy;'
  ].join('\n');

  const universalCjs = [
    'class Dummy { constructor() {} register() {} addSpanProcessor() {} flatMap() { return []; } }',
    'exports.DummyClass = Dummy;',
    'exports.MeterProvider = Dummy;',
    'exports.PeriodicExportingMetricReader = Dummy;',
    'exports.NodeTracerProvider = Dummy;',
    'exports.BatchSpanProcessor = Dummy;',
    'exports.SimpleSpanProcessor = Dummy;',
    'exports.ConsoleSpanExporter = Dummy;',
    'exports.BatchLogRecordProcessor = Dummy;',
    'exports.LoggerProvider = Dummy;',
    'exports.OTLPLogExporter = Dummy;',
    'exports.OTLPMetricExporter = Dummy;',
    'exports.OTLPTraceExporter = Dummy;',
    'exports.MetricExporter = Dummy;',
    'exports.TraceExporter = Dummy;',
    'exports.gcpDetector = {};',
    'exports.detectResources = function() { return {}; };',
    'exports.metrics = { setGlobalMeterProvider: function() {} };',
    'exports.trace = { setGlobalTracerProvider: function() {} };',
    'exports.logs = { setGlobalLoggerProvider: function() {} };',
    'module.exports = exports;'
  ].join('\n');

  const telemetryStubDirs = [
    path.join('@google-cloud', 'opentelemetry-cloud-monitoring-exporter'),
    path.join('@google-cloud', 'opentelemetry-cloud-trace-exporter'),
    path.join('@opentelemetry', 'resource-detector-gcp'),
    path.join('@opentelemetry', 'resources'),
    path.join('@opentelemetry', 'sdk-metrics'),
    path.join('@opentelemetry', 'sdk-trace-base'),
    path.join('@opentelemetry', 'sdk-trace-node'),
    path.join('@opentelemetry', 'sdk-logs'),
    path.join('@opentelemetry', 'exporter-logs-otlp-http'),
    path.join('@opentelemetry', 'exporter-metrics-otlp-http'),
    path.join('@opentelemetry', 'exporter-trace-otlp-http'),
    path.join('@opentelemetry', 'exporter-trace-otlp-proto'),
    path.join('@opentelemetry', 'otlp-grpc-exporter-base'),
    path.join('@opentelemetry', 'exporter-trace-otlp-grpc'),
    path.join('@opentelemetry', 'sdk-node'),
    path.join('@opentelemetry', 'api-logs')
  ];

  console.log('🔌 Creating lightweight telemetry stubs for @google/adk...');
  for (const stubDir of telemetryStubDirs) {
    const fullDir = path.join(nmDir, stubDir);
    const pkgName = stubDir.replace(/\\/g, '/');
    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(path.join(fullDir, 'package.json'), JSON.stringify({
      name: pkgName,
      version: '1.0.0',
      main: 'index.cjs',
      module: 'index.mjs',
      type: 'module'
    }, null, 2));
    fs.writeFileSync(path.join(fullDir, 'index.mjs'), universalMjs);
    fs.writeFileSync(path.join(fullDir, 'index.cjs'), universalCjs);
  }


  // 5. Strip docs / tests / typings from all remaining packages.
  console.log('✂️  Pruning junk files from node_modules...');
  pruneNodeModules(path.join(serverDepsDir, 'node_modules'));

  console.log('✅ Server dependencies prepared successfully!');
} catch (error) {
  console.error('❌ Failed to prepare server dependencies:', error);
  process.exit(1);
}
