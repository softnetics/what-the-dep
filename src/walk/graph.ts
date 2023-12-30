import ts from "typescript";
type DependencyType = "singleton" | "transient";

export class DependencyGraph {
  private dependencies: Map<
    string,
    {
      type: DependencyType;
      dependencies: string[];
      factory?: ts.Node;
      className: string;
    }
  > = new Map();

  register(
    type: DependencyType,
    interfaceHash: string,
    factory: ts.Node | undefined,
    className: string,
    dependencies: string[]
  ): void {
    console.log("register", interfaceHash, className);
    this.dependencies.set(interfaceHash, {
      type,
      dependencies,
      factory,
      className,
    });
  }

  topologicalSort(): string[] {
    const visited: Set<string> = new Set();
    const result: string[] = [];
    const path: Set<string> = new Set(); // Track the current path

    const dfs = (key: string) => {
      if (path.has(key)) {
        throw new Error(
          `Circular dependency detected: ${Array.from(path).join(
            " -> "
          )} -> ${key}`
        );
      }

      if (!visited.has(key)) {
        visited.add(key);
        path.add(key); // Add the current key to the path

        const dependencies = this.dependencies.get(key)?.dependencies || [];
        for (const dependency of dependencies) {
          dfs(dependency);
        }

        path.delete(key); // Remove the current key from the path
        result.unshift(key);
      }
    };

    for (const [key] of this.dependencies) {
      dfs(key);
    }

    return result;
  }

  getSingletons(): string[] {
    return this.topologicalSort()
      .reverse()
      .filter((hash) => {
        const dependency = this.dependencies.get(hash);
        return dependency && dependency.type === "singleton";
      });
  }

  resolve(interfaceHash: string) {
    return this.dependencies.get(interfaceHash);
  }

  print() {
    console.log(
      this.topologicalSort()
        .reverse()
        .map((hash) => ({
          ...this.dependencies.get(hash),
          hash: hash,
          factory: this.dependencies.get(hash)?.factory?.getText(),
        }))
    );
  }
}
