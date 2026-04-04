# SonarQube Community Edition 25.4
#
# The official image already includes the SonarJS plugin which handles
# TypeScript and TSX analysis out of the box.  No additional plugins are
# needed for this project.
#
# Configuration is injected via the bind-mounted sonar.properties file
# (see services/sonarqube/conf/sonar.properties).
#
# Runs on port 9000.  The first startup takes 30-90s while Elasticsearch
# initializes; use `make sonar-up` which waits automatically.
FROM sonarqube:25.4-community

LABEL maintainer="dlesieur" \
      description="SonarQube CE for notion-database-sys"
