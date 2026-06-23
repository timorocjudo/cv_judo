import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/slugify.ts',
        'lib/profileValidation.ts',
        'lib/palmaresStats.ts',
        'app/dashboard/[profileId]/profil/actions.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})
