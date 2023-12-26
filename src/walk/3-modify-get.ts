import ts from "typescript";
import { DependencyGraph } from "./graph";
import { globalTypeChecker } from ".";
import { hashSymbol } from "./utils";

export const handleGet = (
  node: ts.CallExpression,
  transformList: Map<ts.Node, ts.Node>
) => {
  // hash and move type argument to argument
  const argument = ts.factory.createStringLiteral(
    hashSymbol(
      globalTypeChecker.getTypeAtLocation(node.typeArguments![0]).getSymbol()!
    )
  );
  const newNode = ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    [argument]
  );
  transformList.set(node, newNode);
};
