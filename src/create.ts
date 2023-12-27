import fs from "fs";
import path from "path";

const rootPath = path.resolve(import.meta.dir, "..", "..");
const configPath = path.join(rootPath, "bunfig.toml");

const pluginPreloadConfig = `
preload = ['./what-the-dep.ts']
`;

if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, pluginPreloadConfig);
} else {
  fs.appendFileSync(configPath, pluginPreloadConfig);
}

fs.writeFileSync(
  path.join(rootPath, "what-the-dep.ts"),
  `
    import { whatTheDep } from "@softnetics/what-the-dep";
    import { plugin } from "bun";
    
    plugin(whatTheDep())
  `
);

fs.writeFileSync(
  path.join(rootPath, "build.ts"),
  `
    import { whatTheDep } from "@softnetics/what-the-dep";

    await Bun.build({
        // edit to your entrypoints
        entrypoints: ["src/index.ts"],
        // edit to your outdir
        outdir: "dist/out",
        target: "bun",
        plugins: [whatTheDep()],
    })
  `
);

console.info(
  'what-the-dep is initialized! 🎉 \n Don\'t for get to add script \n \n "build":"bun run build.ts" \n \n In your package.json'
);
