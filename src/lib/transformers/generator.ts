import ts from "typescript";
import path from "path";
import { DependenciesGraph } from "../graph";
import { createImportFromSymbol, shortHash, toCamelCase } from "../utils";

export function generate(
  program: ts.Program,
  dependenciesGraph: DependenciesGraph,
) {
  const checker = program.getTypeChecker();
  console.log("GENERATE");
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      let statements: ts.NodeArray<ts.Statement> = sourceFile.statements;

      const addStatements: ts.Statement[] = [];
      const removeStatements: ts.Statement[] = [];

      function visit(node: ts.Node): ts.Node {
        if (
          node === dependenciesGraph.contextNode &&
          ts.isClassDeclaration(node)
        ) {
          // found context
          // add dependency to get
          const constructorExpression = [];
          const initiated = [];

          for (const module of dependenciesGraph.topologicalSort()) {
            const dependency = dependenciesGraph.convertHashToSymbol(
              module.hash,
            );
            const [importDeclaration, modifiedClass] = createImportFromSymbol(
              dependency,
              node.getSourceFile().fileName,
            );

            addStatements.push(importDeclaration);

            if (modifiedClass) {
              // add export
              statements = ts.factory.createNodeArray(
                statements.filter(
                  (n) => checker.getSymbolAtLocation(n) != dependency,
                ),
              );

              addStatements.push(modifiedClass);
            }

            const dependencies = dependenciesGraph.getDependencies(module.hash);

            const classInit = ts.factory.createNewExpression(
              ts.factory.createIdentifier(dependency.getName()),
              undefined,
              dependencies.map((d) =>
                ts.factory.createElementAccessExpression(
                  ts.factory.createThis(),
                  ts.factory.createStringLiteral(toCamelCase(d.hash)),
                ),
              ),
            );

            const leftSide = ts.factory.createElementAccessExpression(
              ts.factory.createThis(),
              ts.factory.createStringLiteral(toCamelCase(module.hash)),
            );
            const assignmentStatement = ts.factory.createExpressionStatement(
              ts.factory.createBinaryExpression(
                leftSide,
                ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                classInit,
              ),
            );

            initiated.push(assignmentStatement);

            constructorExpression.push(assignmentStatement);
          }
          const newMethod = ts.factory.createMethodDeclaration(
            undefined, // modifiers
            undefined, // asteriskToken
            "constructor", // name
            undefined, // questionToken
            undefined, // typeParameters
            [], // parameters
            undefined, // type
            ts.factory.createBlock(constructorExpression),
          );

          // Add the new method to the class
          const updatedMembers = ts.factory.createNodeArray([
            ...node.members,
            newMethod,
          ]);
          const updatedClass = ts.factory.createClassDeclaration(
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            updatedMembers,
          );

          removeStatements.push(node);
          addStatements.push(updatedClass);
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
              if (node.arguments.length == 1) {
                // has factory
                // add typeHash
                const dependencyType = node.typeArguments[0];
                const dependencyTypeSymbol = checker
                  .getTypeAtLocation(dependencyType)
                  .getSymbol();
                const dependencyTypeDeclaration =
                  dependencyTypeSymbol?.declarations[0];
                const typeHash = shortHash(
                  dependencyTypeDeclaration?.getText(),
                );

                const newArgs = [
                  ...node.arguments,
                  ts.factory.createStringLiteral(typeHash),
                ];
                return ts.factory.updateCallExpression(
                  node,
                  node.expression,
                  node.typeArguments,
                  newArgs,
                );
              }
            }
          }
        }
        return ts.visitEachChild(node, visit, context);
      }

      const newStatements = [];

      for (let statement of statements) {
        newStatements.push(ts.visitNode(statement, visit) as ts.Statement);
      }

      // Apply modifications to the sourceFile
      sourceFile = ts.factory.updateSourceFile(sourceFile, [
        ...addStatements,
        ...newStatements.filter((n) => removeStatements.indexOf(n) === -1),
      ]);

      return sourceFile;
    };
  };
}
