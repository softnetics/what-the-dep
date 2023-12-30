import { Container } from "../../../src/container";

class A {
  constructor() {
    console.log("A");
  }
}

export class B {
  constructor(private a: A) {
    console.log("B");
  }
}

const container = new Container();

export const App = container.register<A>().register<B>();
