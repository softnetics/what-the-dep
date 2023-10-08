export interface ITest0 {
  hello: number;
}

export class Test0 implements ITest0 {
  hello: number;
  constructor() {
    this.hello = Math.random();
    console.log("test0 init", this.hello);
  }
}
