import type { Options } from 'tsup';

/** Shared tsup defaults for @xipkg/calls-* packages (aligned with xi.kit). */
export function createCallsTsupConfig(overrides: Options = {}): Options {
  return {
    entry: ['index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.mjs' }),
    external: [/^@xipkg\//],
    esbuildOptions(options) {
      options.jsx = 'automatic';
      options.packages = 'external';
    },
    ...overrides,
  };
}
