// ============================================================================
// Source: apps/mobile/metro.config.js
// Version: 1.0.0 — 2026-08-21
// Why: Teach Metro about the pnpm workspace.
//
// Metro does not walk up out of the app directory the way webpack does, so
// without watchFolders it never sees packages/core, and without the explicit
// nodeModulesPaths it cannot resolve dependencies hoisted to the repo root.
// `node-linker=hoisted` in the root .npmrc is the other half of this: pnpm's
// default symlinked layout confuses Metro's resolver.
// ============================================================================
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch shared packages so edits in packages/* trigger a reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Do not let a package resolve its own nested copy of React.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
