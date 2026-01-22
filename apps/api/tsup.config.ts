import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  skipNodeModulesBundle: true,
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
      '@modules': './src/modules',
      '@common': './src/common',
      '@integrations': './src/integrations',
    };
  },
});
