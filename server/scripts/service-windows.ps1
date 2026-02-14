# AntFlow Windows Service Management Script
# Usage: .\service-windows.ps1 -Action [install|uninstall|start|stop]

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("install", "uninstall", "start", "stop")]
    $Action
)

$ServiceName = "AntFlowEngine"
$DisplayName = "AntFlow AI Studio Engine"
$Description = "Standalone Backend & Frontend for AntFlow AI Studio"
$ExePath = Join-Path $PSScriptRoot "..\bin\antflow-win.exe"

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

switch ($Action) {
    "install" {
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Write-Warning "Service '$ServiceName' is already installed."
        } else {
            if (-not (Test-Path $ExePath)) {
                Write-Error "Binary not found at $ExePath. Please build it first."
                exit 1
            }
            New-Service -Name $ServiceName `
                        -BinaryPathName "`"$ExePath`"" `
                        -DisplayName $DisplayName `
                        -Description $Description `
                        -StartupType Automatic
            
            # Configure Auto-Restart on Failure (Retry after 10s, 30s, 60s)
            sc.exe failure $ServiceName reset= 86400 actions= restart/10000/restart/30000/restart/60000
            
            Write-Host "✅ Service '$ServiceName' installed with auto-restart successfully."
        }
    }
    "uninstall" {
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Stop-Service $ServiceName -ErrorAction SilentlyContinue
            sc.exe delete $ServiceName
            Write-Host "✅ Service '$ServiceName' uninstalled successfully."
        } else {
            Write-Warning "Service '$ServiceName' is not installed."
        }
    }
    "start" {
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Start-Service $ServiceName
            Write-Host "✅ Service '$ServiceName' started."
        } else {
            Write-Error "Service '$ServiceName' not found. Install it first."
        }
    }
    "stop" {
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Stop-Service $ServiceName
            Write-Host "✅ Service '$ServiceName' stopped."
        } else {
            Write-Warning "Service '$ServiceName' is not running."
        }
    }
}
