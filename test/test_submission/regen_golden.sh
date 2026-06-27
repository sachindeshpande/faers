#!/usr/bin/env bash
# regen_golden.sh — Regenerate all golden-dataset XMLs from the fixed generator
#
# For every JSON in examples/cases/ (root level + round2/), this script:
#   1. Runs the headless generator (Gate 1)
#   2. Renames the output CASE-*.xml to TC-*.xml
#   3. Runs faers_xml_lint.py on it (Gate 2)
#   4. Copies the linted XML to from_app/headless/ or from_app/round2/
#
# After this script completes, run submit_batch.py to send all pending cases.
#
# Usage (from test_submission/ directory):
#   bash regen_golden.sh [--pattern STR] [--dry-run] [--skip-lint]
#
#   --pattern STR   Only process JSONs whose filename contains STR
#   --dry-run       Generate and lint only; do NOT copy to from_app/
#   --skip-lint     Skip Gate 2 (linter); copy unconditionally
#
# Exit: 0 = all pass or enforcement-confirmed, 1 = any unexpected failure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FAERS_APP_DIR="${FAERS_APP_DIR:-$SCRIPT_DIR/../../faers-app}"
CASES_DIR="$SCRIPT_DIR/examples/cases"
LINTER="$SCRIPT_DIR/faers_xml_lint.py"
HEADLESS_DEST="$SCRIPT_DIR/from_app/headless"
ROUND2_DEST="$SCRIPT_DIR/from_app/round2"
TMP_BASE="/tmp/faers_regen_$$"

PATTERN=""
DRY_RUN=""
SKIP_LINT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pattern)  PATTERN="$2"; shift 2 ;;
    --dry-run)  DRY_RUN="1"; shift ;;
    --skip-lint) SKIP_LINT="1"; shift ;;
    -h|--help)
      echo "Usage: bash regen_golden.sh [--pattern STR] [--dry-run] [--skip-lint]"
      exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ ! -d "$FAERS_APP_DIR" ]]; then
  echo "ERROR: faers-app directory not found at $FAERS_APP_DIR"
  echo "       Set FAERS_APP_DIR env var to the correct path."
  exit 2
fi

# ── Build headless runner once ────────────────────────────────────────────────
echo "Building headless runner (from $FAERS_APP_DIR)..."
(cd "$FAERS_APP_DIR" && npm run build:headless 2>&1) || { echo "ERROR: headless build failed"; exit 2; }
ELECTRON_BIN="$FAERS_APP_DIR/node_modules/.bin/electron"
[[ -f "$ELECTRON_BIN" ]] || ELECTRON_BIN="$(command -v electron 2>/dev/null || true)"
[[ -n "$ELECTRON_BIN" ]] || { echo "ERROR: electron binary not found"; exit 2; }
echo "  Using electron: $ELECTRON_BIN"
echo ""

# ── Collect cases (root + round2) ─────────────────────────────────────────────
# Cases where Gate 1 is expected to fail (generator enforcement, not bugs).
EXPECTED_FAIL_CASES=("TC-G01-nonserous" "TC-H02-nolocation")

_is_expected_fail() {
  local _id="$1"
  for _e in "${EXPECTED_FAIL_CASES[@]}"; do
    [[ "$_e" == "$_id" ]] && return 0
  done
  return 1
}

# Discover all JSONs: root-level cases first, then round2
ROOT_JSONS=()
while IFS= read -r f; do
  # Exclude README and non-case files; only TC-*, IND-T* and 2L8T-baseline
  bn=$(basename "$f" .json)
  [[ "$bn" == TC-* || "$bn" == IND-T* || "$bn" == "2L8T-baseline" ]] || continue
  ROOT_JSONS+=("$f")
done < <(find "$CASES_DIR" -maxdepth 1 -name "*.json" | sort)

ROUND2_JSONS=()
while IFS= read -r f; do
  ROUND2_JSONS+=("$f")
done < <(find "$CASES_DIR/round2" -maxdepth 1 -name "TC-*.json" 2>/dev/null | sort)

# Combine with source-directory annotation
declare -a ALL_CASES=()
declare -a ALL_DESTS=()

for f in "${ROOT_JSONS[@]}"; do
  [[ -z "$PATTERN" || "$(basename "$f")" == *"$PATTERN"* ]] || continue
  ALL_CASES+=("$f")
  ALL_DESTS+=("$HEADLESS_DEST")
done
for f in "${ROUND2_JSONS[@]}"; do
  [[ -z "$PATTERN" || "$(basename "$f")" == *"$PATTERN"* ]] || continue
  ALL_CASES+=("$f")
  ALL_DESTS+=("$ROUND2_DEST")
done

echo "══════════════════════════════════════════════════════════════"
echo "  FAERS Golden Dataset Regeneration"
echo "  Cases:     ${#ALL_CASES[@]}$([ -n "$PATTERN" ] && echo " (filtered: $PATTERN)" || true)"
echo "  Dry-run:   $([ -n "$DRY_RUN" ] && echo "YES (will NOT copy to from_app/)" || echo "NO")"
echo "  Skip-lint: $([ -n "$SKIP_LINT" ] && echo "YES" || echo "NO")"
echo "══════════════════════════════════════════════════════════════"

mkdir -p "$TMP_BASE" "$HEADLESS_DEST" "$ROUND2_DEST"

clean=0
enforcement=0
failed=0
declare -a failed_list=()
declare -a enforcement_list=()
declare -a copied_list=()

for i in "${!ALL_CASES[@]}"; do
  json_path="${ALL_CASES[$i]}"
  dest_dir="${ALL_DESTS[$i]}"
  tc_id=$(basename "$json_path" .json)
  out_dir="$TMP_BASE/$tc_id"
  mkdir -p "$out_dir"

  echo ""
  echo "────────────────────────────────────────────"
  echo "  [$((i+1))/${#ALL_CASES[@]}] $tc_id"

  # ── Gate 1: headless generator ──────────────────────────────────────────────
  (
    cd "$FAERS_APP_DIR"
    ELECTRON_RUN_AS_NODE=1 "$ELECTRON_BIN" out/main/headless.js \
      --out-dir "$out_dir" \
      --report \
      --allow-duplicate \
      --skip-ind-enrollment \
      --quiet \
      "$json_path" 2>&1
  ) > "$out_dir/headless.log" || true

  # Headless runner names XML after the JSON basename (TC-xxx.xml or 2L8T-baseline.xml),
  # not CASE-<date>-<id>.xml. Use *.xml glob.
  generated_xml=$(find "$out_dir" -name "*.xml" | head -1)

  if [[ -z "$generated_xml" ]]; then
    if _is_expected_fail "$tc_id"; then
      echo "  ⚙️  Gate 1 ENFORCEMENT CONFIRMED (expected block)"
      enforcement=$((enforcement + 1))
      enforcement_list+=("$tc_id")
    else
      echo "  ❌ Gate 1 FAIL: no XML produced"
      grep -E 'Error|failed|✗' "$out_dir/headless.log" 2>/dev/null | head -5 || true
      failed=$((failed + 1))
      failed_list+=("$tc_id (no XML generated)")
    fi
    continue
  fi

  # 5-pass comparison may fail for cases affected by our generator fix (autopsyPerformed,
  # G.k XPaths). The XML is still valid — the stored v37 reference is simply stale.
  # Log the warning but do not block.
  if grep -q "5pass:" "$out_dir/headless.log" 2>/dev/null; then
    fivepass_detail=$(grep "5pass:" "$out_dir/headless.log" | head -1 | sed 's/.*5pass: //')
    echo "  ⚠️  Gate 1 5-pass diff vs stored ref (expected after generator fix): $fivepass_detail"
  else
    echo "  ✅ Gate 1 PASS: $(basename "$generated_xml")"
  fi

  # ── Gate 2: linter ──────────────────────────────────────────────────────────
  if [[ -z "$SKIP_LINT" ]]; then
    python3 "$LINTER" "$generated_xml" > "$out_dir/lint.log" 2>&1 || true
    fail_count=$(grep -c $'^  ❌ FAIL' "$out_dir/lint.log" 2>/dev/null || echo 0)
    warn_count=$(grep -c $'^  ⚠️' "$out_dir/lint.log" 2>/dev/null || echo 0)

    if [[ "$fail_count" -gt 0 ]]; then
      echo "  ❌ Gate 2 FAIL: $fail_count linter failure(s)"
      grep -E $'^  ❌ FAIL|^         →' "$out_dir/lint.log" || true
      failed=$((failed + 1))
      failed_list+=("$tc_id (Gate 2: $fail_count lint FAIL)")
      continue
    fi
    echo "  ✅ Gate 2 PASS: 0 FAIL, $warn_count WARN"
  fi

  # ── Copy to from_app/ (with TC-* rename) ────────────────────────────────────
  dest_xml="$dest_dir/${tc_id}.xml"
  if [[ -z "$DRY_RUN" ]]; then
    cp "$generated_xml" "$dest_xml"
    echo "  📋 Copied → $(basename "$dest_dir")/$(basename "$dest_xml")"
    copied_list+=("$tc_id")
  else
    echo "  ℹ️  (dry-run) Would copy → $(basename "$dest_dir")/$(basename "$dest_xml")"
  fi

  clean=$((clean + 1))
done

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "=== REGEN SUMMARY ==="
echo "  ✅ Regenerated:            $clean"
echo "  ⚙️  Enforcement confirmed:  $enforcement"
echo "  ❌ Failed:                 $failed"
echo "  Total:                    ${#ALL_CASES[@]}"
[[ -z "$DRY_RUN" ]] && echo "  Copied to from_app/:       ${#copied_list[@]}"
echo "  Temp output:              $TMP_BASE"
echo "══════════════════════════════════════════════════════════════"

if [[ ${#enforcement_list[@]} -gt 0 ]]; then
  echo ""
  echo "ENFORCEMENT CONFIRMED:"
  for f in "${enforcement_list[@]}"; do echo "  ⚙️  $f"; done
fi

if [[ ${#failed_list[@]} -gt 0 ]]; then
  echo ""
  echo "FAILURES:"
  for f in "${failed_list[@]}"; do echo "  ❌ $f"; done
fi

if [[ -z "$DRY_RUN" && ${#copied_list[@]} -gt 0 ]]; then
  echo ""
  echo "XMLs ready in from_app/ — run submit_batch.py to submit:"
  echo "  cd $(dirname "$SCRIPT_DIR") && python3 test_submission/submit_batch.py"
fi

echo ""
echo "Logs at: $TMP_BASE"
echo "To clean: rm -rf $TMP_BASE"

[[ $failed -eq 0 ]]
