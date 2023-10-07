import { createHash } from "crypto";
import ts from "typescript";
import path from "path";

export function hashSymbol(symbol: ts.Symbol): string {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return "";
  const declaration = declarations[0];
  return shortHash(declaration.getText());
}

export function shortHash(input: string, length: number = 8): string {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest("hex").substring(0, length);
}

export function isClassExported(
  classDeclaration: ts.ClassDeclaration,
): boolean {
  if (!classDeclaration.modifiers) {
    return false;
  }
  return classDeclaration.modifiers.some(
    (mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
  );
}

export function toCamelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export function createImportFromSymbol(
  symbol: ts.Symbol,
  currentFileName: string,
) {
  // Get the declaration of the symbol
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return null;

  let newClassDeclaration: ts.ClassDeclaration | undefined;

  const declaration = declarations[0] as ts.ClassDeclaration;
  if (!isClassExported(declaration)) {
    const exportModifier = ts.factory.createModifier(
      ts.SyntaxKind.ExportKeyword,
    );
    newClassDeclaration = ts.factory.createClassDeclaration(
      [exportModifier, ...(declaration.modifiers ?? [])],
      declaration.name,
      declaration.typeParameters,
      declaration.heritageClauses,
      declaration.members,
    );
  }

  const sourceFile = declaration.getSourceFile();

  // Compute the relative path
  const relativePath = path
    .relative(path.dirname(currentFileName), sourceFile.fileName)
    .replace(/\.ts$/, "") // Remove .ts extension
    .replace(/\\/g, "/"); // Use forward slashes

  // Ensure the path starts with "./" or "../"
  const moduleSpecifier = ts.factory.createStringLiteral(
    relativePath.startsWith(".") ? relativePath : `./${relativePath}`,
  );
  // Create the import specifier
  const importSpecifier = ts.factory.createImportSpecifier(
    false,
    undefined,
    ts.factory.createIdentifier(symbol.name),
  );

  // Create the named imports (i.e., { SymbolName })
  const namedImports = ts.factory.createNamedImports([importSpecifier]);

  // Create the import declaration
  const importDeclaration = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(false, undefined, namedImports),
    moduleSpecifier,
  );

  return [importDeclaration, newClassDeclaration];
}
