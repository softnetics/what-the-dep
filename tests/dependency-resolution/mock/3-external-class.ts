import { get } from "https";
import { Container } from "../../../src/container";

class A {
  constructor() {
    console.log("A");
  }
}

class B {
  constructor(public readonly a: A) {
    console.log("B");
  }
}

const container = new Container();

container
  .register<A>()
  .register<InstanceType<typeof B>>(async (get) => {
    return new B(await get<A>());
  })
  .get<B>();
