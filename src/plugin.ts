import { BunPlugin, OnLoadResult, OnResolveResult, Transpiler } from "bun";
import { transformer } from "./transformer";
import ts from "typescript";

export type WhatTheDepOptions = {
  debug?: boolean;
  extend?: (
    program: ts.Program,
    node: ts.Node,
    context: ts.TransformationContext,
    transformList: Map<ts.Node, ts.Node>
  ) => void;
};

function plugin(opts?: WhatTheDepOptions): BunPlugin {
  return {
    name: "what-the-dep",
    setup(build) {
      build.onLoad({ filter: /\.ts$/ }, async (args): Promise<OnLoadResult> => {
        const transpiler = new Transpiler({ loader: "ts" });
        const newSource = await transformer(args.path, opts ?? {});
        return {
          contents: transpiler.transformSync(newSource),
        };
      });
    },
  };
}

export const whatTheDep = plugin;
