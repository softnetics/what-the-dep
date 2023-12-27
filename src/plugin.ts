import { BunPlugin, OnLoadResult, OnResolveResult, Transpiler } from "bun";
import { transformer } from "./transformer";

// no option for now
type WhatTheDepOptions = {};

function plugin(opts?: WhatTheDepOptions): BunPlugin {
  return {
    name: "what-the-dep",
    setup(build) {
      build.onLoad({ filter: /\.ts$/ }, async (args): Promise<OnLoadResult> => {
        const transpiler = new Transpiler({ loader: "ts" });
        const newSource = await transformer(args.path);
        return {
          contents: transpiler.transformSync(newSource),
        };
      });
    },
  };
}

export const whatTheDep = plugin;
