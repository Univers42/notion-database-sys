# SonarQube Community Edition — configured for TypeScript / React analysis
# Uses the official image with a volume-mounted conf if needed.
FROM sonarqube:25.4-community

# The image already exposes 9000 and runs as the `sonarqube` user.
# Configuration is injected via environment variables or mounted
# sonar.properties — no extra packages needed for TS/TSX analysis
# because the bundled SonarJS plugin handles JavaScript and TypeScript.

LABEL maintainer="dlesieur" \
      description="SonarQube CE for notion-database-sys static analysis"
