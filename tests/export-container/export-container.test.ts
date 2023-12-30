import { describe, it, expect } from "bun:test";
import { buildAndTransform } from "../common";

describe("export container", () => {
  it("should resolve get when export a container", async () => {
    expect(
      await buildAndTransform(
        ["./tests/export-container/mock/1-export-container.ts"],
        "./tests/export-container/test",
        "1-export-container.js"
      )
    ).toEqual(
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/export-container/mock/1-export-container-container.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar container2 = new Container({\n  "430e5895": async (singletons, get) => {\n    {\n      return new B(await get("c559563c"));\n    }\n  },\n  c559563c: async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n});\nvar App = container2.register().register();\n\n// tests/export-container/mock/1-export-container.ts\nconsole.log(App.get("430e5895"));\n'
    );
  });
});
