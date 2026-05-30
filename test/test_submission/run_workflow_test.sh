#!/usr/bin/env bash
# run_workflow_test.sh — End-to-end workflow regression test
#
# Runs the headless generator on every JSON in examples/cases/, then:
#   Gate 1: The headless runner's own built-in gates (import → validate → lint → 5-pass)
#   Gate 2: External Python linter (faers_xml_lint.py) — additional 140+ checks
#   Gate 3: assert_json_vs_xml.py — JSON→XML field-level assertion (no golden needed)
#
# Usage (from test_submission/ directory on your Mac):
#   bash run_workflow_test.sh [--quick] [--pattern <glob>]
#
#   --quick         Skip Gate 2 and Gate 3; only check Gate 1 (built-in gates)
#   --pattern STR   Only process JSONs whose path contains STR
#                   e.g. --pattern IND-T, --pattern round2/TC-F
#
# Requirements:
#   - Run from the test_submission/ directory (or FAERS_APP_DIR env set)
#   - npm run headless must work (run from faers-app/ directory)
#   - Python 3.x for Gates 2 and 3
#
# Exit: 0 = all pass, 1 = any failure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FAERS_APP_DIR="${FAERS_APP_DIR:-$SCRIPT_DIR/../../faers-app}"
CASES_DIR="$SCRIPT_DIR/examples/cases"
LINTER="$SCRIPT_DIR/faers_xml_lint.py"
ASSERTER="$SCRIPT_DIR/assert_json_vs_xml.py"
OUT_BASE="/tmp/faers_workflow_test_$$"

QUICK=""
PATTERN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick)   QUICK="1"; shift ;;
    --pattern) PATTERN="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: bash run_workflow_test.sh [--quick] [--pattern STR]"
      exit 0 ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ ! -d "$FAERS_APP_DIR" ]]; then
  echo "ERROR: faers-app directory not found at $FAERS_APP_DIR"
  echo "       Set FAERS_APP_DIR env var to the correct path."
  exit 2
fi

if [[ ! -f "$LINTER" ]]; then
  echo "ERROR: Linter not found at $LINTER"
  exit 2
fi

# Build headless runner once (avoids npm's -- separator which the CLI misreads as a flag)
echo "Building headless runner..."
(cd "$FAERS_APP_DIR" && npm run build:headless 2>&1) || { echo "ERROR: headless build failed"; exit 2; }
ELECTRON_BIN="$FAERS_APP_DIR/node_modules/.bin/electron"
if [[ ! -f "$ELECTRON_BIN" ]]; then
  ELECTRON_BIN="$(command -v electron 2>/dev/null || true)"
fi
if [[ -z "$ELECTRON_BIN" ]]; then
  echo "ERROR: electron binary not found (checked node_modules/.bin/electron and PATH)"
  exit 2
fi
echo "  Using electron: $ELECTRON_BIN"
echo ""

# Gather all JSON case files (bash 3.2-compatible; no mapfile)
ALL_JSONS=()
while IFS= read -r _f; do
  ALL_JSONS+=("$_f")
done < <(find "$CASES_DIR" -name "*.json" | sort)

if [[ ${#ALL_JSONS[@]} -eq 0 ]]; then
  echo "ERROR: No JSON files found in $CASES_DIR"
  exit 2
fi

# Apply pattern filter
JSONS=()
for f in "${ALL_JSONS[@]}"; do
  if [[ -z "$PATTERN" || "$f" == *"$PATTERN"* ]]; then
    JSONS+=("$f")
  fi
done

echo "══════════════════════════════════════════════════════════════"
echo "  FAERS Workflow Regression Test"
echo "  Cases dir:   $CASES_DIR"
echo "  App dir:     $FAERS_APP_DIR"
echo "  Files:       ${#JSONS[@]} JSON(s)$([ -n "$PATTERN" ] && echo " (filtered: $PATTERN)" || true)"
echo "  Quick mode:  $([ -n "$QUICK" ] && echo "YES (Gate 1 only)" || echo "NO (all 3 gates)")"
echo "══════════════════════════════════════════════════════════════"

mkdir -p "$OUT_BASE"

# Cases where Gate 1 is expected to fail due to known generator enforcement.
# Format: "TC-ID:reason"
# These count as ENFORCEMENT CONFIRMED, not FAIL, and exit code remains 0.
EXPECTED_GATE1_FAIL_CASES=(
  "TC-G01-nonserous:B.2.i.7 generator enforcement — non-serious reactions (all seriousness false) blocked at import; generator requires at least one criterion true"
  "TC-H02-nolocation:CDER 2.18 generator enforcement — country-only reporter blocked at import; street/city/state/postcode required"
)

_expected_gate1_reason() {
  local _id="$1"
  for _entry in "${EXPECTED_GATE1_FAIL_CASES[@]}"; do
    if [[ "${_entry%%:*}" == "$_id" ]]; then
      echo "${_entry#*:}"
      return 0
    fi
  done
  return 1
}

clean=0
enforcement=0
failed=0
declare -a failed_files=()
declare -a enforcement_files=()

for json_path in "${JSONS[@]}"; do
  tc_id=$(basename "$json_path" .json)
  out_dir="$OUT_BASE/$tc_id"
  mkdir -p "$out_dir"

  echo ""
  echo "────────────────────────────────────────────"
  echo "  Processing: $tc_id"

  # ── Gate 1: headless generator ──────────────────────────────────────────
  headless_ok=0
  headless_log="$out_dir/headless.log"

  (
    cd "$FAERS_APP_DIR"
    ELECTRON_RUN_AS_NODE=1 "$ELECTRON_BIN" out/main/headless.js \
      --out-dir "$out_dir" \
      --report \
      --allow-duplicate \
      --skip-ind-enrollment \
      --quiet \
      "$json_path" 2>&1
  ) > "$headless_log" && headless_ok=1 || true

  # The headless runner exits 0 even on partial failure; check log for errors
  if grep -q "gate.*FAIL\|Gate.*fail\|❌" "$headless_log" 2>/dev/null; then
    headless_ok=0
  fi

  # Find generated XML
  generated_xml=$(find "$out_dir" -name "*.xml" | head -1)

  if [[ -z "$generated_xml" ]]; then
    _reason="$(_expected_gate1_reason "$tc_id" || true)"
    if [[ -n "$_reason" ]]; then
      echo "  ⚙️  Gate 1 ENFORCEMENT CONFIRMED: $_reason"
      enforcement=$((enforcement + 1))
      enforcement_files+=("$tc_id")
    else
      echo "  ❌ Gate 1 FAIL: no XML produced"
      LC_ALL=C grep '✗\|Error\|failed' "$headless_log" 2>/dev/null | head -5 || true
      failed=$((failed + 1))
      failed_files+=("$tc_id (no XML generated)")
    fi
    continue
  fi

  echo "  ✅ Gate 1 PASS: XML generated → $(basename "$generated_xml")"

  if [[ -z "$QUICK" ]]; then
    # ── Gate 2: Python linter ─────────────────────────────────────────────
    lint_log="$out_dir/lint.log"
    python3 "$LINTER" "$generated_xml" > "$lint_log" 2>&1 || true
    fail_count=$(LC_ALL=C grep -c $'^  ❌ FAIL' "$lint_log" 2>/dev/null || true)

    if [[ "$fail_count" -gt 0 ]]; then
      echo "  ❌ Gate 2 FAIL: $fail_count linter failure(s)"
      LC_ALL=C grep -E $'^  ❌ FAIL|^         →' "$lint_log" || true
      failed=$((failed + 1))
      failed_files+=("$tc_id (Gate 2: $fail_count lint FAIL)")
      continue
    else
      warn_count=$(LC_ALL=C grep -c $'^  ⚠️' "$lint_log" 2>/dev/null || true)
      echo "  ✅ Gate 2 PASS: 0 FAIL, $warn_count WARN (linter)"
    fi

    # ── Gate 3: JSON→XML field assertion ──────────────────────────────────
    assert_log="$out_dir/assert.log"
    python3 "$ASSERTER" "$json_path" "$generated_xml" > "$assert_log" 2>&1 || true
    assert_exit=$?

    if [[ $assert_exit -ne 0 ]]; then
      assert_fails=$(LC_ALL=C grep -c $'^  ❌' "$assert_log" 2>/dev/null || true)
      echo "  ❌ Gate 3 FAIL: $assert_fails assertion(s) failed"
      LC_ALL=C grep -E $'^  ❌|^        →' "$assert_log" || true
      failed=$((failed + 1))
      failed_files+=("$tc_id (Gate 3: $assert_fails assertion FAIL)")
      continue
    else
      pass_count=$(LC_ALL=C grep -c $'^  ✅' "$assert_log" 2>/dev/null || true)
      echo "  ✅ Gate 3 PASS: $pass_count assertion(s) passed"
    fi
  fi

  clean=$((clean + 1))
done

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "=== WORKFLOW TEST SUMMARY ==="
echo "  ✅ Passed:               $clean"
echo "  ⚙️  Enforcement confirmed: $enforcement"
echo "  ❌ Failed:               $failed"
echo "  Total:                  ${#JSONS[@]}"
echo "  Output:                 $OUT_BASE"
echo "══════════════════════════════════════════════════════════════"

if [[ ${#enforcement_files[@]} -gt 0 ]]; then
  echo ""
  echo "ENFORCEMENT CONFIRMED (expected Gate 1 blocks):"
  for f in "${enforcement_files[@]}"; do
    _r="$(_expected_gate1_reason "$f" || true)"
    echo "  ⚙️  $f — $_r"
  done
fi

if [[ ${#failed_files[@]} -gt 0 ]]; then
  echo ""
  echo "FAILED:"
  for f in "${failed_files[@]}"; do
    echo "  ❌ $f"
  done
fi

# Cleanup tip
echo ""
echo "Logs at: $OUT_BASE"
echo "To clean up: rm -rf $OUT_BASE"

[[ $failed -eq 0 ]]
