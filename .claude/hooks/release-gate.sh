#!/usr/bin/env bash
# Stage 5 (Deploy) — hooks as approval gates. See AI_NATIVE_SDLC.md.
#
# Hooks can allow, ask, or block. Every hook in this repo before this one could only
# allow or block, which covers "never do that" but not the case release gating
# actually needs: pause the action until a specific person approves.
#
# This is the ask. A production deploy or an npm publish stops and waits for the
# human at the keyboard, with the command quoted back so they are approving a
# specific thing rather than a category.
#
# Set RELEASE_APPROVAL=1 in the environment to pre-approve a session — for an
# intentional release run where answering a prompt per command is noise.
#
# Reads the PreToolUse payload on stdin; emits a permission decision on stdout.
# Exit 0 with no output means "no opinion", which is the default for everything
# this gate does not recognise.

set -euo pipefail

payload=$(cat)

# jq is present on the runner and on macOS via the toolchain; without it, decline to
# have an opinion rather than blocking every Bash call in the session.
command -v jq >/dev/null 2>&1 || exit 0

cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# Already approved for this session.
[ "${RELEASE_APPROVAL:-}" = "1" ] && exit 0

reason=""

# A production deployment fired by hand. `auto-deploy.yml` on merge to main is the
# normal path and never comes through Bash, so this only catches the manual override.
if printf '%s' "$cmd" | grep -qE 'gh +workflow +run' \
  && printf '%s' "$cmd" | grep -qE 'deploy' \
  && printf '%s' "$cmd" | grep -qE 'production'; then
  reason="This dispatches a PRODUCTION deploy."
fi

# Vercel production deploy, bypassing the workflow entirely.
if printf '%s' "$cmd" | grep -qE '\bvercel\b.*(--prod|--production)\b'; then
  reason="This deploys to Vercel PRODUCTION directly, bypassing the deploy workflow."
fi

# Publishing is irreversible: a version number can never be reused on npm.
# `--dry-run` publishes nothing and is part of the ordinary release check, so gating
# it would train people to approve the prompt without reading it.
if printf '%s' "$cmd" | grep -qE '\bnpm +publish\b' \
  && ! printf '%s' "$cmd" | grep -qE -- '--dry-run'; then
  reason="This PUBLISHES to npm. A published version number can never be reused."
fi

[ -n "$reason" ] || exit 0

jq -nc \
  --arg reason "$reason" \
  --arg cmd "$cmd" \
  '{
     hookSpecificOutput: {
       hookEventName: "PreToolUse",
       permissionDecision: "ask",
       permissionDecisionReason: ($reason + "\n\n  " + $cmd + "\n\nApprove only if you intend to release right now. Set RELEASE_APPROVAL=1 to pre-approve a whole session.")
     }
   }'
