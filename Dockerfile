# Interlace — official Docker image.
#
# Roadmap item 6.G — drops Interlace into any CI that can run a container
# (GitLab, CircleCI, Jenkins, Drone, GitHub self-hosted, k8s Tekton…).
# Single-arch image hosted at ghcr.io/ofri-peretz/interlace, multi-arch
# (linux/amd64 + linux/arm64) via the publish workflow.
#
# Usage in any CI:
#
#   docker run --rm -v "$PWD:/work" ghcr.io/ofri-peretz/interlace audit /work/src
#   docker run --rm -v "$PWD:/work" ghcr.io/ofri-peretz/interlace audit --sarif /work/src > findings.sarif
#
# What's pre-installed:
#   - @interlace/cli (the `interlace` binary on PATH)
#   - All 11 security plugins
#   - SARIF formatter
#   - eslint
#
# What's NOT pre-installed:
#   - The 11 MCP servers (intended for editor / agent use, not CI)
#   - tsx / typescript devDeps (the CLI shells `npx tsx` when needed)
#
# Image size target: < 250 MB compressed. Achieved via alpine + multi-stage.

# ─── builder ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /build
RUN apk add --no-cache git

# Install Interlace + plugins into a clean prefix that we'll copy out.
ENV NPM_CONFIG_PREFIX=/build/prefix
RUN mkdir -p $NPM_CONFIG_PREFIX
RUN npm install -g --no-fund --no-audit \
      @interlace/cli@latest \
      @interlace/eslint-formatter-sarif@latest \
      @interlace/eslint-plugin-secure-coding@latest \
      @interlace/eslint-plugin-browser-security@latest \
      @interlace/eslint-plugin-node-security@latest \
      @interlace/eslint-plugin-crypto@latest \
      @interlace/eslint-plugin-jwt@latest \
      @interlace/eslint-plugin-express-security@latest \
      @interlace/eslint-plugin-lambda-security@latest \
      @interlace/eslint-plugin-mongodb-security@latest \
      @interlace/eslint-plugin-nestjs-security@latest \
      @interlace/eslint-plugin-vercel-ai-security@latest \
      @interlace/eslint-plugin-pg@latest \
      eslint@latest

# ─── runtime ────────────────────────────────────────────────────────────────
FROM node:24-alpine

LABEL org.opencontainers.image.source="https://github.com/ofri-peretz/eslint"
LABEL org.opencontainers.image.description="Interlace ESLint security suite — drop into any CI"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.documentation="https://github.com/ofri-peretz/eslint/blob/main/README.md"

# Non-root user for the lint process — workspace lint should never need root.
RUN addgroup -S interlace && adduser -S interlace -G interlace

# Copy the globally-installed prefix from the builder
COPY --from=builder /build/prefix /usr/local

# Working directory is /work; mount your repo here
WORKDIR /work
USER interlace

# Sanity check — fail the build if interlace --version doesn't run
RUN interlace --version

ENTRYPOINT ["interlace"]
CMD ["--help"]
