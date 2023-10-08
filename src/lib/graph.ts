import ts from "typescript";

export enum ModuleKind {
  SINGLETON = "SINGLETON",
  TRANSIENT = "TRANSIENT",
}

export class Module {
  hash: string;
  dependencies: string[];
  kind: ModuleKind;
  isAsync: boolean;

  constructor(
    typeHash: string,
    dependencies: string[],
    kind: ModuleKind = ModuleKind.TRANSIENT,
    isAsync: boolean = false,
  ) {
    this.hash = typeHash;
    this.kind = kind;
    this.dependencies = dependencies;
    this.isAsync = isAsync;
  }
}

export class DependenciesGraph {
  private modules: Map<string, Module> = new Map();
  private hashToSymbol: Map<string, ts.Symbol> = new Map();
  contextNode?: ts.Node;
  containerNode?: ts.Node;

  convertHashToSymbol(from: string): ts.Symbol | undefined {
    return this.hashToSymbol.get(from);
  }

  getModule(hash: string): Module | undefined {
    return this.modules.get(hash);
  }

  getInitDependenciesOf(hash: string): Module[] {
    const visited = new Set<string>();
    const stack: Module[] = [];
    const module = this.modules.get(hash);
    if (!module) {
      throw new Error(`Module with hash ${hash} not found`);
    }

    const visit = (module: Module) => {
      if (!visited.has(module.hash)) {
        visited.add(module.hash);
        module.dependencies.forEach((depHash) => {
          const depModule = this.modules.get(depHash);
          if (depModule) {
            visit(depModule);
          }
        });
        stack.push(module);
      }
    };

    visit(module);

    return stack;
  }

  getDependencies(from: string): Module[] {
    const module = this.modules.get(from);
    if (module) {
      return module.dependencies.map((depHash) => this.modules.get(depHash));
    }
    return [];
  }

  addDependency(from: string, to: ts.Symbol) {
    this.hashToSymbol.set(from, to);
  }

  addModule(module: Module) {
    this.modules.set(module.hash, module);
  }

  setContext(node: ts.Node) {
    this.contextNode = node;
  }

  setContainer(node: ts.Node) {
    this.containerNode = node;
  }

  topologicalSort(): Module[] {
    const visited = new Set<string>();
    const stack: Module[] = [];

    const visit = (module: Module) => {
      if (!visited.has(module.hash)) {
        visited.add(module.hash);
        module.dependencies.forEach((depHash) => {
          const depModule = this.modules.get(depHash);
          if (depModule) {
            visit(depModule);
          }
        });
        stack.push(module);
      }
    };

    this.modules.forEach((module) => visit(module));

    return stack;
  }

  topologySortOf(hash: string): Module[] {
    const visited = new Set<string>();
    const stack: Module[] = [];
    const startModule = this.modules.get(hash);

    if (!startModule) {
      throw new Error(`Module with hash ${hash} not found.`);
    }

    const visit = (module: Module) => {
      if (!visited.has(module.hash)) {
        visited.add(module.hash);
        module.dependencies.forEach((depHash) => {
          const depModule = this.modules.get(depHash);
          if (depModule) {
            visit(depModule);
          }
        });
        stack.push(module);
      }
    };

    visit(startModule);

    return stack;
  }

  getSingletonDependencySorted(): Module[] {
    const visited = new Set<string>();
    const stack: Module[] = [];

    const visit = (module: Module) => {
      if (!visited.has(module.hash)) {
        visited.add(module.hash);
        module.dependencies.forEach((depHash) => {
          const depModule = this.modules.get(depHash);
          if (depModule) {
            visit(depModule);
          }
        });
        stack.push(module);
      }
    };

    this.modules.forEach((module) => {
      if (module.kind === ModuleKind.SINGLETON) {
        visit(module);
      }
    });

    return stack;
  }
}
