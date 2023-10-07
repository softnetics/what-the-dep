import { whatTheDep } from "./src/lib/plugin";

Bun.build({
  entrypoints: ["./src/examples/index.ts"],
  outdir: "./dist",
  plugins: [whatTheDep],
});
