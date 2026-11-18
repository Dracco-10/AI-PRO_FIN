/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo el widget habla con el server por este proxy (evita problemas de CORS)
    proxy: { "/ws": { target: "ws://localhost:3001", ws: true } }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/paginaDemo.tsx", "src/setupTests.ts", "src/utilidadesDePrueba/**", "src/vite-env.d.ts"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    }
  }
});
