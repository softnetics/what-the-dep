import { Module, ModuleKind } from "./graph";

class MockClass {
  constructor() {}
}

class Context {
  REAL_DI_CONTEXT: true = true;

  get<T extends any>(): T {
    return {} as T;
  }

  set<T extends any>(value: T): void {}

  moduleFactory<T extends any>(typeHash: string): T {
    return {} as T;
  }
}

class Container {
  REAL_DI_CONTAINER: true = true;
  context: Context = new Context();

  register<T, P extends T | never = never>(
    factory?: (c: Context) => Promise<P>,
    typeHash?: string,
  ): void {}

  registerSingleton<T, P extends T>(
    factory?: (c: Context) => Promise<P>,
    typeHash?: string,
  ): void {}

  get<T extends any>(): T {
    return {} as T;
  }
}

const container = new Container();

export { container };
