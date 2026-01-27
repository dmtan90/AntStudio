#!/bin/bash

# ==============================================================================
# ANTFLOW ENTERPRISE SETUP UTILITY
# Professional One-Click Installation for White-Label B2B Clients
# ==============================================================================

set -e

echo "🚀 Starting AntStudio Enterprise Installation..."

# 1. Dependency Check
echo "🔍 Checking system dependencies..."
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# 2. Environment Configuration
if [ ! -f .env.enterprise ]; then
    echo "📝 Generating default Enterprise environment file (.env.enterprise)..."
    cat <<EOT > .env.enterprise
# CORE CONFIG
NODE_ENV=production
BASE_DOMAIN=localhost
JWT_SECRET=$(openssl rand -base64 32)

# DATABASE
MONGO_URI=mongodb://mongo-enterprise:27017/antflow_b2b

# AI INTEGRATIONS (REPLACE WITH YOUR KEYS)
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
VEO_API_ENDPOINT=your_veo_endpoint

# CLOUD STORAGE
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=antflow-enterprise-storage
EOT
    echo "✅ .env.enterprise generated. PLEASE EDIT THIS FILE WITH YOUR REAL API KEYS."
else
    echo "✅ .env.enterprise already exists. Using existing configuration."
fi

# 3. Pulling & Building Containers
echo "🏗️ Orchestrating Enterprise Stack..."
docker-compose -f docker-compose.enterprise.yml pull
docker-compose -f docker-compose.enterprise.yml up -d --build

# 4. Success & Health Check
echo "⏳ Waiting for services to stabilize (10s)..."
sleep 10

echo "------------------------------------------------------------------------------"
echo "🎉 ANTFLOW ENTERPRISE INSTALLED SUCCESSFULLY!"
echo "------------------------------------------------------------------------------"
echo "🌐 Frontend: http://localhost"
echo "📡 Backend API: http://localhost/api"
echo "📊 Admin Dashboard: http://localhost/admin/tenant"
echo "------------------------------------------------------------------------------"
echo "Logs can be viewed with: docker-compose -f docker-compose.enterprise.yml logs -f"
echo "------------------------------------------------------------------------------"

# Verification
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "FAILED")
if [ "$SERVER_STATUS" == "200" ]; then
    echo "✅ System Status: HEALTHY"
else
    echo "⚠️ System Status: INITIALIZING (Server returned $SERVER_STATUS)"
fi
