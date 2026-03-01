import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` to ensure process.env is populated correctly during build and dev
  // Added cast to any to resolve "Property 'cwd' does not exist on type 'Process'" TypeScript error
  const env = loadEnv(mode, (process as any).cwd(), '');
  const geminiKey = env.GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY;
  
  return {
    plugins: [react()],
    define: {
      // Direct string replacement for the Gemini API key and the env object
      // This is the primary fix for the "black screen" issue in Vite deployments
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env': JSON.stringify(env),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Cleaner production build
    }
  };
});
