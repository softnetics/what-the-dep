import ts from "typescript";
import { hashSymbol, shortHash } from "../utils";
import { DependenciesGraph, Module, ModuleKind } from "../graph";
export function resolver(
  program: ts.Program,
  dependenciesGraph: DependenciesGraph,
) {
  const checker = program.getTypeChecker();

  console.log("RESOLVE");

  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        if (ts.isClassDeclaration(node) && node.name) {
          for (const member of node.members) {
            if (ts.isPropertyDeclaration(member) && member.name) {
              const propertyName = member.name.getText();
              if (propertyName === "REAL_DI_CONTAINER") {
                dependenciesGraph.setContainer(node);
              }
              if (propertyName === "REAL_DI_CONTEXT") {
                dependenciesGraph.setContext(node);
              }
            }
          }
        }
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isPropertyAccessExpression(expression)) {
            const methodName = expression.name.text;
            const objectName = expression.expression.getText();
            if (
              objectName === "container" &&
              (methodName === "register" || methodName === "registerSingleton")
            ) {
              // handle register
              const dependencyType = node.typeArguments[0];
              const dependency =
                node.typeArguments.length > 1
                  ? node.typeArguments[1]
                  : node.typeArguments[0];

              const factory = node.arguments[0];

              const dependencySymbol = checker
                .getTypeAtLocation(dependency)
                .getSymbol();
              const dependencyTypeSymbol = checker
                .getTypeAtLocation(dependencyType)
                .getSymbol();

              const dependencyDeclaration = dependencySymbol?.declarations[0];
              const dependencyTypeDeclaration =
                dependencyTypeSymbol?.declarations[0];

              const typeHash = shortHash(dependencyTypeDeclaration?.getText());

              const classNameIndex = dependencyDeclaration
                .getChildren()
                .findIndex((a) => a.getText() === "class");

              const className = dependencyDeclaration
                .getChildren()
                [classNameIndex + 1].getText();

              console.log("Found class", className, "with hash", typeHash);

              if (ts.isClassLike(dependencyDeclaration)) {
                // dependency is a class find constructor
                const constructor = dependencyDeclaration.members.find(
                  (member) => ts.isConstructorDeclaration(member),
                );

                if (ts.isConstructorDeclaration(constructor)) {
                  const parameters = constructor.parameters;
                  const parameterTypes = parameters.map((parameter) => {
                    return checker.getTypeAtLocation(parameter);
                  });

                  //
                  // if (factory) {
                  //   dependenciesGraph.addFactory(dependencyTypeSymbol, factory);
                  // }
                  //
                  const moduleKind = factory
                    ? ModuleKind.ASYNC
                    : methodName === "register"
                    ? ModuleKind.TRANSIENT
                    : ModuleKind.SINGLETON;

                  const currentModule = new Module(
                    hashSymbol(dependencyTypeSymbol),
                    parameterTypes.map((c) => hashSymbol(c.getSymbol())),
                    moduleKind,
                  );

                  // add module to graph
                  dependenciesGraph.addModule(currentModule);
                  // map interface to class
                  dependenciesGraph.addDependency(
                    hashSymbol(dependencyTypeSymbol),
                    dependencySymbol,
                  );

                  //
                  // if (methodName === "registerSingleton") {
                  //   dependenciesGraph.addSingleton(
                  //     dependencyTypeSymbol,
                  //     dependencySymbol,
                  //   );
                  // }
                }
              }
            }
          }
        }
        return ts.visitEachChild(node, visit, context);
      }
      ts.visitNode(sourceFile, visit);
      return sourceFile;
    };
  };
}
