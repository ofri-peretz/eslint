# Interlace — official Docker image.
#
# Roadmap item 6.G — drops the Interlace security plugins into any CI that can
# run a container (GitLab, CircleCI, Jenkins, Drone, GitHub self-hosted, k8s
# Tekton…). Multi-arch (linux/amd64 + linux/arm64) via the publish workflow,
# hosted at ghcr.io/ofri-peretz/interlace.
#
# Usage in any CI — mount the repo at /work and bring your own flat config:
#
#   docker run --rm -v "$PWD:/work" ghcr.io/ofri-peretz/interlace .
#   docker run --rm -v "$PWD:/work" ghcr.io/ofri-peretz/interlace --format json .
#
# The entrypoint is `eslint`, so every upstream flag works as documented.
#
# Pre-installed: eslint + the 10 published security plugins.
# NOT pre-installed: the MCP servers (editor/agent use, not CI), tsx/typescript.
#
# ─────────────────────────────────────────────────────────────────────────────
# HISTORY — two independent defects, both fixed here. Read before editing.
#
# 1. WRONG PACKAGE NAMES. As written at the Nx→Turborepo migration (#94) this
#    image had never built once — 30 of 30 workflow runs failed. It installed
#    `@interlace/cli` plus ten `@interlace/eslint-plugin-*` packages, and NONE
#    of those names exist on npm: the plugins publish UNSCOPED
#    (`eslint-plugin-node-security`), `@interlace/cli` was never written, and
#    `@interlace/eslint-formatter-sarif` is `private: true` in this repo. The
#    first `npm install -g` 404'd every build, and `ENTRYPOINT ["interlace"]`
#    named a binary that does not exist.
#
#    Every name below was verified against the live registry before commit.
#    Do not add one without doing the same.
#
# 2. GLOBAL INSTALL COULD NOT BE RESOLVED. Even with correct names, `npm
#    install -g` would NOT have produced a working image. A flat config in the
#    mounted workspace does `import plugin from 'eslint-plugin-x'`, and that
#    resolves from the CONFIG's directory — Node never searches the global
#    prefix, and ESM ignores NODE_PATH, so the import throws
#    ERR_MODULE_NOT_FOUND. Verified in a container.
#
#    Hence the install lands at the filesystem ROOT (`/package.json` +
#    `/node_modules`). Node resolves bare specifiers by walking parent
#    directories, so a config at /work/eslint.config.mjs finds /node_modules on
#    the way up. Keep it there, or the image silently stops resolving plugins
#    for user configs while still building green.
# ─────────────────────────────────────────────────────────────────────────────

# ─── builder ────────────────────────────────────────────────────────────────
# Pinned to the node:24-alpine digest for reproducible builds (Scorecard
# Pinned-Dependencies). Bump the digest when refreshing the base image.
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS builder

RUN apk add --no-cache git

# Install at the root so the tree is reachable from any mounted workspace.
#
# DO NOT change this to /app or /build. The install root must be an ANCESTOR of
# the mounted workspace, or Node's upward node_modules walk never reaches it and
# every user config fails with ERR_MODULE_NOT_FOUND — see HISTORY #2 above. The
# image still builds green when this is wrong; only a real lint catches it,
# which is what the selftest below is for.
#
# (Comment sits on its own line because Dockerfile has no trailing comments:
# `WORKDIR /  # note` sets the directory to the literal string `/  # note`.
# Verified — that is not a style preference.)
WORKDIR /
RUN printf '{"name":"interlace-image","private":true}' > /package.json
RUN npm install --no-fund --no-audit --omit=dev \
      eslint@latest \
      eslint-plugin-secure-coding@latest \
      eslint-plugin-browser-security@latest \
      eslint-plugin-node-security@latest \
      eslint-plugin-jwt@latest \
      eslint-plugin-express-security@latest \
      eslint-plugin-lambda-security@latest \
      eslint-plugin-mongodb-security@latest \
      eslint-plugin-nestjs-security@latest \
      eslint-plugin-vercel-ai-security@latest \
      eslint-plugin-pg@latest

# ─── runtime ────────────────────────────────────────────────────────────────
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14

LABEL org.opencontainers.image.source="https://github.com/ofri-peretz/eslint"
LABEL org.opencontainers.image.description="Interlace ESLint security suite — drop into any CI"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.documentation="https://github.com/ofri-peretz/eslint/blob/main/README.md"

# Non-root user for the lint process — workspace lint should never need root.
RUN addgroup -S interlace && adduser -S interlace -G interlace

COPY --from=builder /package.json /package.json
COPY --from=builder /node_modules /node_modules
RUN ln -s /node_modules/.bin/eslint /usr/local/bin/eslint

# Sanity checks — fail the BUILD rather than ship an image whose install half
# succeeded. `--version` proves the binary resolves; the lint proves a plugin
# both loads AND reports from a config outside the install root, which is the
# property defect #2 above silently broke.
RUN eslint --version \
 && mkdir -p /tmp/selftest \
 && printf 'import ns from "eslint-plugin-node-security";\nexport default [{files:["**/*.js"],plugins:{"node-security":ns},rules:{"node-security/detect-child-process":"error"}}];\n' > /tmp/selftest/eslint.config.mjs \
 && printf 'const cp=require("child_process");cp.exec(userInput);\n' > /tmp/selftest/t.js \
 && cd /tmp/selftest \
 && ! eslint t.js > /tmp/selftest/out 2>&1 \
 && grep -q 'node-security/detect-child-process' /tmp/selftest/out \
 && echo 'selftest: plugin resolved and reported from a mounted-style config' \
 && rm -rf /tmp/selftest

# Mount the repo here.
WORKDIR /work
USER interlace

ENTRYPOINT ["eslint"]
CMD ["--help"]
