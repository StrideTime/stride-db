import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@powersync/web',
    '@powersync/common',
    '@powersync/drizzle-driver',
    '@journeyapps/wa-sqlite',
    '@supabase/supabase-js',
    'drizzle-orm',
  ],
  treeshake: true,
  minify: false,
});
