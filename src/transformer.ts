import ts from "typescript";
import { transformerFactory } from "./walk";
import { WhatTheDepOptions } from ".";

const tsConfigPath = ts.findConfigFile(
  "./",
  ts.sys.fileExists,
  "tsconfig.json"
);

const host: ts.ParseConfigFileHost = ts.sys as any;
const parsedConfig = tsConfigPath
  ? ts.getParsedCommandLineOfConfigFile(tsConfigPath, {}, host)
  : null;

if (!parsedConfig) {
  throw new Error("Could not parse tsconfig.json");
}

const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const printer = ts.createPrinter();

export const transformer = async (
  filePath: string,
  config: WhatTheDepOptions
): Promise<string> => {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile)
    return await require("fs").promises.readFile(filePath, "utf8");

  const transformedSourceFile = ts.transform(
    sourceFile,
    [transformerFactory(program, config)],
    parsedConfig.options
  ).transformed[0] as ts.SourceFile;

  return printer.printFile(transformedSourceFile);
};
