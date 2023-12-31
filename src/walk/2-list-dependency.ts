import ts from "typescript";
import { DependencyGraph } from "./graph";
import { globalTypeChecker } from ".";
import { hashSymbol, hashNode } from "./utils";

export const listDependenciesOfClass = (
  classSymbol: ts.Symbol,
  classNode: ts.Node
) => {
  const dependencies: string[] = [];
  const classDeclaration = globalTypeChecker
    .getTypeAtLocation(classNode)
    .getSymbol()?.valueDeclaration;

  if (!classDeclaration) {
    if (!classSymbol?.name) {
      throw new Error(`There are only type provided, please provide a factory`);
    }
    throw new Error(`Could not find class declaration of ${classSymbol.name}`);
  }

  // find constructor
  if (!ts.isClassDeclaration(classDeclaration)) {
    throw new Error(
      `this is not class declaration evaluating ${classSymbol.name}`
    );
  }
  const constructor = classDeclaration.members.find(
    ts.isConstructorDeclaration
  );
  if (!constructor) {
    throw new Error(`Could not find constructor of ${classSymbol.name}`);
  }

  // find parameter
  const parameters = constructor.parameters;
  for (const parameter of parameters) {
    if (ts.isParameter(parameter)) {
      if (!parameter.type) {
        throw new Error(
          `Missing type of parameter ${parameter.name.getText()}`
        );
      }

      const type = globalTypeChecker.getTypeAtLocation(parameter.type);
      const symbol = type.symbol ?? type.getSymbol();
      let moduleHash: string;
      if (symbol) {
        moduleHash = hashSymbol(symbol);
      } else {
        moduleHash = hashNode(parameter.type);
      }
      if (symbol && moduleHash) {
        dependencies.push(moduleHash);
      }
    }
  }

  return dependencies;
};
