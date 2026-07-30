import { defineConfig } from 'tsup';
import { createCallsTsupConfig } from '../../tsup.calls.base';

export default defineConfig(
  createCallsTsupConfig({
    entry: {
      index: 'index.ts',
      'locales/index': 'src/locales/index.ts',
    },
  }),
);
