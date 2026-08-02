const fs = require('fs');
const path = require('path');

// Ensure module loader can find dependencies in server/node_modules and server-deps/node_modules
const possibleNodeModules = [
  path.join(__dirname, '..', 'server', 'node_modules'),
  path.join(__dirname, 'server-deps', 'node_modules'),
  path.join(process.resourcesPath || '', 'node_modules')
];

for (const modPath of possibleNodeModules) {
  if (fs.existsSync(modPath) && !module.paths.includes(modPath)) {
    module.paths.push(modPath);
  }
}

function isPlaceholder(value) {
  if (!value || typeof value !== 'string') return true;
  const val = value.trim().toLowerCase();
  if (
    val === '' ||
    val.includes('your-') ||
    val.includes('your_') ||
    val.includes('change_me') ||
    val.includes('your-mongodb-uri') ||
    val.includes('your-app-id')
  ) {
    return true;
  }
  return false;
}

/**
 * 1. Live Test MongoDB Connection
 */
async function testMongoDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (isPlaceholder(mongoUri)) {
    return { ok: false, message: 'MONGODB_URI is not configured or using default placeholder.' };
  }

  try {
    const mongoose = require('mongoose');
    const conn = await mongoose.createConnection(mongoUri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    }).asPromise();

    await conn.close();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `MongoDB connection failed: ${err.message}` };
  }
}

/**
 * 2. Live Test Storage Provider Connection (S3 or B2)
 */
async function testStorage() {
  const provider = (process.env.STORAGE_PROVIDER || 's3').toLowerCase();

  if (provider === 'b2') {
    const appId = process.env.BLAZE_B2_APPLICATION_ID || process.env.AWS_ACCESS_KEY_ID;
    const appKey = process.env.BLAZE_B2_APPLICATION_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.BLAZE_B2_BUCKET_NAME || process.env.AWS_S3_BUCKET;

    if (isPlaceholder(appId) || isPlaceholder(appKey)) {
      return { ok: false, message: 'Backblaze B2 Application ID or Application Key is not configured.' };
    }
    try {
      const { B2Client } = require('@backblaze-labs/b2-sdk');
      const b2 = new B2Client({
        applicationKeyId: appId,
        applicationKey: appKey
      });
      await b2.authorize();

      if (bucketName && !isPlaceholder(bucketName)) {
        await b2.getBucket(bucketName);
      }
      return { ok: true };
    } catch (err) {
      const errorMsg = err.message || err.code || String(err);
      return { ok: false, message: `Backblaze B2 authentication failed: ${errorMsg}` };
    }
  }

  // Default: S3
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (isPlaceholder(accessKey) || isPlaceholder(secretKey)) {
    return { ok: false, message: 'AWS Access Key ID or Secret Access Key is not configured.' };
  }
  try {
    const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      }
    });
    await client.send(new ListBucketsCommand({}));
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `S3 Storage authentication failed: ${err.message}` };
  }
}

/**
 * 3. Live Test Google Gemini / GCP Credentials Connection
 */
async function testGoogleAI() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const gcpCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (geminiKey && !isPlaceholder(geminiKey)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { ok: true };
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error?.message || `HTTP ${res.status} ${res.statusText}`;
        return { ok: false, message: `GEMINI_API_KEY validation failed: ${errMsg}` };
      }
    } catch (err) {
      return { ok: false, message: `Google Gemini API connection failed: ${err.message}` };
    }
  }

  if (gcpCreds && !isPlaceholder(gcpCreds)) {
    const filename = path.basename(gcpCreds);
    const candidatePaths = [
      gcpCreds,
      path.join(process.resourcesPath || '', filename),
      path.join(process.resourcesPath || '', gcpCreds),
      path.join(path.dirname(process.execPath), filename),
      path.join(process.cwd(), filename),
      path.join(process.cwd(), '..', filename)
    ];

    const foundPath = candidatePaths.find(p => p && fs.existsSync(p));
    if (!foundPath) {
      return { ok: false, message: `GOOGLE_APPLICATION_CREDENTIALS file not found: ${gcpCreds} (checked resources folder)` };
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = foundPath;
    return { ok: true };
  }

  return { ok: false, message: 'Neither GEMINI_API_KEY nor GOOGLE_APPLICATION_CREDENTIALS is configured.' };
}

/**
 * 4. Live Test SMTP Email Handshake & Auth Connection
 */
async function testSMTP() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (isPlaceholder(host) || isPlaceholder(user) || isPlaceholder(pass)) {
    return { ok: false, message: 'SMTP Server credentials (Host, User, Password) are incomplete or using defaults.' };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000
    });

    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `SMTP Mail Server connection failed: ${err.message}` };
  }
}

/**
 * Execute real live connection verification for all services
 */
async function verifyEnvironment() {
  const issues = [];

  console.log('[Electron Verifier] Performing live connection tests...');

  const [mongoRes, storageRes, googleRes, smtpRes] = await Promise.all([
    testMongoDB(),
    testStorage(),
    testGoogleAI(),
    // testSMTP()
  ]);

  if (!mongoRes.ok) issues.push({ category: 'Database (MongoDB)', field: 'MONGODB_URI', message: mongoRes.message });
  if (!storageRes.ok) issues.push({ category: 'Storage', field: 'STORAGE_PROVIDER', message: storageRes.message });
  if (!googleRes.ok) issues.push({ category: 'AI Service (Google/Gemini)', field: 'GOOGLE_APPLICATION_CREDENTIALS or GEMINI_API_KEY', message: googleRes.message });
  // if (!smtpRes.ok) issues.push({ category: 'Email (SMTP)', field: 'SMTP_*', message: smtpRes.message });

  return {
    isValid: issues.length === 0,
    issues
  };
}

module.exports = {
  verifyEnvironment,
  isPlaceholder
};
