import { BunPlugin, OnLoadResult, Transpiler } from "bun";

export const whatTheDep: BunPlugin = {
  name: "whatthedep",
  async setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args): Promise<OnLoadResult> => {
      const transpiler = new Transpiler({ loader: "ts" });
      if (args.path.includes("lib") && !args.path.includes("lib/di.ts")) {
        const originalCode = await require("fs").promises.readFile(
          args.path,
          "utf8",
        );
        return {
          contents: transpiler.transformSync(originalCode),
        };
      }
      const { resolveStage, generateStage } = await import("./transform.ts");
      await resolveStage(args.path);
      const newCode = await generateStage(args.path);
      // console.log(newCode);
      return {
        contents: transpiler.transformSync(newCode),
      };
    });
  },
};
