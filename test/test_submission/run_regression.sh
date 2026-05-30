#!/usr/bin/env bash
# run_regression.sh — lint all 35 golden XMLs against faers_xml_lint.py
# Usage: bash run_regression.sh [--quick]
#   --quick  only print files with failures (suppress clean output)
#
# Fail-count grep:  matches "  ❌ FAIL  label" (2 leading spaces)
#                   does NOT match the summary line "  RESULT: N ✅ PASS | 0 ❌ FAIL"
# Exit code:  0 if all files pass (0 FAIL), 1 if any failures found.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LINTER="$SCRIPT_DIR/faers_xml_lint.py"
XML_DIR="$SCRIPT_DIR/regression/xml"
QUICK=${1:-""}

if [[ ! -f "$LINTER" ]]; then
    echo "ERROR: Linter not found at $LINTER"
    exit 2
fi

if [[ ! -d "$XML_DIR" ]]; then
    echo "ERROR: XML directory not found at $XML_DIR"
    exit 2
fi

clean=0
warn_only=0
failed=0
total=0
declare -a failed_files=()
declare -a warn_files=()

for xml_file in "$XML_DIR"/*.xml; do
    fname=$(basename "$xml_file")
    total=$((total + 1))

    # Run linter; capture output and exit code separately
    output=$(python3 "$LINTER" "$xml_file" 2>&1) || true
    exit_code=$?

    # Count actual FAIL lines: lines starting with exactly 2 spaces then ❌ FAIL
    # Use LC_ALL=C to avoid unicode locale issues with grep
    fail_count=$(echo "$output" | LC_ALL=C grep -c $'^  ❌ FAIL' 2>/dev/null || true)
    warn_count=$(echo "$output" | LC_ALL=C grep -c $'^  ⚠️' 2>/dev/null || true)

    # Also treat non-zero exit with SyntaxError as a failure
    if [[ $exit_code -ne 0 && $fail_count -eq 0 ]]; then
        fail_count=1
    fi

    if [[ $fail_count -gt 0 ]]; then
        failed=$((failed + 1))
        failed_files+=("$fname ($fail_count FAIL)")
        if [[ "$QUICK" != "--quick" ]]; then
            echo ""
            echo "══════════════════════════════════════════"
            echo "  ❌ $fname"
            echo "══════════════════════════════════════════"
            echo "$output" | LC_ALL=C grep -E $'^  ❌ FAIL|^         →' || true
        fi
    elif [[ $warn_count -gt 0 ]]; then
        warn_only=$((warn_only + 1))
        warn_files+=("$fname ($warn_count WARN)")
        if [[ "$QUICK" != "--quick" ]]; then
            echo "  ⚠️  $fname — $warn_count WARN"
        fi
    else
        clean=$((clean + 1))
        if [[ "$QUICK" != "--quick" ]]; then
            echo "  ✅ $fname"
        fi
    fi
done

echo ""
echo "════════════════════════════════════════"
echo "=== REGRESSION SUMMARY ==="
echo "  ✅ Clean (0 FAIL, 0 WARN): $clean"
echo "  ⚠️  Warn only:              $warn_only"
echo "  ❌ Has failures:            $failed"
echo "  Total files:               $total"
echo "════════════════════════════════════════"

if [[ ${#failed_files[@]} -gt 0 ]]; then
    echo ""
    echo "FAILED FILES:"
    for f in "${failed_files[@]}"; do
        echo "  ❌ $f"
    done
fi

if [[ ${#warn_files[@]} -gt 0 ]]; then
    echo ""
    echo "WARN FILES:"
    for f in "${warn_files[@]}"; do
        echo "  ⚠️  $f"
    done
fi

if [[ $failed -gt 0 ]]; then
    exit 1
fi
exit 0
