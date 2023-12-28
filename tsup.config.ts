import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/plugin.ts", "src/container.ts"],
  splitting: true,
  minify: true,
  clean: true,
  dts: true,
  format: ["cjs", "esm"],
  sourcemap: true,
});
