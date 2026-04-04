#!/usr/bin/env bash
# scripts/audit.sh
#
# Unified code quality audit.
# Runs TypeScript type-check, ESLint, pushes a fresh SonarCloud analysis,
# then fetches the results — all into a single audit-report.json.
#
# No Docker required.  The sonar-scanner uploads source directly to
# SonarCloud for analysis.  Results are fetched via REST API after the
# scanner reports the quality gate status.
#
# Usage:
#   bash scripts/audit.sh           # full audit (scan + fetch)
#   bash scripts/audit.sh --fix     # run ESLint with --fix before scanning
#   bash scripts/audit.sh --no-scan # skip the scan, only fetch cached issues
#
# Output:
#   audit-report.json  — machine-readable combined report
#
# Exit codes: 0 = clean, 1 = issues found
set -uo pipefail
cd "$(dirname "$0")/.."

# ── Load .env if present ──────────────────────────────────────────────────────
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# ── Options ───────────────────────────────────────────────────────────────────
FIX_FLAG=""
SKIP_SCAN=false
for arg in "$@"; do
  case "$arg" in
    --fix)     FIX_FLAG="--fix" ;;
    --no-scan) SKIP_SCAN=true ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YEL='\033[0;33m'
GRN='\033[0;32m'
CYN='\033[0;36m'
RST='\033[0m'

REPORT_FILE="audit-report.json"
TOTAL_ISSUES=0

header() { printf "\n${CYN}═══ %s ═══${RST}\n" "$1"; }

# ── Temp files for collecting JSON fragments ──────────────────────────────────
TSC_JSON=$(mktemp)
ESLINT_JSON=$(mktemp)
SONAR_JSON=$(mktemp)
METRICS_JSON=$(mktemp)
trap 'rm -f "$TSC_JSON" "$ESLINT_JSON" "$SONAR_JSON" "$METRICS_JSON"' EXIT

# =============================================================================
# 1. TypeScript
# =============================================================================
header "TypeScript (tsc --noEmit)"

# Build packages first so cross-package imports resolve
pnpm turbo run build --filter='./packages/*' >/dev/null 2>&1 || true

TSC_OUT=$(pnpm tsc --noEmit 2>&1 || true)
TSC_ERRORS=0

if echo "$TSC_OUT" | grep -q "error TS"; then
  TSC_ITEMS=$(echo "$TSC_OUT" | grep "error TS" | head -200 | while IFS= read -r line; do
    file=$(echo "$line" | sed 's/(.*//')
    code=$(echo "$line" | grep -oP 'error TS\d+' || echo "TS????")
    msg=$(echo "$line" | sed 's/.*: error TS[0-9]*: //')
    printf '{"file":"%s","code":"%s","message":"%s"}\n' \
      "$(echo "$file" | sed 's/"/\\"/g')" \
      "$code" \
      "$(echo "$msg" | sed 's/"/\\"/g')"
  done | jq -s '.')
  TSC_ERRORS=$(echo "$TSC_ITEMS" | jq 'length')
  printf "${RED}  ✗ %d type errors${RST}\n" "$TSC_ERRORS"
  echo "$TSC_OUT" | grep "error TS" | head -10
else
  TSC_ITEMS="[]"
  printf "${GRN}  ✓ 0 type errors${RST}\n"
fi

printf '{"errorCount":%d,"errors":%s}\n' "$TSC_ERRORS" "$TSC_ITEMS" > "$TSC_JSON"
TOTAL_ISSUES=$((TOTAL_ISSUES + TSC_ERRORS))

# =============================================================================
# 2. ESLint
# =============================================================================
header "ESLint"

ESLINT_DIRS="src/ packages/ playground/ services/dbms/"

# Run ESLint with JSON formatter for machine-readable output
ESLINT_RAW=$(pnpm eslint $ESLINT_DIRS --format json $FIX_FLAG 2>/dev/null || true)

ESLINT_ERR_COUNT=0
ESLINT_WARN_COUNT=0
ESLINT_MESSAGES="[]"

if echo "$ESLINT_RAW" | jq empty 2>/dev/null; then
  ESLINT_ERR_COUNT=$(echo "$ESLINT_RAW" | jq '[.[].errorCount] | add // 0')
  ESLINT_WARN_COUNT=$(echo "$ESLINT_RAW" | jq '[.[].warningCount] | add // 0')

  ESLINT_MESSAGES=$(echo "$ESLINT_RAW" | jq '
    [ .[] | select(.messages | length > 0) |
      .filePath as $f |
      .messages[] |
      {
        file: ($f | sub(".*/notion-database-sys/"; "")),
        line: .line,
        column: .column,
        severity: (if .severity == 2 then "error" else "warning" end),
        rule: (.ruleId // "unknown"),
        message: .message
      }
    ]')

  if [ "$ESLINT_ERR_COUNT" -gt 0 ] || [ "$ESLINT_WARN_COUNT" -gt 0 ]; then
    printf "${RED}  ✗ %d errors, %d warnings${RST}\n" "$ESLINT_ERR_COUNT" "$ESLINT_WARN_COUNT"
    echo "$ESLINT_MESSAGES" | jq -r '.[:10][] | "  \(.severity): \(.file):\(.line) — \(.rule): \(.message)"'
  else
    printf "${GRN}  ✓ 0 errors, 0 warnings${RST}\n"
  fi
else
  printf "${GRN}  ✓ 0 errors, 0 warnings${RST}\n"
fi

printf '{"errorCount":%d,"warningCount":%d,"messages":%s}\n' \
  "$ESLINT_ERR_COUNT" "$ESLINT_WARN_COUNT" "$ESLINT_MESSAGES" > "$ESLINT_JSON"
TOTAL_ISSUES=$((TOTAL_ISSUES + ESLINT_ERR_COUNT))

# =============================================================================
# 3. SonarCloud — scan + fetch (no Docker needed)
# =============================================================================
header "SonarCloud"

SONAR_TOKEN="${SONAR_TOKEN:-}"
SONAR_HOST="${SONAR_HOST_URL:-https://sonarcloud.io}"
SONAR_PROJECT="${SONAR_PROJECT_KEY:-Univers42_notion-database-sys}"
SONAR_TOTAL=0
SCAN_OK=false

if [ -z "$SONAR_TOKEN" ]; then
  printf "${YEL}  ⚠ SONAR_TOKEN not set — skipping SonarCloud${RST}\n"
  printf "${YEL}    Set it in .env or export SONAR_TOKEN=...${RST}\n"
  printf '{"skipped":true,"reason":"SONAR_TOKEN not set","scanned":false,"total":0,"issues":[],"bySeverity":{},"byType":{}}\n' > "$SONAR_JSON"
else
  # ── 3a. Push a fresh analysis to SonarCloud ──────────────────────────────
  if [ "$SKIP_SCAN" = true ]; then
    printf "${YEL}  ⏭ Skipping scan (--no-scan), fetching cached results${RST}\n"
  else
    printf "  Pushing analysis to %s…\n" "$SONAR_HOST"

    # Use 'sonarqube-scanner' (official SonarSource npm package).
    # The old 'sonar-scanner' 3.x is abandoned and fails on SonarCloud.
    SCANNER="npx -y sonarqube-scanner"

    # Run the scanner against SonarCloud (not local Docker).
    # The sonarqube-scanner npm package auto-reads SONAR_TOKEN env var and sets
    # sonar.token, so we unset the env var and pass it explicitly to avoid
    # the deprecated sonar.login conflict.
    if SONAR_TOKEN= $SCANNER \
        -Dsonar.host.url="$SONAR_HOST" \
        -Dsonar.token="$SONAR_TOKEN" \
        -Dsonar.qualitygate.wait=false \
        2>&1 | sed 's/^/  /'; then
      SCAN_OK=true
      printf "${GRN}  ✓ Analysis pushed successfully${RST}\n"
    else
      printf "${YEL}  ⚠ Scanner exited with errors — continuing to fetch results${RST}\n"
      SCAN_OK=true  # still fetch — partial results are useful
    fi

    # SonarCloud needs time to process the uploaded report
    printf "  Waiting 15s for SonarCloud to finalize…\n"
    sleep 15
  fi

  # ── 3b. Fetch fresh issues from the API ──────────────────────────────────
  printf "  Fetching issues from %s…\n" "$SONAR_HOST"

  if [ -f scripts/fetch-sonar-issues.py ]; then
    OUTPUT_DIR="." SONAR_TOKEN="$SONAR_TOKEN" SONAR_HOST_URL="$SONAR_HOST" \
      python3 scripts/fetch-sonar-issues.py 2>&1 | sed 's/^/  /'

    if [ -f sonarcloud-issues.json ]; then
      SONAR_TOTAL=$(jq '.total // 0' sonarcloud-issues.json)

      SONAR_BY_SEV=$(jq '
        [.issues[].severity] | group_by(.) |
        map({key: .[0], value: length}) |
        from_entries' sonarcloud-issues.json)

      SONAR_BY_TYPE=$(jq '
        [.issues[].type] | group_by(.) |
        map({key: .[0], value: length}) |
        from_entries' sonarcloud-issues.json)

      SONAR_COMPACT=$(jq '
        [.issues[] | {
          file: (.component | sub(".*:"; "")),
          line: .line,
          severity: .severity,
          type: .type,
          rule: .rule,
          message: .message,
          effort: .effort
        }]' sonarcloud-issues.json)

      jq -n \
        --argjson total "$SONAR_TOTAL" \
        --argjson bySeverity "$SONAR_BY_SEV" \
        --argjson byType "$SONAR_BY_TYPE" \
        --argjson issues "$SONAR_COMPACT" \
        --argjson scanned "$([ "$SKIP_SCAN" = true ] && echo false || echo true)" \
        '{skipped:false,scanned:$scanned,total:$total,bySeverity:$bySeverity,byType:$byType,issues:$issues}' \
        > "$SONAR_JSON"

      BLOCKERS=$(echo "$SONAR_BY_SEV" | jq '.BLOCKER // 0')
      CRITICALS=$(echo "$SONAR_BY_SEV" | jq '.CRITICAL // 0')
      MAJORS=$(echo "$SONAR_BY_SEV" | jq '.MAJOR // 0')
      MINORS=$(echo "$SONAR_BY_SEV" | jq '.MINOR // 0')

      if [ "$SONAR_TOTAL" -gt 0 ]; then
        printf "${YEL}  ⚠ %d issues: %d blockers, %d critical, %d major, %d minor${RST}\n" \
          "$SONAR_TOTAL" "$BLOCKERS" "$CRITICALS" "$MAJORS" "$MINORS"
      else
        printf "${GRN}  ✓ 0 issues${RST}\n"
      fi
    else
      printf "${RED}  ✗ Failed to fetch issues${RST}\n"
      printf '{"skipped":true,"reason":"fetch failed","scanned":false,"total":0,"issues":[],"bySeverity":{},"byType":{}}\n' > "$SONAR_JSON"
    fi
  else
    printf "${RED}  ✗ scripts/fetch-sonar-issues.py not found${RST}\n"
    printf '{"skipped":true,"reason":"script missing","scanned":false,"total":0,"issues":[],"bySeverity":{},"byType":{}}\n' > "$SONAR_JSON"
  fi
fi

TOTAL_ISSUES=$((TOTAL_ISSUES + SONAR_TOTAL))

# =============================================================================
# 4. Code Metrics
# =============================================================================
header "Code Metrics"

MAX_LINES=200
FILE_COUNT=$(find src packages playground services \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | wc -l)
LARGEST=$(find src packages playground services \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + 2>/dev/null \
  | sort -rn | head -2 | tail -1 | awk '{print $1, $2}')
OVER_LIMIT_LIST=$(find src packages playground services \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + 2>/dev/null \
  | awk -v max="$MAX_LINES" '$1 > max && !/total$/ {print $1, $2}' | sort -rn)
if [ -n "$OVER_LIMIT_LIST" ]; then
  OVER_200=$(echo "$OVER_LIMIT_LIST" | wc -l)
else
  OVER_200=0
fi
SUPPRESSIONS=$(grep -rl "eslint-disable\|@ts-ignore\|@ts-nocheck\|@ts-expect-error" \
  src/ packages/ playground/ services/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l || echo 0)

printf "  Files:               %d\n" "$FILE_COUNT"
printf "  Largest file:        %s\n" "$LARGEST"
printf "  Max lines per file:  %d\n" "$MAX_LINES"
printf "  Files > %d lines:   %d\n" "$MAX_LINES" "$OVER_200"
if [ "$OVER_200" -gt 0 ]; then
  echo "$OVER_LIMIT_LIST" | while IFS= read -r line; do
    printf "${RED}    ✗ %s${RST}\n" "$line"
  done
fi
printf "  Suppression comments:%d files\n" "$SUPPRESSIONS"

if [ -n "$OVER_LIMIT_LIST" ]; then
  OVER_LIMIT_JSON=$(echo "$OVER_LIMIT_LIST" | awk '{printf "{\"lines\":%s,\"file\":\"%s\"},", $1, $2}' | sed 's/,$//')
else
  OVER_LIMIT_JSON=""
fi
printf '{"fileCount":%d,"maxLinesPerFile":%d,"filesOverLimit":%d,"overLimitFiles":[%s],"suppressionFiles":%d}\n' \
  "$FILE_COUNT" "$MAX_LINES" "$OVER_200" "$OVER_LIMIT_JSON" "$SUPPRESSIONS" > "$METRICS_JSON"

TOTAL_ISSUES=$((TOTAL_ISSUES + OVER_200))

# =============================================================================
# 5. Assemble final JSON report
# =============================================================================
header "Writing Report"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Use file-based inputs to avoid "Argument list too long" when SonarCloud
# returns hundreds of issues (which can exceed shell argument limits).
jq -n \
  --arg ts "$TIMESTAMP" \
  --argjson totalIssues "$TOTAL_ISSUES" \
  --slurpfile tsc "$TSC_JSON" \
  --slurpfile eslint "$ESLINT_JSON" \
  --slurpfile sonar "$SONAR_JSON" \
  --slurpfile metrics "$METRICS_JSON" \
  '{
    timestamp: $ts,
    summary: {
      totalIssues: $totalIssues,
      tscErrors: $tsc[0].errorCount,
      eslintErrors: $eslint[0].errorCount,
      eslintWarnings: $eslint[0].warningCount,
      sonarIssues: $sonar[0].total,
      filesOverLimit: $metrics[0].filesOverLimit
    },
    typescript: $tsc[0],
    eslint: $eslint[0],
    sonarcloud: $sonar[0],
    metrics: $metrics[0]
  }' > "$REPORT_FILE"

printf "  ${GRN}→ %s${RST}\n" "$REPORT_FILE"

# =============================================================================
# Summary
# =============================================================================
header "Summary"
printf "  TypeScript errors:   %d\n" "$TSC_ERRORS"
printf "  ESLint errors:       %d\n" "$ESLINT_ERR_COUNT"
printf "  ESLint warnings:     %d\n" "$ESLINT_WARN_COUNT"
printf "  SonarCloud issues:   %d\n" "$SONAR_TOTAL"
printf "  Files > %d lines:   %d\n" "$MAX_LINES" "$OVER_200"
printf "  ────────────────────────\n"
printf "  Total issues:        %d\n" "$TOTAL_ISSUES"

if [ "$TSC_ERRORS" -eq 0 ] && [ "$ESLINT_ERR_COUNT" -eq 0 ] && [ "$SONAR_TOTAL" -eq 0 ] && [ "$OVER_200" -eq 0 ]; then
  printf "\n${GRN}  ✓ AUDIT PASSED — no blocking issues${RST}\n\n"
  exit 0
else
  printf "\n${YEL}  ⚠ AUDIT COMPLETE — %d issues logged to %s${RST}\n\n" "$TOTAL_ISSUES" "$REPORT_FILE"
  exit 1
fi
