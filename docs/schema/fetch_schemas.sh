#!/usr/bin/env bash
# fetch_schemas.sh — Download real HL7v3 XSD files for FAERS E2B(R3) validation
#
# Run from your LOCAL machine from the workspace root:
#   bash faers/docs/schema/fetch_schemas.sh
#
# Sources used (tried in order per file):
#   1. Gazelle IHE (NE2008 coreschemas — confirmed working)
#   2. EudraVigilance EMA (ICH ICSR multicacheschemas)
#   3. eHealth Suisse IHE mirror (fallback)
#
# Complete include chain for MCCI_IN200100UV01.xsd:
#   MCCI_IN200100UV01.xsd → MCCI_MT200100UV.xsd
#     → coreschemas/infrastructureRoot.xsd  (defines HL7v3 data types incl. TN/EN)
#     → COCT_MT040203UV01.xsd
#     → PORR_IN049006UV.xsd
#     → PORR_IN049007UV.xsd
#     → PORR_IN049008UV.xsd

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE="$SCRIPT_DIR/coreschemas"
MULTI="$SCRIPT_DIR/multicacheschemas"

GAZELLE="https://connectathon.ihe-catalyst.net/XSD/HL7/V3/NE2008"
EUDRA="http://eudravigilance.ema.europa.eu/XSD"
EHSUISSE="https://ehealthsuisse.ihe-europe.net/xsd/HL7/V3/NE2008"

# Try to download a file from multiple URLs in order; stop at first success.
# Usage: fetch_one <dest_path> <url1> [url2] [url3]
fetch_one() {
    local dest="$1"; shift
    for url in "$@"; do
        curl -s --max-time 15 -o "$dest" "$url" 2>/dev/null
        local first; first=$(head -1 "$dest" 2>/dev/null)
        if echo "$first" | grep -q "<?xml\|<xs:schema"; then
            local size; size=$(wc -c < "$dest")
            echo "    ✅  $url  ($size bytes)"
            return 0
        fi
    done
    echo "    ❌  all sources failed"
    return 1
}

echo "=== Coreschemas (from Gazelle NE2008) ==="
for f in datatypes-base.xsd datatypes.xsd infrastructureRoot.xsd voc.xsd; do
    echo -n "  $f ... "
    first=$(head -1 "$CORE/$f" 2>/dev/null)
    if echo "$first" | grep -q "<?xml\|<xs:schema"; then
        echo "  already OK ($(wc -c < "$CORE/$f") bytes) — skipping"
    else
        fetch_one "$CORE/$f" \
            "$GAZELLE/coreschemas/$f" \
            "$EHSUISSE/coreschemas/$f"
    fi
done

echo ""
echo "=== Multicacheschemas (from EudraVigilance / Gazelle) ==="

# COCT_MT040203UV01 — contact/organization schema, part of HL7v3 NE2008
echo -n "  COCT_MT040203UV01.xsd ... "
fetch_one "$MULTI/COCT_MT040203UV01.xsd" \
    "$GAZELLE/multicacheschemas/COCT_MT040203UV01.xsd" \
    "$EUDRA/multicacheschemas/COCT_MT040203UV01.xsd" \
    "$EHSUISSE/multicacheschemas/COCT_MT040203UV01.xsd"

# PORR_IN049006/7/8 — ICH ICSR interaction schemas
for f in PORR_IN049006UV.xsd PORR_IN049007UV.xsd PORR_IN049008UV.xsd; do
    echo -n "  $f ... "
    fetch_one "$MULTI/$f" \
        "$EUDRA/multicacheschemas/$f" \
        "$GAZELLE/multicacheschemas/$f" \
        "$EHSUISSE/multicacheschemas/$f"
done

# PORR_IN049016UV / PORR_MT049016UV — ICSR message type schemas (needed for full validation)
for f in PORR_IN049016UV.xsd PORR_MT049016UV.xsd; do
    echo -n "  $f ... "
    fetch_one "$MULTI/$f" \
        "$EUDRA/multicacheschemas/$f" \
        "$GAZELLE/multicacheschemas/$f" \
        "$EHSUISSE/multicacheschemas/$f"
done

# MCCI ACK schemas
for f in MCCI_IN200101UV01.xsd MCCI_MT200101UV.xsd; do
    echo -n "  $f ... "
    fetch_one "$MULTI/$f" \
        "$GAZELLE/multicacheschemas/$f" \
        "$EUDRA/multicacheschemas/$f" \
        "$EHSUISSE/multicacheschemas/$f"
done

echo ""
echo "=== Final verification ==="
ALL_OK=true
REQUIRED=(
    "$CORE/datatypes-base.xsd"
    "$CORE/datatypes.xsd"
    "$CORE/infrastructureRoot.xsd"
    "$MULTI/COCT_MT040203UV01.xsd"
    "$MULTI/PORR_IN049006UV.xsd"
    "$MULTI/PORR_IN049007UV.xsd"
    "$MULTI/PORR_IN049008UV.xsd"
)
for f in "${REQUIRED[@]}"; do
    first=$(head -1 "$f" 2>/dev/null)
    if echo "$first" | grep -q "<?xml\|<xs:schema"; then
        echo "  ✅  $(basename $f)  ($(wc -c < "$f") bytes)"
    else
        echo "  ❌  $(basename $f)  — still HTML or missing"
        ALL_OK=false
    fi
done

echo ""
if $ALL_OK; then
    echo "✅ All required schemas present."
    echo "Re-run the linter — Section 21 should now show PASS instead of WARN:"
    echo "  python3 faers/test/test_submission/faers_xml_lint.py \\"
    echo "          test_submission/CASE-20260523-MEGA5_v8.xml"
else
    echo "⚠️  Some schemas still missing."
    echo "The PORR_IN049006/7/8 and COCT schemas are ICH E2B(R3)-specific."
    echo "If EudraVigilance also fails, download the ICH schema ZIP manually:"
    echo "  https://ich.org/page/e2br3-individual-case-safety-report-icsr-specification-and-related-files"
    echo "  → look for 'ICSR XML Schema Set' download → extract into:"
    echo "    faers/docs/schema/multicacheschemas/"
    echo ""
    echo "Note: Even without the full chain, Section 26 of the linter catches"
    echo "qualifier-on-TN errors without needing the schema. The coreschemas"
    echo "downloaded so far (datatypes-base, datatypes, infrastructureRoot)"
    echo "are the files that define the TN/EN data type constraints."
fi
