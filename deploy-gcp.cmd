@echo off
REM ==============================================================================
REM 🚀 ANTSTUDIO - GOOGLE CLOUD AUTO-DEPLOYMENT WINDOWS CMD SCRIPT
REM Supports both:
REM 1. Cloud-Native Serverless Deployment (Google Cloud Run + Artifact Registry)
REM 2. Compute Engine VM Instance Deployment (Compute Engine + Docker Compose)
REM ==============================================================================

echo ==============================================================================
echo           🤖 ANTSTUDIO - AUTOMATED GOOGLE CLOUD DEPLOYMENT ENGINE 🤖          
echo ==============================================================================
echo.

REM Check prerequisites
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Google Cloud SDK (gcloud) is not installed.
    echo Please download and install it from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

echo [INFO] Starting Google Cloud Authorization...
call gcloud auth login --no-launch-browser
if %errorlevel% neq 0 (
    call gcloud auth login
)
echo.

:CHOOSE_MODE
echo Please select your deployment topology:
echo 1] Cloud-Native Serverless (Google Cloud Run - Recommended for Production)
echo 2] Single-Instance VM Stack (Google Compute Engine + Docker Compose)
set /p DEPLOY_MODE="Select choice [1-2]: "

if "%DEPLOY_MODE%"=="1" goto CLOUD_RUN
if "%DEPLOY_MODE%"=="2" goto COMPUTE_ENGINE
echo Invalid selection. Please choose 1 or 2.
goto CHOOSE_MODE

:CLOUD_RUN
if not exist .env (
    echo [WARNING] root .env not found. Creating from .env.example...
    copy .env.example .env
    echo [ACTION REQUIRED] Please edit the root .env file with your custom API credentials first, then re-run this script!
    pause
    exit /b 1
)

echo [INFO] Found root .env file. Loading environment variables...
setlocal enabledelayedexpansion
set ENV_VARS=
for /f "usebackq delims=" %%x in (".env") do (
    set "line=%%x"
    if not "!line:~0,1!"=="#" (
        if not "!line!"=="" (
            if "!ENV_VARS!"=="" (
                set "ENV_VARS=!line!"
            ) else (
                set "ENV_VARS=!ENV_VARS!,!line!"
            )
        )
    )
)
set "ENV_VARS=!ENV_VARS!,PORT=4000"

set /p PROJECT_ID="Enter your Google Cloud Project ID: "
if "%PROJECT_ID%"=="" (
    echo [ERROR] Project ID cannot be empty.
    exit /b 1
)

call gcloud config set project "%PROJECT_ID%"

set /p REGION="Enter Google Cloud Region [us-central1]: "
if "%REGION%"=="" set REGION=us-central1

echo [1/5] Enabling Google Cloud Services APIs...
call gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com

set REPOSITORY=antstudio-repo
echo [2/5] Creating Google Artifact Registry Repository [%REPOSITORY%]...
call gcloud artifacts repositories create "%REPOSITORY%" --repository-format=docker --location="%REGION%" --description="AntStudio Docker Images"

echo [3/5] Building ^& Pushing Backend Server to Artifact Registry...
call gcloud builds submit ./server --tag="%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY%/antstudio-server:latest"

echo [4/5] Building ^& Pushing Frontend Client to Artifact Registry...
call gcloud builds submit ./client --tag="%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY%/antstudio-client:latest"

echo [5/5] Deploying Backend Server to Google Cloud Run...
call gcloud run deploy antstudio-server --image="%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY%/antstudio-server:latest" --platform=managed --region="%REGION%" --allow-unauthenticated --set-env-vars="!ENV_VARS!" --port=4000

REM Get Cloud Run Backend URL
for /f "tokens=*" %%i in ('gcloud run services describe antstudio-server --platform=managed --region="%REGION%" --format="value(status.url)"') do set BACKEND_URL=%%i

echo [5/5] Deploying Frontend Client to Google Cloud Run...
call gcloud run deploy antstudio-client --image="%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY%/antstudio-client:latest" --platform=managed --region="%REGION%" --allow-unauthenticated --set-env-vars="VITE_API_BASE_URL=%BACKEND_URL%" --port=80

for /f "tokens=*" %%i in ('gcloud run services describe antstudio-client --platform=managed --region="%REGION%" --format="value(status.url)"') do set CLIENT_URL=%%i

echo.
echo ==============================================================================
echo  🎉 SUCCESS! ANTSTUDIO HAS BEEN DEPLOYED SUCCESSFULLY TO GOOGLE CLOUD RUN 🎉 
echo ------------------------------------------------------------------------------
echo   Backend API Server: %BACKEND_URL%
echo   Frontend Application Dashboard: %CLIENT_URL%
echo ==============================================================================
pause
exit /b 0

:COMPUTE_ENGINE
set /p PROJECT_ID="Enter your Google Cloud Project ID: "
if "%PROJECT_ID%"=="" (
    echo [ERROR] Project ID cannot be empty.
    exit /b 1
)

call gcloud config set project "%PROJECT_ID%"

set /p REGION="Enter Google Cloud Region [us-central1]: "
if "%REGION%"=="" set REGION=us-central1

echo [1/4] Enabling Compute Engine APIs...
call gcloud services enable compute.googleapis.com

set VM_NAME=antstudio-vm-stack
echo [2/4] Spin up new Compute Engine Virtual Machine Instance [%VM_NAME%]...
call gcloud compute instances create "%VM_NAME%" --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud --machine-type=e2-medium --zone="%REGION%-a" --metadata=startup-script="#!/bin/bash^
apt-get update^
apt-get install -y docker.io docker-compose git^
systemctl start docker^
systemctl enable docker"

echo [3/4] Fetching public IP address of VM...
echo Waiting for VM setup to initialize...
timeout /t 15

for /f "tokens=*" %%i in ('gcloud compute instances describe "%VM_NAME%" --zone="%REGION%-a" --format="value(networkInterfaces[0].accessConfigs[0].natIP)"') do set VM_IP=%%i

echo [SUCCESS] VM Instance is running at: %VM_IP%

echo [4/4] Configuring Firewall Rules for Ports 80 and 4000...
call gcloud compute firewall-rules create antstudio-ports --allow=tcp:80,tcp:4000 --description="Allow HTTP and AntStudio Backend traffic" --direction=INGRESS

echo.
echo ==============================================================================
echo  🎉 SUCCESS! COMPUTE ENGINE VM STACK INITIALIZED 🎉 
echo ------------------------------------------------------------------------------
echo   Virtual Machine IP: %VM_IP%
echo.
echo   👉 NEXT STEPS FOR VM SETUP:
echo   1. SSH into your new VM:
echo      gcloud compute ssh %VM_NAME% --zone=%REGION%-a
echo   2. Clone your repository on the VM and run:
echo      docker-compose up -d
echo ==============================================================================
pause
exit /b 0
