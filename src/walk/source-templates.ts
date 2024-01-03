import ts from "typescript";
import { globalContext, globalTypeChecker } from ".";
import { hashSymbolOrNode } from "./utils";

export const defaultFactoryTemplate = (
  className: string,
  dependencies: string[]
) => {
  return ts.factory.createNewExpression(
    ts.factory.createIdentifier(className),
    undefined,
    dependencies.map((hash) =>
      ts.factory.createAwaitExpression(
        ts.factory.createCallExpression(
          ts.factory.createIdentifier("get"),
          undefined,
          [ts.factory.createStringLiteral(hash)]
        )
      )
    )
  );
};

export const initSingletonsTemplate = (hash: string[]) => {
  const statements = hash.map((hash) =>
    ts.factory.createExpressionStatement(
      ts.factory.createAwaitExpression(
        ts.factory.createCallExpression(
          ts.factory.createIdentifier("get"),
          undefined,
          [ts.factory.createStringLiteral(hash)]
        )
      )
    )
  );
  const body = ts.factory.createBlock(statements);
  return ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier("init_singletons"),
    getMethodTemplate(body)
  );
};

export const getMethodTemplate = (body: ts.Statement) => {
  return ts.factory.createArrowFunction(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        "singletons",
        undefined,
        undefined
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        "get",
        undefined,
        undefined
      ),
    ],
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.factory.createBlock([body], true)
  );
};

export const singletonTemplate = (hash: string, initializer: ts.Expression) => {
  /*
    if (singletons["Module1"]) return singletons["Module1"];
      singletons["Module1"] = new Module1();
      return singletons["Module1"];
    */

  return [
    ts.factory.createIfStatement(
      ts.factory.createElementAccessExpression(
        ts.factory.createIdentifier("singletons"),
        ts.factory.createStringLiteral(hash)
      ),
      ts.factory.createReturnStatement(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier("singletons"),
          ts.factory.createStringLiteral(hash)
        )
      )
    ),
    ts.factory.createExpressionStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier("singletons"),
          ts.factory.createStringLiteral(hash)
        ),
        ts.factory.createToken(ts.SyntaxKind.EqualsToken),
        initializer
      )
    ),
    ts.factory.createReturnStatement(
      ts.factory.createElementAccessExpression(
        ts.factory.createIdentifier("singletons"),
        ts.factory.createStringLiteral(hash)
      )
    ),
  ];
};

export const transientTemplate = (initializer: ts.Expression) => {
  return [ts.factory.createReturnStatement(initializer)];
};

export const factoryWrapperTemplate = (factory: ts.Expression) => {
  /**
     await (async (get) => {
      factory node
     })(get)
     */

  if (!ts.isExpression(factory)) {
    throw new Error(`Factory is not an expression`);
  }

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
          const hash = hashSymbolOrNode(classOrInterface);
          const newNode = ts.factory.createCallExpression(
            ts.factory.createIdentifier("get"),
            undefined,
            [ts.factory.createStringLiteral(hash)]
          );
          return newNode;
        }
      }
    }
    return ts.visitEachChild(node, visitor, globalContext);
  };

  factory = ts.visitNode(factory, visitor) as ts.Expression;

  return ts.factory.createAwaitExpression(
    ts.factory.createCallExpression(
      ts.factory.createParenthesizedExpression(factory),
      undefined,
      [ts.factory.createIdentifier("get")]
    )
  );
};
