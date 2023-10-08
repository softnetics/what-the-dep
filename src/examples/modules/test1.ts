import { ITest0 } from "./test0";

export interface ITest1 {
  gogo: string;
}

export class Test1 implements ITest1 {
  gogo = "gogo";
  constructor(private test0: ITest0) {
    console.log("test1 init", this.test0);
  }
}
