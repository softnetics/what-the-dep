import { whatTheDep } from "./src/lib/plugin";

Bun.build({
  entrypoints: ["./src/examples/with-express/index.ts"],
  outdir: "./dist",
  plugins: [whatTheDep],
});
