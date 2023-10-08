import { Module, ModuleKind } from "./graph";

class MockClass {
  constructor() {}
}

class Context {
  REAL_DI_CONTEXT: true = true;

  asyncFactory: Map<string, Function> = new Map();

  async get<T extends any>(typeHash?: string): Promise<T> {
    return {} as T;
  }

  set(typeHash: string, initiator: Function): void {
    this.asyncFactory.set(typeHash, initiator);
  }

  async initSingletons(): Promise<void> {}
}

class Container {
  REAL_DI_CONTAINER: true = true;
  context: Context = new Context();

  register<T, P extends T | never = never>(
    factory?: (c: Context) => Promise<P>,
    typeHash?: string,
  ): void {
    if (factory && typeHash) {
      this.context.set(typeHash, factory);
    }
  }

  registerSingleton<T, P extends T | never = never>(
    factory?: (c: Context) => Promise<P>,
    typeHash?: string,
  ): void {
    if (factory && typeHash) {
      this.context.set(typeHash, factory);
    }
  }

  async get<T extends any>(typeHash?: string): Promise<T> {
    return (await this.context.get(typeHash)) as T;
  }
}

const container = new Container();

export { container };
