import ts from "typescript";
import { resolver } from "./transformers/resolver";
import { generate } from "./transformers/generator";
import { DependenciesGraph } from "./graph";

const dependenciesGraph = new DependenciesGraph();

const tsConfigPath = ts.findConfigFile(
  "./",
  ts.sys.fileExists,
  "tsconfig.json",
);
const host: ts.ParseConfigFileHost = ts.sys as any;
const parsedConfig = tsConfigPath
  ? ts.getParsedCommandLineOfConfigFile(tsConfigPath, {}, host)
  : null;
if (!parsedConfig) {
  throw new Error("Could not parse tsconfig.json");
}
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

export const resolveStage = async (filePath: string): Promise<string> => {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile)
    return await require("fs").promises.readFile(filePath, "utf8");
  const transformedSourceFile = ts.transform(
    sourceFile,
    [resolver(program, dependenciesGraph)],
    parsedConfig.options,
  ).transformed[0] as ts.SourceFile;
  const printer = ts.createPrinter();
  return printer.printFile(transformedSourceFile);
};

export const generateStage = async (filePath: string): Promise<string> => {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile)
    return await require("fs").promises.readFile(filePath, "utf8");
  const transformedSourceFile = ts.transform(
    sourceFile,
    [generate(program, dependenciesGraph)],
    parsedConfig.options,
  ).transformed[0] as ts.SourceFile;
  const printer = ts.createPrinter();
  return printer.printFile(transformedSourceFile);
};
