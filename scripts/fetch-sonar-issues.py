#!/usr/bin/env python3
"""
Fetch all open issues from SonarCloud and generate reports.

Outputs:
  sonarcloud-issues.json   — raw API data (every field, machine-readable)
  sonarcloud-report.txt    — human-readable summary sorted by severity

Usage:
  SONAR_TOKEN=xxx python3 .github/scripts/fetch-sonar-issues.py

Environment variables:
  SONAR_TOKEN       (required) — SonarCloud authentication token
  SONAR_HOST_URL    (optional) — defaults to https://sonarcloud.io
  SONAR_PROJECT_KEY (optional) — defaults to Univers42_notion-database-sys
  OUTPUT_DIR        (optional) — directory for output files, defaults to cwd
"""

import base64
import json
import os
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

TOKEN = os.environ.get("SONAR_TOKEN", "")
if not TOKEN:
    print("ERROR: SONAR_TOKEN environment variable is required", file=sys.stderr)
    sys.exit(1)

HOST = os.environ.get("SONAR_HOST_URL", "https://sonarcloud.io").rstrip("/")
PROJECT = os.environ.get("SONAR_PROJECT_KEY", "Univers42_notion-database-sys")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", ".")
PAGE_SIZE = 500  # SonarCloud max is 500

AUTH_HEADER = "Basic " + base64.b64encode(f"{TOKEN}:".encode()).decode()

# ---------------------------------------------------------------------------
# Fetch all issues (paginated)
# ---------------------------------------------------------------------------

def fetch_issues():
    """Return a list of all open/confirmed/reopened issues."""
    all_issues = []
    page = 1
    while True:
        url = (
            f"{HOST}/api/issues/search"
            f"?componentKeys={PROJECT}"
            f"&statuses=OPEN,CONFIRMED,REOPENED"
            f"&ps={PAGE_SIZE}&p={page}"
        )
        req = urllib.request.Request(url, headers={"Authorization": AUTH_HEADER})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as exc:
            print(f"ERROR: API request failed on page {page}: {exc}", file=sys.stderr)
            sys.exit(1)

        issues = data.get("issues", [])
        all_issues.extend(issues)
        total = data["paging"]["total"]
        print(f"  Page {page}: {len(issues)} issues ({len(all_issues)}/{total})", file=sys.stderr)

        if len(all_issues) >= total:
            break
        page += 1

    return all_issues

# ---------------------------------------------------------------------------
# Generate human-readable report
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"BLOCKER": 0, "CRITICAL": 1, "MAJOR": 2, "MINOR": 3, "INFO": 4}
TYPE_LABELS = ["BUG", "VULNERABILITY", "SECURITY_HOTSPOT", "CODE_SMELL"]

def generate_report(issues):
    """Return the full text report as a string."""
    issues.sort(key=lambda i: (
        SEVERITY_ORDER.get(i.get("severity", "INFO"), 5),
        i.get("component", ""),
        i.get("line", 0),
    ))

    by_severity = Counter(i.get("severity", "UNKNOWN") for i in issues)
    by_type = Counter(i.get("type", "UNKNOWN") for i in issues)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = []

    # Header
    lines.append("# SonarCloud Issue Report")
    lines.append(f"# Project: {PROJECT}")
    lines.append(f"# Host: {HOST}")
    lines.append(f"# Total open issues: {len(issues)}")
    lines.append(f"# Generated: {now}")
    lines.append("")

    # Severity summary
    lines.append("## Summary by Severity")
    for sev in ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]:
        count = by_severity.get(sev, 0)
        if count:
            lines.append(f"  {sev:10s}: {count}")
    lines.append("")

    # Type summary
    lines.append("## Summary by Type")
    for t in TYPE_LABELS:
        count = by_type.get(t, 0)
        if count:
            lines.append(f"  {t:20s}: {count}")
    lines.append("")

    # Separator
    lines.append("=" * 100)
    lines.append("")

    # Individual issues
    for idx, issue in enumerate(issues, 1):
        comp = issue.get("component", "").replace(f"{PROJECT}:", "")
        line_num = issue.get("line", "-")
        sev = issue.get("severity", "?")
        typ = issue.get("type", "?")
        msg = issue.get("message", "")
        rule = issue.get("rule", "")
        effort = issue.get("effort", "-")
        status = issue.get("status", "?")
        tags = ", ".join(issue.get("tags", []))
        created = issue.get("creationDate", "-")

        lines.append(f"[{idx:3d}] {sev} | {typ}")
        lines.append(f"      File:    {comp}:{line_num}")
        lines.append(f"      Rule:    {rule}")
        lines.append(f"      Message: {msg}")
        lines.append(f"      Effort:  {effort}  Status: {status}")
        if tags:
            lines.append(f"      Tags:    {tags}")
        lines.append(f"      Created: {created}")
        lines.append("")

    # Footer
    lines.append("=" * 100)
    lines.append(f"# Dashboard: {HOST}/dashboard?id={PROJECT}")
    lines.append(f"# Issues: {HOST}/project/issues?id={PROJECT}&resolved=false")
    lines.append("")

    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Fetching issues from {HOST} for {PROJECT}...", file=sys.stderr)
    issues = fetch_issues()
    print(f"Total: {len(issues)} open issues\n", file=sys.stderr)

    # Write raw JSON
    json_path = os.path.join(OUTPUT_DIR, "sonarcloud-issues.json")
    with open(json_path, "w") as f:
        json.dump({"total": len(issues), "project": PROJECT, "issues": issues}, f, indent=2)
    print(f"Saved: {json_path}", file=sys.stderr)

    # Write readable report
    report_path = os.path.join(OUTPUT_DIR, "sonarcloud-report.txt")
    report = generate_report(issues)
    with open(report_path, "w") as f:
        f.write(report)
    print(f"Saved: {report_path}", file=sys.stderr)

    # Print summary to stdout (visible in CI logs)
    for line in report.split("\n"):
        if line.startswith("#") or line.startswith("##") or line.startswith("  ") or line.startswith("="):
            print(line)
        if line == "=" * 100:
            break

if __name__ == "__main__":
    main()
