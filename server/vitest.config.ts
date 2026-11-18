import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // los archivos de arranque solo levantan procesos (puerto o stdio), esos se prueban corriendo la app
      exclude: ["src/**/*.test.ts", "src/utilidadesDePrueba/**", "src/iniciarServidor.ts", "src/mcp/*/iniciarPorStdio.ts"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    }
  }
});
