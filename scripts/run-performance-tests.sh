#!/bin/bash

# ============================================================================
# Automated Performance Test Runner
# Home Screen & Filters Performance Testing
# ============================================================================
#
# This script runs automated performance tests for the Home screen and
# Filters functionality. It collects metrics and generates a performance
# report.
#
# Usage:
#   bash scripts/run-performance-tests.sh
#
# ============================================================================

echo "=========================================================================="
echo "PERFORMANCE TEST EXECUTION - HOME SCREEN & FILTERS"
echo "=========================================================================="
echo ""
echo "This test will:"
echo "  1. Run automated tests for filter operations"
echo "  2. Collect performance metrics (timing, renders, network calls)"
echo "  3. Generate a detailed performance report"
echo ""
echo "Tests to execute:"
echo "  - Open Filters (3 iterations)"
echo "  - Close Filters (3 iterations)"
echo "  - Apply Job Filter (3 iterations)"
echo "  - Clear All (Job) (3 iterations)"
echo "  - Apply Service Filter (3 iterations)"
echo "  - Clear All (Service) (3 iterations)"
echo "  - First Home Screen Load (3 iterations)"
echo ""
echo "Starting tests..."
echo ""
echo "=========================================================================="
echo ""

# Run the performance tests
npm test -- __tests__/performance/home-filters-performance.test.tsx --verbose

echo ""
echo "=========================================================================="
echo "TEST EXECUTION COMPLETE"
echo "=========================================================================="
echo ""
echo "Reports generated:"
echo "  - Console output above"
echo "  - PERFORMANCE_TEST_REPORT.json (if successful)"
echo ""
echo "=========================================================================="
