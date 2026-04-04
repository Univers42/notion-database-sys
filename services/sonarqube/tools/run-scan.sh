#!/usr/bin/env bash
# run-scan.sh
#
# Runs sonar-scanner against the project root.
# Reads sonar-project.properties for source paths, exclusions, etc.
#
# Usage:
#   bash services/sonarqube/tools/run-scan.sh          # local scan (localhost:9000)
#   bash services/sonarqube/tools/run-scan.sh --ci      # CI mode (skips quality gate wait)
#
# Environment variables:
#   SONAR_HOST_URL  Scanner target URL.  Defaults to http://localhost:9000.
#   SONAR_TOKEN     Authentication token.  Optional for local Community Edition
#                   (no auth by default), required for SonarCloud.
#
# The script installs sonar-scanner via npx if it is not already on PATH.
set -euo pipefail

SONAR_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
CI_MODE=false

for arg in "$@"; do
  case "$arg" in
    --ci) CI_MODE=true ;;
  esac
done

# Install sonar-scanner if not already available
if ! command -v sonar-scanner &>/dev/null; then
  echo "sonar-scanner not found on PATH, using npx"
  SCANNER="npx -y sonar-scanner"
else
  SCANNER="sonar-scanner"
fi

# Build command-line arguments
ARGS=(
  "-Dsonar.host.url=${SONAR_URL}"
)

if [ -n "$SONAR_TOKEN" ]; then
  ARGS+=("-Dsonar.token=${SONAR_TOKEN}")
fi

if [ "$CI_MODE" = true ]; then
  # In CI the quality gate is checked by a separate GitHub Actions step.
  ARGS+=("-Dsonar.qualitygate.wait=false")
fi

echo "Running SonarQube analysis"
echo "  URL   : ${SONAR_URL}"
echo "  Token : ${SONAR_TOKEN:+(set)}${SONAR_TOKEN:-(not set)}"
echo ""

$SCANNER "${ARGS[@]}"
