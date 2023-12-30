import { describe, it, expect } from "bun:test";
import { buildAndTransform } from "../common";

describe("dependency resolution", () => {
  it("should inject class when defined class using interface", async () => {
    expect(
      await buildAndTransform(
        ["./tests/dependency-resolution/mock/1-interface-defined-class.ts"],
        "./tests/dependency-resolution/test",
        "1-interface-defined-class.js"
      )
    ).toEqual(
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/dependency-resolution/mock/1-interface-defined-class.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar container2 = new Container({\n  "78e48431": async (singletons, get) => {\n    {\n      return new B(await get("450d3380"));\n    }\n  },\n  "450d3380": async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n});\ncontainer2.register().register().get("78e48431");\n'
    );
  });

  it("should resolve dependencies when provide factory", async () => {
    expect(
      await buildAndTransform(
        ["./tests/dependency-resolution/mock/2-factory-get-dependency.ts"],
        "./tests/dependency-resolution/test",
        "2-factory-get-dependency.js"
      )
    ).toEqual(
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/dependency-resolution/mock/2-factory-get-dependency.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar container2 = new Container({\n  "78e48431": async (singletons, get) => {\n    {\n      return await (async (get2) => new B(await get2("450d3380")))(get);\n    }\n  },\n  "450d3380": async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n});\ncontainer2.register().register(async (get) => new B(await get())).get("78e48431");\n'
    );
  });

  it("should resolve dependencies when provide InstanceType", async () => {
    expect(
      await buildAndTransform(
        ["./tests/dependency-resolution/mock/3-external-class.ts"],
        "./tests/dependency-resolution/test",
        "3-external-class.js"
      )
    ).toEqual(
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/dependency-resolution/mock/3-external-class.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar container2 = new Container({\n  fd2d9496: async (singletons, get) => {\n    {\n      return await (async (get2) => {\n        return new B(await get2("c559563c"));\n      })(get);\n    }\n  },\n  c559563c: async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n});\ncontainer2.register().register(async (get) => {\n  return new B(await get());\n}).get("3847949c");\n'
    );
  });
});
