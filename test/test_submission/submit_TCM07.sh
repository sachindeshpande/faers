#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XML_FILE="CASE-20260523-MEGA5_v6.xml"
TARGET="${SCRIPT_DIR}/from_app/${XML_FILE}"
echo "=== TC-M07 Submission ==="
echo "File: ${XML_FILE}"
if [[ ! -f "${TARGET}" ]]; then
    echo "Copying XML to from_app/ ..."
    cp "${SCRIPT_DIR}/${XML_FILE}" "${TARGET}"
fi
echo "Running linter pre-check..."
python3 "${SCRIPT_DIR}/faers_xml_lint.py" "${XML_FILE}" | tail -5
echo ""
echo "Submitting..."
cd "${SCRIPT_DIR}"
python3 submit_batch.py --file "${XML_FILE}"
