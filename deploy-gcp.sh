#!/usr/bin/env bash
# ==============================================================================
# 🚀 ANTSTUDIO - GOOGLE CLOUD AUTO-DEPLOYMENT SCRIPT
# Supports both:
# 1. Cloud-Native Serverless Deployment (Google Cloud Run + Artifact Registry)
# 2. Compute Engine VM Instance Deployment (Compute Engine + Docker Compose)
# ==============================================================================

set -e

# Curated HSL colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=============================================================================="
echo "          🤖 ANTSTUDIO - AUTOMATED GOOGLE CLOUD DEPLOYMENT ENGINE 🤖          "
echo "=============================================================================="
echo -e "${NC}"

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}[ERROR] Google Cloud SDK (gcloud) is not installed.${NC}"
    echo "Please download and install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# ==========================================
# ⚙️ CONFIGURATION & SELECTION
# ==========================================
echo -e "${YELLOW}[INFO] Starting Google Cloud Authorization...${NC}"
gcloud auth login --no-launch-browser || gcloud auth login

echo ""
echo -e "${CYAN}Please select your deployment topology:${NC}"
echo "1) Cloud-Native Serverless (Google Cloud Run - Recommended for Production)"
echo "2) Single-Instance VM Stack (Google Compute Engine + Docker Compose)"
read -p "Select choice [1-2]: " DEPLOY_MODE

# Get Project ID
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}[ERROR] Project ID cannot be empty.${NC}"
    exit 1
fi

gcloud config set project "$PROJECT_ID"

# Get Region
read -p "Enter Google Cloud Region (e.g. us-central1, asia-east1) [us-central1]: " REGION
REGION=${REGION:-us-central1}

# ==========================================
# 🛠️ OPTION 1: GOOGLE CLOUD RUN (SERVERLESS)
# ==========================================
if [ "$DEPLOY_MODE" == "1" ]; then
    # Load and parse root .env variables
    if [ -f .env ]; then
        echo -e "${YELLOW}[INFO] Found root .env file. Loading environment variables...${NC}"
        ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | paste -sd "," -)
        # Ensure PORT is explicitly set to 4000
        ENV_VARS="${ENV_VARS},PORT=4000"
    else
        echo -e "${YELLOW}[WARNING] root .env not found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}[ACTION REQUIRED] Please edit the root .env file with your custom API credentials first, then re-run this script!${NC}"
        exit 1
    fi

    echo -e "${BLUE}[1/5] Enabling Google Cloud Services APIs...${NC}"
    gcloud services enable artifactregistry.googleapis.com \
                           run.googleapis.com \
                           cloudbuild.googleapis.com

    REPOSITORY="antstudio-repo"
    echo -e "${BLUE}[2/5] Creating Google Artifact Registry Repository [${REPOSITORY}]...${NC}"
    gcloud artifacts repositories create "$REPOSITORY" \
        --repository-format=docker \
        --location="$REGION" \
        --description="AntStudio Docker Images" || echo "Repository already exists"

    # Build and Push Backend
    echo -e "${BLUE}[3/5] Building & Pushing Backend Server to Artifact Registry...${NC}"
    gcloud builds submit ./server \
        --tag="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/antstudio-server:latest"

    # Build and Push Frontend Client
    echo -e "${BLUE}[4/5] Building & Pushing Frontend Client to Artifact Registry...${NC}"
    gcloud builds submit ./client \
        --tag="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/antstudio-client:latest"

    # Deploy Serverless Backend to Cloud Run
    echo -e "${BLUE}[5/5] Deploying Backend Server to Google Cloud Run...${NC}"
    gcloud run deploy antstudio-server \
        --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/antstudio-server:latest" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --set-env-vars="$ENV_VARS" \
        --port=4000

    # Get Cloud Run Backend URL
    BACKEND_URL=$(gcloud run services describe antstudio-server --platform=managed --region="$REGION" --format='value(status.url)')

    # Deploy Serverless Frontend to Cloud Run
    echo -e "${BLUE}[5/5] Deploying Frontend Client to Google Cloud Run...${NC}"
    gcloud run deploy antstudio-client \
        --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/antstudio-client:latest" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL}" \
        --port=80

    CLIENT_URL=$(gcloud run services describe antstudio-client --platform=managed --region="$REGION" --format='value(status.url)')

    echo -e "${GREEN}"
    echo "=============================================================================="
    echo " 🎉 SUCCESS! ANTSTUDIO HAS BEEN DEPLOYED SUCCESSFULLY TO GOOGLE CLOUD RUN 🎉 "
    echo "------------------------------------------------------------------------------"
    echo "  Backend API Server: ${BACKEND_URL}"
    echo "  Frontend Application Dashboard: ${CLIENT_URL}"
    echo "=============================================================================="
    echo -e "${NC}"

# ==========================================
# 🐧 OPTION 2: COMPUTE ENGINE VM (DOCKER)
# ==========================================
elif [ "$DEPLOY_MODE" == "2" ]; then
    echo -e "${BLUE}[1/4] Enabling Compute Engine APIs...${NC}"
    gcloud services enable compute.googleapis.com

    VM_NAME="antstudio-vm-stack"
    echo -e "${BLUE}[2/4] Spin up new Compute Engine Virtual Machine Instance [${VM_NAME}]...${NC}"
    gcloud compute instances create "$VM_NAME" \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --machine-type=e2-medium \
        --zone="${REGION}-a" \
        --metadata=startup-script='#!/bin/bash
        apt-get update
        apt-get install -y docker.io docker-compose git
        systemctl start docker
        systemctl enable docker'

    # Retrieve VM Public IP
    echo -e "${BLUE}[3/4] Fetching public IP address of VM...${NC}"
    echo "Waiting for VM setup to initialize..."
    sleep 15
    VM_IP=$(gcloud compute instances describe "$VM_NAME" --zone="${REGION}-a" --format='value(networkInterfaces[0].accessConfigs[0].natIP)')

    echo -e "${GREEN}[SUCCESS] VM Instance is running at: ${VM_IP}${NC}"

    # Setup Firewall Ports
    echo -e "${BLUE}[4/4] Configuring Firewall Rules for Ports 80 (HTTP) and 4000 (Backend API)...${NC}"
    gcloud compute firewall-rules create antstudio-ports \
        --allow=tcp:80,tcp:4000 \
        --description="Allow HTTP and AntStudio Backend traffic" \
        --direction=INGRESS || echo "Firewall rule already exists"

    echo -e "${GREEN}"
    echo "=============================================================================="
    echo " 🎉 SUCCESS! COMPUTE ENGINE VM STACK INITIALIZED 🎉 "
    echo "------------------------------------------------------------------------------"
    echo "  Virtual Machine IP: ${VM_IP}"
    echo ""
    echo "  👉 NEXT STEPS FOR VM SETUP:"
    echo "  1. SSH into your new VM:"
    echo "     gcloud compute ssh ${VM_NAME} --zone=${REGION}-a"
    echo "  2. Clone your repository on the VM and run:"
    echo "     docker-compose up -d"
    echo "=============================================================================="
    echo -e "${NC}"

else
    echo -e "${RED}[ERROR] Invalid choice.${NC}"
    exit 1
fi
