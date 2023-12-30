import { Container } from "../../../src/container";

class A {
  constructor() {
    console.log("A");
  }
}

class B {
  constructor(private a: A) {
    console.log("B");
  }
}

const b = new Container().register<A>().register<B>().get<B>();
