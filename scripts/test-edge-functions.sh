#!/bin/bash

# Test Edge Functions for Dollarsmiley Automation
# This script tests all three automation Edge Functions

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# Replace these with your actual values:
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if required environment variables are set
check_config() {
    if [ -z "$SUPABASE_URL" ]; then
        print_error "SUPABASE_URL is not set"
        echo "Please set it: export SUPABASE_URL='https://your-project.supabase.co'"
        exit 1
    fi

    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY is not set"
        echo "Please set it: export SUPABASE_SERVICE_ROLE_KEY='your-key'"
        exit 1
    fi
}

# Test function
test_function() {
    local function_name=$1
    local description=$2

    print_info "Testing: $description"

    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        "${SUPABASE_URL}/functions/v1/${function_name}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        2>&1)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        print_success "$description - Success"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
        return 0
    else
        print_error "$description - Failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Main execution
main() {
    echo "================================================"
    echo "Dollarsmiley Edge Functions Test"
    echo "================================================"
    echo ""

    # Check configuration
    check_config

    print_info "Using Supabase URL: $SUPABASE_URL"
    echo ""

    # Test counters
    passed=0
    failed=0

    # Test 1: Update Trending Scores
    echo "Test 1/3: Update Trending Scores"
    echo "--------------------------------"
    if test_function "update-trending-scores" "Update Trending Scores"; then
        ((passed++))
    else
        ((failed++))
    fi
    echo ""

    # Test 2: Process Badge Updates
    echo "Test 2/3: Process Badge Updates"
    echo "--------------------------------"
    if test_function "process-badge-updates" "Process Badge Updates"; then
        ((passed++))
    else
        ((failed++))
    fi
    echo ""

    # Test 3: Cleanup Trending Data
    echo "Test 3/3: Cleanup Trending Data"
    echo "--------------------------------"
    if test_function "cleanup-trending-data" "Cleanup Trending Data"; then
        ((passed++))
    else
        ((failed++))
    fi
    echo ""

    # Summary
    echo "================================================"
    echo "Test Summary"
    echo "================================================"
    print_success "Passed: $passed/3"
    if [ $failed -gt 0 ]; then
        print_error "Failed: $failed/3"
        echo ""
        print_warning "Troubleshooting Tips:"
        echo "1. Ensure Edge Functions are deployed"
        echo "2. Check Supabase Dashboard → Edge Functions → Logs"
        echo "3. Verify SUPABASE_SERVICE_ROLE_KEY is correct"
        echo "4. Ensure database migrations are applied"
        exit 1
    else
        echo ""
        print_success "All tests passed! Automation is working correctly."
        exit 0
    fi
}

# Run main function
main
