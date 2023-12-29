import ts from "typescript";
import { DependencyGraph } from "./graph";
import { globalTypeChecker } from ".";
import { hashSymbol } from "./utils";
import {
  defaultFactoryTemplate,
  factoryWrapperTemplate,
  singletonTemplate,
  transientTemplate,
  getMethodTemplate,
  initSingletonsTemplate,
} from "./source-templates";

export const createContextFromGraph = (graph: DependencyGraph) => {
  const properties = graph.topologicalSort().map((hash) => {
    const resolved = graph.resolve(hash);
    if (!resolved) {
      throw new Error(`Could not resolve dependencies of ${hash}`);
    }
    const { type, dependencies, factory, className } = resolved;
    const statements: ts.Statement[] = [];
    let initializer: ts.Expression | undefined;
    initializer = defaultFactoryTemplate(className, dependencies);
    if (factory) {
      initializer = factoryWrapperTemplate(factory as ts.Expression);
    }
    if (type === "singleton") {
      statements.push(...singletonTemplate(hash, initializer));
    } else {
      statements.push(...transientTemplate(initializer));
    }

    const body = ts.factory.createBlock(statements);
    const getMethod = getMethodTemplate(body);
    return ts.factory.createPropertyAssignment(
      ts.factory.createStringLiteral(hash),
      getMethod
    );
  });

  properties.push(initSingletonsTemplate(graph.getSingletons()));

  const objectLiteral = ts.factory.createObjectLiteralExpression(
    properties,
    true
  );
  return objectLiteral;
};
