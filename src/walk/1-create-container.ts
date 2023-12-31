import ts from "typescript";
import { DependencyGraph } from "./graph";
import { globalTypeChecker, globalContext } from ".";
import { listDependenciesOfClass } from "./2-list-dependency";
import { hashSymbol, isWhatTheDepMethod, hashNode } from "./utils";
import { getFactoryDependencies, handleGet } from "./3-modify-get";
import { createContextFromGraph } from "./4-create-context";

type ContainerRegisterMethod = "register" | "registerSingleton";

const isContainerRegisterMethod = (
  method: string
): method is ContainerRegisterMethod => {
  return method === "register" || method === "registerSingleton";
};

export const handleContainer = (
  rootNode: ts.Node,
  containerInitNode: ts.Node,
  container: ts.Symbol,
  program: ts.Program,
  transformList: Map<ts.Node, ts.Node>
) => {
  // create a dependency graph for this container
  const graph = new DependencyGraph();
  // list all method calling of a container
  // there are 2 cases of get
  // 1. const initialiedModule = Module.register<BlaBla>();
  //    initialiedModule.get<BlaBla>();
  // 2. Module.register<BlaBla>().get<BlaBla>();
  try {
    const visitor = (node: ts.Node): ts.Node => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        // dig into expression to find the identifier
        let expressionChildren = node.expression.getChildren();

        while (
          expressionChildren[0] &&
          !(
            ts.isNewExpression(expressionChildren[0]) ||
            ts.isIdentifier(expressionChildren[0])
          )
        ) {
          expressionChildren = expressionChildren[0].getChildren();
        }

        if (
          expressionChildren[0] &&
          ts.isNewExpression(expressionChildren[0])
        ) {
          const maybeWhatTheDepContainer =
            expressionChildren[0].getChildren()[1];
          if (!maybeWhatTheDepContainer) {
            return ts.visitEachChild(node, visitor, globalContext);
          }

          if (
            !(
              ts.isIdentifier(maybeWhatTheDepContainer) &&
              globalTypeChecker
                .getTypeAtLocation(maybeWhatTheDepContainer)
                .getSymbol() === container
            )
          ) {
            return ts.visitEachChild(node, visitor, globalContext);
          }

          expressionChildren[0] = maybeWhatTheDepContainer;
        }

        if (
          !isWhatTheDepMethod(expressionChildren[2]) ||
          !expressionChildren[0]
        ) {
          return ts.visitEachChild(node, visitor, globalContext);
        }
        if (expressionChildren[2].getText() === "get") {
          const identifierSymbol = globalTypeChecker
            .getTypeAtLocation(expressionChildren[0])
            .getSymbol();
          if (identifierSymbol) {
            if (ts.isVariableDeclaration(identifierSymbol.valueDeclaration!)) {
              // case 1 of get
              const initializer =
                identifierSymbol.valueDeclaration.initializer!;
              if (ts.isCallExpression(initializer)) {
                let expressionChildren = initializer.expression.getChildren();
                while (!ts.isIdentifier(expressionChildren[0])) {
                  expressionChildren = expressionChildren[0].getChildren();
                }
                if (
                  globalTypeChecker.getSymbolAtLocation(
                    expressionChildren[0]
                  ) === container
                ) {
                  handleGet(node, transformList);
                }
              }
            }
          }
        }
        const symbol = globalTypeChecker
          .getTypeAtLocation(expressionChildren[0])
          .getSymbol();
        // make sure this is a method calling of the container
        if (symbol === container) {
          // this iterate through all register and registerSingleton
          if (ts.isCallExpression(node)) {
            // method calling expression structure is
            // [Identifier (Container), DotToken, Identifier (RegisterSingleton/Register)]
            const registerMethod = node.expression.getChildren()[2].getText();
            const factoryNode = node.arguments[0];

            if (registerMethod === "get") {
              // case 2 of get
              handleGet(node, transformList);
              return ts.visitEachChild(node, visitor, globalContext);
            }

            if (!isContainerRegisterMethod(registerMethod)) {
              throw new Error(
                `Unknown method calling of container: ${registerMethod}`
              );
            }

            if (node.typeArguments?.length === 0) {
              throw new Error(`Missing type argument of ${registerMethod}`);
            }

            const InterfaceOrClass = node.typeArguments![0];
            const Class = node.typeArguments?.[1];
            if (ts.isTypeReferenceNode(InterfaceOrClass)) {
              // this type reference should have only one child
              const identifier =
                Class?.getChildren()[0] ?? InterfaceOrClass.getChildren()[0];

              const OriginalClassSymbol = globalTypeChecker
                .getTypeAtLocation(identifier)
                .getSymbol();

              let dependencies: string[] = [];

              if (factoryNode) {
                // dont care a class dependency and check a get of a factory
                dependencies = getFactoryDependencies(factoryNode);
              } else {
                dependencies = listDependenciesOfClass(
                  OriginalClassSymbol,
                  identifier
                );
              }

              const graphRegisterMethod =
                registerMethod === "register" ? "transient" : "singleton";

              if (Class) {
                // declare class using interface hash
                const classSymbol = globalTypeChecker
                  .getTypeAtLocation(InterfaceOrClass)
                  .getSymbol();
                graph.register(
                  graphRegisterMethod,
                  classSymbol
                    ? hashSymbol(classSymbol)
                    : hashNode(InterfaceOrClass),
                  factoryNode,
                  Class.getText(),
                  dependencies
                );
                return ts.visitEachChild(node, visitor, globalContext);
              }

              graph.register(
                graphRegisterMethod,
                OriginalClassSymbol
                  ? hashSymbol(OriginalClassSymbol)
                  : hashNode(identifier),
                factoryNode,
                InterfaceOrClass.getText(),
                dependencies
              );
            }
          }
        }
      }
      return ts.visitEachChild(node, visitor, globalContext);
    };
    ts.visitNode(rootNode, visitor);

    if (ts.isNewExpression(containerInitNode.parent)) {
      const containerInitNodeParent = containerInitNode.parent;
      // add argument
      const argument = createContextFromGraph(graph);
      const newContainerInitNodeParent = ts.factory.updateNewExpression(
        containerInitNodeParent,
        containerInitNodeParent.expression,
        containerInitNodeParent.typeArguments,
        [argument]
      );
      transformList.set(containerInitNode.parent, newContainerInitNodeParent);
    }
  } catch (error) {
    console.error(error);
  }
};
