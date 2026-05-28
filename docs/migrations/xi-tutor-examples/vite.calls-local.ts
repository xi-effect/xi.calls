/**
 * Фрагмент для apps/web/vite.config.ts в xi.tutor.
 * Импорт: import { callsLocalDevConfig } from './vite.calls-local';
 * merge: defineConfig({ ...callsLocalDevConfig(__dirname), plugins: [...] })
 */
import path from 'node:path';
import type { UserConfig } from 'vite';
import { searchForWorkspaceRoot } from 'vite';

const CALLS_PACKAGES = [
  '@xipkg/calls',
  '@xipkg/calls-chat',
  '@xipkg/calls-compactview',
  '@xipkg/calls-config',
  '@xipkg/calls-hooks',
  '@xipkg/calls-providers',
  '@xipkg/calls-risehand',
  '@xipkg/calls-store',
  '@xipkg/calls-types',
  '@xipkg/calls-ui',
  '@xipkg/calls-utils',
] as const;

/** @param appDir — __dirname из apps/web (где лежит vite.config.ts) */
export const callsLocalDevConfig = (appDir: string): UserConfig => {
  // apps/web → xi.tutor → xi.calls/packages
  const callsPackagesRoot = path.resolve(appDir, '../../xi.calls/packages');

  return {
    resolve: {
      conditions: ['development', 'import'],
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      preserveSymlinks: false,
    },
    optimizeDeps: {
      exclude: [...CALLS_PACKAGES],
    },
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(appDir), callsPackagesRoot],
      },
      watch: {
        ignored: ['**/node_modules/**', '!**/node_modules/@xipkg/**'],
      },
    },
  };
};
