import { container } from "../lib/di";
import { Test0, ITest0 } from "./modules/test0";
import { Test1, ITest1 } from "./modules/test1";

container.register<ITest1, Test1>();
container.registerSingleton<ITest0, Test0>(async () => {
  return new Test0();
});

await container.context.initSingletons();

console.log("runtime", await container.get<ITest1>());
