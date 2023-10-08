import ts, { ArrowFunction, Expression } from "typescript";
import path from "path";
import { DependenciesGraph, ModuleKind } from "../graph";
import {
  createImportFromSymbol,
  hashSymbol,
  shortHash,
  toCamelCase,
} from "../utils";

export function generate(
  program: ts.Program,
  dependenciesGraph: DependenciesGraph,
) {
  const checker = program.getTypeChecker();
  console.log("GENERATE");
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function traverseFunctionArgBody(
        func: ts.FunctionExpression | ts.ArrowFunction,
      ): ts.Node {
        function visit(node: ts.Node): ts.Node {
          // Check if the node is a call expression where the first argument of the function is used

          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression)
          ) {
            const methodName = node.expression.name.text;
            const contextName = func.parameters[0].name.getText();
            if (
              contextName === node.expression.expression.getText() &&
              methodName === "get"
            ) {
              const newArgs = [
                ts.factory.createStringLiteral(
                  hashSymbol(
                    checker
                      .getTypeAtLocation(node.typeArguments[0])
                      .getSymbol()!,
                  ),
                ),
                ...node.arguments.slice(1),
              ];

              return ts.factory.updateCallExpression(
                node,
                node.expression,
                node.typeArguments,
                newArgs,
              );
            }
          }
          return ts.visitEachChild(node, visit, context);
        }
        return ts.visitNode(func.body, visit);
      }

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

          for (const module of dependenciesGraph.topologicalSort()) {
            // TODO: tree shaking
            // get all registered dependencies
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
          }

          for (const module of dependenciesGraph.getSingletonDependencySorted()) {
            // initiate all singletons
            const dependency = dependenciesGraph.convertHashToSymbol(
              module.hash,
            );
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
                    [ts.factory.createThis()],
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
              const caseStatements = [];
              // Create the arrow function '() => {}'
              const arrowFunction = ts.factory.createArrowFunction(
                [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
                undefined,
                [],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.factory.createBlock(caseStatements, true),
              );

              // Create the immediately invoked function expression '(() => {})()'
              const iife = ts.factory.createCallExpression(
                arrowFunction,
                undefined,
                [],
              );

              // Create the statement 'return (() => {})()'
              const returnStatement = ts.factory.createReturnStatement(iife);

              for (const dependency of dependencies) {
                if (dependency.kind === ModuleKind.SINGLETON) {
                  // Create the expression 'this["hash"]'
                  const elementAccess =
                    ts.factory.createElementAccessExpression(
                      ts.factory.createThis(),
                      ts.factory.createStringLiteral(dependency.hash),
                    );

                  // Create the statement 'const module_hash = this["hash"]'
                  const variableStatement = ts.factory.createVariableStatement(
                    undefined,
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          ts.factory.createIdentifier(
                            `module_${dependency.hash}`,
                          ),
                          undefined,
                          undefined,
                          elementAccess,
                        ),
                      ],
                      ts.NodeFlags.Const,
                    ),
                  );
                  caseStatements.push(variableStatement);
                } else {
                  // transient
                  if (dependency.isAsync) {
                    // async factory
                    const factoryAccessStatement =
                      ts.factory.createAwaitExpression(
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
                            [ts.factory.createStringLiteral(dependency.hash)],
                          ),
                          undefined,
                          [ts.factory.createThis()],
                        ),
                      );
                    const variableStatement =
                      ts.factory.createVariableStatement(
                        undefined,
                        ts.factory.createVariableDeclarationList(
                          [
                            ts.factory.createVariableDeclaration(
                              ts.factory.createIdentifier(
                                `module_${dependency.hash}`,
                              ),
                              undefined,
                              undefined,
                              factoryAccessStatement,
                            ),
                          ],
                          ts.NodeFlags.Const,
                        ),
                      );
                    caseStatements.push(variableStatement);
                  } else {
                    // normal class
                    const dependencySymbol =
                      dependenciesGraph.convertHashToSymbol(dependency.hash);
                    const dependenciesOfDependency =
                      dependenciesGraph.getDependencies(dependency.hash);
                    const classInit = ts.factory.createNewExpression(
                      ts.factory.createIdentifier(dependencySymbol.getName()),
                      undefined,
                      dependenciesOfDependency.map((d) =>
                        d.kind === ModuleKind.SINGLETON
                          ? ts.factory.createElementAccessExpression(
                              ts.factory.createThis(),
                              ts.factory.createStringLiteral(d.hash),
                            )
                          : ts.factory.createIdentifier(`module_${d.hash}`),
                      ),
                    );

                    const leftSide = ts.factory.createElementAccessExpression(
                      ts.factory.createThis(),
                      ts.factory.createStringLiteral(dependency.hash),
                    );

                    // Create the variable declaration: a = new b()
                    const variableDeclaration =
                      ts.factory.createVariableDeclaration(
                        ts.factory.createIdentifier(
                          `module_${dependency.hash}`,
                        ), // Variable name
                        undefined, // Type (none in this case)
                        undefined, // Type node (none in this case)
                        classInit, // Initializer
                      );

                    // Create the full statement: const a = new b();
                    const variableStatement =
                      ts.factory.createVariableStatement(
                        [],
                        ts.factory.createVariableDeclarationList(
                          [variableDeclaration],
                          ts.NodeFlags.Const,
                        ), // Variable declaration list
                      );
                    caseStatements.push(variableStatement);
                  }
                  if (dependency.hash === module.hash) {
                    caseStatements.push(
                      ts.factory.createReturnStatement(
                        ts.factory.createIdentifier(`module_${module.hash}`),
                      ),
                    );
                  }
                }
              }
              statements.push(returnStatement);
            }
            moduleCases.push(
              ts.factory.createCaseClause(
                ts.factory.createStringLiteral(module.hash),
                statements,
              ),
            );
            // all modules
          }
          const condition = ts.factory.createPrefixUnaryExpression(
            ts.SyntaxKind.ExclamationToken,
            ts.factory.createPropertyAccessExpression(
              ts.factory.createThis(),
              ts.factory.createIdentifier("isInitialized"),
            ),
          );

          const thenStatement = ts.factory.createExpressionStatement(
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createThis(),
                  ts.factory.createIdentifier("initSingletons"),
                ),
                undefined,
                [],
              ),
            ),
          );

          const ifStatement = ts.factory.createIfStatement(
            condition,
            thenStatement,
          );
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
              ifStatement,
              ts.factory.createSwitchStatement(
                ts.factory.createIdentifier("typeHash"),
                ts.factory.createCaseBlock(moduleCases),
              ),
            ]),
          );
          // Add the new method to the class
          const updatedMembers = ts.factory.createNodeArray([
            ...node.members.filter(
              (m) =>
                m.name.getText() != "get" &&
                m.name.getText() != "singletonsInit",
            ),
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

                const modifiedFactory = traverseFunctionArgBody(
                  node.arguments[0] as ArrowFunction,
                );

                const factory = node.arguments[0] as ArrowFunction;

                const updatedFunc = ts.factory.updateArrowFunction(
                  factory,
                  factory.modifiers,
                  factory.typeParameters,
                  factory.parameters,
                  factory.type,
                  ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  modifiedFactory as ts.Expression,
                );

                const newArgs = [
                  updatedFunc,
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
            if (objectName === "container" && methodName === "get") {
              const dependencyType = node.typeArguments[0];
              const dependencyTypeSymbol = checker
                .getTypeAtLocation(dependencyType)
                .getSymbol();
              const dependencyTypeDeclaration =
                dependencyTypeSymbol?.declarations[0];
              const typeHash = shortHash(dependencyTypeDeclaration?.getText());
              const newArgs = [ts.factory.createStringLiteral(typeHash)];
              return ts.factory.updateCallExpression(
                node,
                node.expression,
                node.typeArguments,
                newArgs,
              );
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
