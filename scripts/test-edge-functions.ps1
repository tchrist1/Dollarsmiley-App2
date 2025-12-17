# Test Edge Functions for Dollarsmiley Automation (PowerShell)
# This script tests all three automation Edge Functions on Windows

# Configuration
# Set these environment variables or replace directly:
$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

# Function to print colored output
function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param($Message)
    Write-Host "→ $Message" -ForegroundColor Cyan
}

# Check if required environment variables are set
function Test-Config {
    if ([string]::IsNullOrEmpty($SUPABASE_URL)) {
        Write-Error-Custom "SUPABASE_URL is not set"
        Write-Host "Please set it: `$env:SUPABASE_URL='https://your-project.supabase.co'"
        exit 1
    }

    if ([string]::IsNullOrEmpty($SUPABASE_SERVICE_ROLE_KEY)) {
        Write-Error-Custom "SUPABASE_SERVICE_ROLE_KEY is not set"
        Write-Host "Please set it: `$env:SUPABASE_SERVICE_ROLE_KEY='your-key'"
        exit 1
    }
}

# Test function
function Test-EdgeFunction {
    param(
        [string]$FunctionName,
        [string]$Description
    )

    Write-Info "Testing: $Description"

    try {
        $headers = @{
            "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        }

        $url = "$SUPABASE_URL/functions/v1/$FunctionName"

        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -ErrorAction Stop

        Write-Success "$Description - Success"
        Write-Host "Response:" -ForegroundColor Gray
        $response | ConvertTo-Json -Depth 3
        Write-Host ""
        return $true
    }
    catch {
        Write-Error-Custom "$Description - Failed"
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Main execution
function Main {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Dollarsmiley Edge Functions Test" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    # Check configuration
    Test-Config

    Write-Info "Using Supabase URL: $SUPABASE_URL"
    Write-Host ""

    # Test counters
    $passed = 0
    $failed = 0

    # Test 1: Update Trending Scores
    Write-Host "Test 1/3: Update Trending Scores" -ForegroundColor Yellow
    Write-Host "--------------------------------" -ForegroundColor Yellow
    if (Test-EdgeFunction -FunctionName "update-trending-scores" -Description "Update Trending Scores") {
        $passed++
    } else {
        $failed++
    }

    # Test 2: Process Badge Updates
    Write-Host "Test 2/3: Process Badge Updates" -ForegroundColor Yellow
    Write-Host "--------------------------------" -ForegroundColor Yellow
    if (Test-EdgeFunction -FunctionName "process-badge-updates" -Description "Process Badge Updates") {
        $passed++
    } else {
        $failed++
    }

    # Test 3: Cleanup Trending Data
    Write-Host "Test 3/3: Cleanup Trending Data" -ForegroundColor Yellow
    Write-Host "--------------------------------" -ForegroundColor Yellow
    if (Test-EdgeFunction -FunctionName "cleanup-trending-data" -Description "Cleanup Trending Data") {
        $passed++
    } else {
        $failed++
    }

    # Summary
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Test Summary" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Success "Passed: $passed/3"

    if ($failed -gt 0) {
        Write-Error-Custom "Failed: $failed/3"
        Write-Host ""
        Write-Warning-Custom "Troubleshooting Tips:"
        Write-Host "1. Ensure Edge Functions are deployed"
        Write-Host "2. Check Supabase Dashboard → Edge Functions → Logs"
        Write-Host "3. Verify SUPABASE_SERVICE_ROLE_KEY is correct"
        Write-Host "4. Ensure database migrations are applied"
        exit 1
    } else {
        Write-Host ""
        Write-Success "All tests passed! Automation is working correctly."
        exit 0
    }
}

# Run main function
Main
