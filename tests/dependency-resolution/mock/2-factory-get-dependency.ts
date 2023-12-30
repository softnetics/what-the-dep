import { get } from "https";
import { Container } from "../../../src/container";

interface IB {
  a: A;
}

interface IA {}

class A implements IA {
  constructor() {
    console.log("A");
  }
}

class B implements IB {
  constructor(public readonly a: A) {
    console.log("B");
  }
}

const container = new Container();

container
  .register<IA, A>()
  .register<IB, B>(async (get) => new B(await get<IA>()))
  .get<IB>();
