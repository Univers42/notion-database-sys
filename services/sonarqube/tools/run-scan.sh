#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# run-scan.sh — run sonar-scanner against the project
# Usage:
#   bash services/sonarqube/tools/run-scan.sh            # local
#   bash services/sonarqube/tools/run-scan.sh --ci        # CI mode (uses env vars)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SONAR_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
CI_MODE=false

for arg in "$@"; do
  case "$arg" in
    --ci) CI_MODE=true ;;
  esac
done

# ── Ensure sonar-scanner is available ─────────────────────────────────────────
if ! command -v sonar-scanner &>/dev/null; then
  echo "Installing sonar-scanner via npx…"
  SCANNER="npx -y sonar-scanner"
else
  SCANNER="sonar-scanner"
fi

# ── Build scanner arguments ──────────────────────────────────────────────────
ARGS=(
  "-Dsonar.host.url=${SONAR_URL}"
)

if [ -n "$SONAR_TOKEN" ]; then
  ARGS+=("-Dsonar.token=${SONAR_TOKEN}")
fi

if [ "$CI_MODE" = true ]; then
  # In CI we don't wait for quality gate (separate step can do that)
  ARGS+=("-Dsonar.qualitygate.wait=false")
fi

echo "🔍 Running SonarQube analysis…"
echo "   URL   : ${SONAR_URL}"
echo "   Token : ${SONAR_TOKEN:+(set)}${SONAR_TOKEN:-(not set — using defaults)}"
echo ""

$SCANNER "${ARGS[@]}"
