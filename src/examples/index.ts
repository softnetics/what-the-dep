import { container } from "../lib/di";

import { ITest0, Test0 } from "./modules/test0";
import { ITest1, Test1 } from "./modules/test1";

container.register<ITest0, Test0>();

container.register<ITest1, Test1>();

class Test2 {
  constructor(private test1: ITest1) {}
}

class Test3 {
  constructor(
    private test2: Test2,
    private test1: ITest1,
  ) {}
}

container.register<Test2, Test2>();
container.registerSingleton<Test3, Test3>();

interface ITest4 {
  test1: Test1;
  test2: Test2;
}

class Test4 implements ITest4 {
  constructor(
    public test1: Test1,
    public test2: Test2,
  ) {}
}

container.register<Test4, Test4>(async (context) => {
  const test1 = await context.get<Test1>();
  const test2 = await context.get<Test2>();
  return new Test4(test1, test2);
});

console.log("runtime", await container.get<ITest1>());
