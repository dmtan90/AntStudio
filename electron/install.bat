@echo off
setlocal EnableDelayedExpansion
:: =============================================================================
::  AntStudio — Install as Windows Service
::  Registers the app to auto-start on boot in silent/headless mode.
::
::  Usage (Run as Administrator):
::    install.bat
::
::  To uninstall:
::    install.bat --uninstall
::
::  Requirements:
::    NSSM (Non-Sucking Service Manager) — downloaded automatically if missing.
::    Download page: https://nssm.cc
:: =============================================================================

title AntStudio — Service Installer

echo ===================================================
echo   AntStudio Service Installer
echo ===================================================
echo.

:: ---- Admin check -----------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo         Right-click install.bat and choose "Run as administrator".
    pause
    exit /b 1
)

:: ---- Paths -----------------------------------------------------------------
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "SERVICE_NAME=AntStudio"
set "EXEC=%SCRIPT_DIR%\AntStudio.exe"
set "NSSM=%SCRIPT_DIR%\nssm.exe"
set "LOG_DIR=%SCRIPT_DIR%\logs"

if not exist "%EXEC%" (
    echo [ERROR] AntStudio.exe not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

:: ---- Uninstall path --------------------------------------------------------
if /i "%~1"=="--uninstall" goto :uninstall

:: ---- Ensure NSSM is available ----------------------------------------------
if not exist "%NSSM%" (
    echo [INFO] NSSM not found. Downloading nssm.exe...
    echo        Source: https://nssm.cc/release/nssm-2.24.zip

    :: Try PowerShell download
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "try { $url='https://nssm.cc/release/nssm-2.24.zip'; $zip='%TEMP%\nssm.zip'; Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath '%TEMP%\nssm' -Force; Copy-Item '%TEMP%\nssm\nssm-2.24\win64\nssm.exe' '%SCRIPT_DIR%\nssm.exe' -Force; Write-Host 'NSSM downloaded successfully.' } catch { Write-Error $_.Exception.Message; exit 1 }" 2>nul

    if not exist "%NSSM%" (
        echo.
        echo [ERROR] Failed to auto-download NSSM.
        echo         Please download nssm.exe manually from https://nssm.cc
        echo         and place it next to this install.bat file, then re-run.
        pause
        exit /b 1
    )
    echo [OK] NSSM downloaded to %NSSM%
    echo.
)

:: ---- Create log directory --------------------------------------------------
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ---- Stop and remove existing service if present ---------------------------
"%NSSM%" status "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Removing existing service...
    "%NSSM%" stop    "%SERVICE_NAME%" 2>nul
    "%NSSM%" remove  "%SERVICE_NAME%" confirm 2>nul
    timeout /t 2 /nobreak >nul
)

:: ---- Install service -------------------------------------------------------
echo [INFO] Registering Windows Service: %SERVICE_NAME%
echo        Executable : %EXEC%
echo        Arguments  : --silent
echo        Working Dir: %SCRIPT_DIR%
echo.

"%NSSM%" install "%SERVICE_NAME%" "%EXEC%"
"%NSSM%" set     "%SERVICE_NAME%" AppParameters      "--silent"
"%NSSM%" set     "%SERVICE_NAME%" AppDirectory       "%SCRIPT_DIR%"
"%NSSM%" set     "%SERVICE_NAME%" Description        "AntStudio AI Live Studio - headless server mode"
"%NSSM%" set     "%SERVICE_NAME%" DisplayName        "AntStudio Server"

:: Auto-restart on failure
"%NSSM%" set     "%SERVICE_NAME%" AppRestartDelay    10000
"%NSSM%" set     "%SERVICE_NAME%" AppThrottle        5000

:: Logging
"%NSSM%" set     "%SERVICE_NAME%" AppStdout          "%LOG_DIR%\stdout.log"
"%NSSM%" set     "%SERVICE_NAME%" AppStderr          "%LOG_DIR%\stderr.log"
"%NSSM%" set     "%SERVICE_NAME%" AppStdoutCreationDisposition 4
"%NSSM%" set     "%SERVICE_NAME%" AppStderrCreationDisposition 4
"%NSSM%" set     "%SERVICE_NAME%" AppRotateFiles     1
"%NSSM%" set     "%SERVICE_NAME%" AppRotateSeconds   86400
"%NSSM%" set     "%SERVICE_NAME%" AppRotateBytes     10485760

:: Environment variables
"%NSSM%" set     "%SERVICE_NAME%" AppEnvironmentExtra "SILENT_MODE=true" "NODE_ENV=production"

:: Start type: Automatic
"%NSSM%" set     "%SERVICE_NAME%" Start              SERVICE_AUTO_START

:: ---- Start the service now -------------------------------------------------
echo [INFO] Starting service...
"%NSSM%" start   "%SERVICE_NAME%"

if %errorLevel% equ 0 (
    echo.
    echo ===================================================
    echo   [OK] AntStudio service installed and started!
    echo   The app will now start automatically on boot.
    echo ===================================================
    echo.
    echo   Useful commands:
    echo     sc query  AntStudio
    echo     sc stop   AntStudio
    echo     sc start  AntStudio
    echo     type "%LOG_DIR%\stdout.log"
    echo.
    echo   To uninstall:
    echo     Run install.bat --uninstall  (as Administrator)
) else (
    echo.
    echo [WARN] Service installed but failed to start immediately.
    echo        Check logs: %LOG_DIR%\stderr.log
    echo        You can start it manually: sc start AntStudio
)

goto :end

:: ---- Uninstall -------------------------------------------------------------
:uninstall
echo ===================================================
echo   Uninstalling AntStudio Service...
echo ===================================================

if not exist "%NSSM%" (
    :: Try sc.exe as fallback
    sc stop   "%SERVICE_NAME%" >nul 2>&1
    sc delete "%SERVICE_NAME%" >nul 2>&1
    echo [OK] Service removed via sc.exe.
    goto :end
)

"%NSSM%" stop   "%SERVICE_NAME%" 2>nul
timeout /t 2 /nobreak >nul
"%NSSM%" remove "%SERVICE_NAME%" confirm

echo.
echo [OK] AntStudio service removed.
echo      Log files kept at: %LOG_DIR%
echo.

:end
echo.
pause
endlocal
