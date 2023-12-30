import * as ts from "typescript";
import { __WTD_MODULE__ } from "./constants";
import { handleContainer } from "./1-create-container";
import { WhatTheDepOptions } from "..";
import { handleGet } from "./3-modify-get";

let whatTheDepModule: ts.Symbol | undefined;

export let globalContext: ts.TransformationContext;
export let globalTypeChecker: ts.TypeChecker;
export let globalConfig: WhatTheDepOptions;

export const transformerFactory = (
  program: ts.Program,
  config: WhatTheDepOptions
): ts.TransformerFactory<ts.Node> => {
  const transformList = new Map<ts.Node, ts.Node>();
  globalConfig = config;
  globalTypeChecker = program.getTypeChecker();
  return (context) => (rootNode) => {
    globalContext = context;
    const visitor = (node: ts.Node): ts.Node => {
      // Find container initialization
      // 1. const container = new Container();
      // 2. const container = (new Container()).register();

      // case 1
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.length === 1
      ) {
        const declaration = node.declarationList.declarations[0];
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isNewExpression(declaration.initializer) &&
          ts.isIdentifier(declaration.initializer.expression)
        ) {
          const type = globalTypeChecker.getTypeAtLocation(
            declaration.initializer.expression
          );
          const symbol = type.getSymbol();
          if (symbol && symbol === whatTheDepModule) {
            handleContainer(
              rootNode,
              declaration.initializer.expression,
              globalTypeChecker
                .getTypeAtLocation(declaration.name)
                .getSymbol()!,
              program,
              transformList
            );
          }
          if (symbol && symbol.name === "Container") {
            if (!whatTheDepModule) {
              if (symbol.valueDeclaration?.getText().includes(__WTD_MODULE__)) {
                // memo module symbol for later check

                whatTheDepModule = symbol;
                handleContainer(
                  rootNode,
                  declaration.initializer.expression,
                  globalTypeChecker
                    .getTypeAtLocation(declaration.name)
                    .getSymbol()!,
                  program,
                  transformList
                );
              }
            }
          }
        }
      }

      // case 2
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        // dig into expression to find the identifier
        let expressionChildren = node.expression.getChildren();
        while (!ts.isIdentifier(expressionChildren[0])) {
          if (ts.isParenthesizedExpression(expressionChildren[0])) {
            // (new Container()).register()
            if (ts.isNewExpression(expressionChildren[0].expression)) {
              const containerNode =
                expressionChildren[0].expression.getChildren()[1]!;
              const containerSymbol = globalTypeChecker
                .getTypeAtLocation(containerNode)
                .getSymbol();
              if (
                containerSymbol?.valueDeclaration
                  ?.getText()
                  .includes(__WTD_MODULE__)
              ) {
                handleContainer(
                  rootNode,
                  containerNode,
                  containerSymbol!,
                  program,
                  transformList
                );
              }
            }
          }
          if (ts.isNewExpression(expressionChildren[0])) {
            const containerNode = expressionChildren[0].getChildren()[1]!;
            const containerSymbol = globalTypeChecker
              .getTypeAtLocation(containerNode)
              .getSymbol();

            if (
              containerSymbol?.valueDeclaration
                ?.getText()
                .includes(__WTD_MODULE__)
            ) {
              handleContainer(
                rootNode,
                containerNode,
                containerSymbol!,
                program,
                transformList
              );
            }
          }
          expressionChildren = expressionChildren[0].getChildren();
          if (expressionChildren.length <= 2) {
            break;
          }
        }
      }

      // Find a property access expression .get
      if (ts.isPropertyAccessExpression(node)) {
        // is .get
        if (node.name.getText() === "get") {
          const symbol = globalTypeChecker
            .getTypeAtLocation(node.expression)
            .getSymbol();
          if (symbol) {
            if (symbol?.valueDeclaration?.getText().includes(__WTD_MODULE__)) {
              if (!ts.isCallExpression(node.parent)) {
                return ts.visitEachChild(node, visitor, context);
              }
              handleGet(node.parent, transformList);
            }
          }
        }
      }
      return ts.visitEachChild(node, visitor, context);
    };

    const visitWithoutTransform = ts.visitNode(rootNode, visitor);

    if (transformList.size > 0) {
      const transform = (node: ts.Node): ts.Node => {
        if (transformList.has(node)) {
          return ts.visitEachChild(
            transformList.get(node)!,
            transform,
            context
          );
        }
        return ts.visitEachChild(node, transform, context);
      };
      return ts.visitNode(rootNode, transform);
    } else {
      return visitWithoutTransform;
    }
  };
};
