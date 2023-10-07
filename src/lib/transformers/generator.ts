import ts from "typescript";
import path from "path";
import { DependenciesGraph, ModuleKind } from "../graph";
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

      const addedModuleHashes: string[] = [];
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

          for (const module of dependenciesGraph.getSingletonDependencySorted()) {
            // initiate all singletons
            const dependency = dependenciesGraph.convertHashToSymbol(
              module.hash,
            );
            addedModuleHashes.push(module.hash);
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

            // if async get the factory from asyncFactory if not get the class
            const classInit = module.isAsync
              ? ts.factory.createAwaitExpression(
                  ts.factory.createCallExpression(
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createThis(),
                          ts.factory.createIdentifier("asyncFactory"),
                        ),
                        ts.factory.createIdentifier("get"),
                      ),
                      undefined,
                      [ts.factory.createStringLiteral(module.hash)],
                    ),
                    undefined,
                    [],
                  ),
                )
              : ts.factory.createNewExpression(
                  ts.factory.createIdentifier(dependency.getName()),
                  undefined,
                  dependencies.map((d) =>
                    d.kind === ModuleKind.SINGLETON
                      ? ts.factory.createElementAccessExpression(
                          ts.factory.createThis(),
                          ts.factory.createStringLiteral(d.hash),
                        )
                      : ts.factory.createIdentifier(`transient_${d.hash}`),
                  ),
                );

            const leftSide = ts.factory.createElementAccessExpression(
              ts.factory.createThis(),
              ts.factory.createStringLiteral(module.hash),
            );
            const assignmentStatement = ts.factory.createExpressionStatement(
              ts.factory.createBinaryExpression(
                leftSide,
                ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                classInit,
              ),
            );

            // Create the variable declaration: a = new b()
            const variableDeclaration = ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(`transient_${module.hash}`), // Variable name
              undefined, // Type (none in this case)
              undefined, // Type node (none in this case)
              classInit, // Initializer
            );

            // Create the full statement: const a = new b();
            const variableStatement = ts.factory.createVariableStatement(
              [],
              ts.factory.createVariableDeclarationList(
                [variableDeclaration],
                ts.NodeFlags.Const,
              ), // Variable declaration list
            );

            constructorExpression.push(
              module.kind === ModuleKind.SINGLETON
                ? assignmentStatement
                : variableStatement,
            );
          }

          const singletonsInit = ts.factory.createMethodDeclaration(
            [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)], // modifiers
            undefined, // asteriskToken
            "initSingletons", // name
            undefined, // questionToken
            undefined, // typeParameters
            [], // parameters
            undefined, // type
            ts.factory.createBlock(constructorExpression),
          );

          const moduleCases = [];

          for (const module of dependenciesGraph.topologicalSort()) {
            const statements = [];
            if (module.kind === ModuleKind.SINGLETON) {
              statements.push(
                ts.factory.createReturnStatement(
                  ts.factory.createElementAccessExpression(
                    ts.factory.createThis(),
                    ts.factory.createStringLiteral(module.hash),
                  ),
                ),
              );
            }

            if (module.kind === ModuleKind.TRANSIENT) {
              const dependencies = dependenciesGraph.getInitDependenciesOf(
                module.hash,
              );
              for (const dependency of dependencies) {
              }
            }
            moduleCases.push(
              ts.factory.createCaseClause(
                ts.factory.createStringLiteral(module.hash),
                statements,
              ),
            );
            // all modules
          }

          const getMethod = ts.factory.createMethodDeclaration(
            [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
            undefined, // asteriskToken
            "get", // name
            undefined, // questionToken
            undefined, // typeParameters
            [
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                "typeHash",
              ),
            ], // parameters
            undefined, // type
            ts.factory.createBlock([
              ts.factory.createSwitchStatement(
                ts.factory.createIdentifier("typeHash"),
                ts.factory.createCaseBlock(moduleCases),
              ),
            ]),
          );
          // Add the new method to the class
          const updatedMembers = ts.factory.createNodeArray([
            ...node.members.filter((m) => m.name.getText() != "get"),
            singletonsInit,
            getMethod,
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
