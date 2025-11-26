import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Suppress console warnings for act() in tests
    onConsoleLog: (log, type) => {
      const message = String(log);
      if (
        (type === 'error' || type === 'warn') &&
        message.includes('Warning: An update to') &&
        message.includes('was not wrapped in act')
      ) {
        return false; // Suppress this specific warning
      }
      return true;
    },
  },
})
