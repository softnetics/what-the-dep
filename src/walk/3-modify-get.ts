import ts from "typescript";
import { globalTypeChecker, globalContext } from ".";
import { hashSymbolOrNode } from "./utils";

export const handleGet = (
  node: ts.CallExpression,
  transformList: Map<ts.Node, ts.Node>
) => {
  // hash and move type argument to argument
  const argument = ts.factory.createStringLiteral(
    hashSymbolOrNode(node.typeArguments![0])
  );
  const newNode = ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    [argument]
  );
  transformList.set(node, newNode);
};

export const getFactoryDependencies = (factory: ts.Expression) => {
  const dependencies: string[] = [];

  let getSymbol: ts.Symbol | undefined;
  const visitor = (node: ts.Node): ts.Node => {
    if (!getSymbol && ts.isParameter(node)) {
      getSymbol = globalTypeChecker.getTypeAtLocation(node).getSymbol();
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const symbol = globalTypeChecker
          .getTypeAtLocation(node.expression)
          .getSymbol();
        if (symbol && symbol === getSymbol) {
          const classOrInterface = node.typeArguments![0];
          const hash = hashSymbolOrNode(node.typeArguments![0]);
          dependencies.push(hash);
        }
      }
    }
    return ts.visitEachChild(node, visitor, globalContext);
  };

  ts.visitNode(factory, visitor);

  return dependencies;
};
