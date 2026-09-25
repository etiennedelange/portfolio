#!/bin/sh
set -e

sudo chown -R node:node /home/node/.claude
# The claude-code feature installs as root; let the node user auto-update it
NPM_PREFIX="$(npm config get prefix)"
sudo chown -R node:npm "$NPM_PREFIX/lib/node_modules/@anthropic-ai"
sudo chown -h node:npm "$NPM_PREFIX/bin/claude"

# ─── Project dependencies ───────────────────────────────────────────────────────
echo "--> Installing project dependencies..."
pnpm install
