// Metro config for an Expo app living inside an npm-workspaces monorepo.
// It teaches Metro to (1) watch the repo root so it can bundle files from
// ../packages/shared, and (2) resolve modules from both the app's and the
// root's node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so changes to packages/shared hot-reload.
config.watchFolders = [monorepoRoot];

// 2. Resolve node_modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Explicit alias as a safety net (works even if symlinks are flaky on Windows/OneDrive).
config.resolver.extraNodeModules = {
  '@nursecare/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

module.exports = config;
