import { describe, it, expect } from "bun:test";
import { buildAndTransform } from "../common";

describe("container resolution", () => {
  it("should update context when init container before register", async () => {
    expect(
      await buildAndTransform(
        [
          "./tests/container-resolution/mock/1-init-container-before-register.ts",
        ],
        "./tests/container-resolution/test",
        "1-init-container-before-register.js"
      )
    ).toEqual(
      // snapshot
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/container-resolution/mock/1-init-container-before-register.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar container2 = new Container({\n  "155ad188": async (singletons, get) => {\n    {\n      return new B(await get("c559563c"));\n    }\n  },\n  c559563c: async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n});\ncontainer2.register().register().get("155ad188");\n'
    );
  });

  it("should update context when register directly from new", async () => {
    expect(
      await buildAndTransform(
        ["./tests/container-resolution/mock/2-register-directly-from-new.ts"],
        "./tests/container-resolution/test",
        "2-register-directly-from-new.js"
      )
    ).toEqual(
      // snapshot
      '// @bun\n// src/container.ts\nclass Container {\n  context;\n  memo = {};\n  singletonsInitialized = false;\n  constructor(context = {}) {\n    this.context = context;\n  }\n  import() {\n    return this;\n  }\n  register(factory = () => ({})) {\n    return this;\n  }\n  registerSingleton(factory = () => ({})) {\n    return this;\n  }\n  async get(interfaceHash = "") {\n    if (!this.singletonsInitialized) {\n      this.singletonsInitialized = true;\n      if (!this.context["init_singletons"]) {\n        throw new Error("what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin");\n      }\n      this.context["init_singletons"](this.memo, this.get.bind(this));\n    }\n    if (this.context[interfaceHash]) {\n      return this.context[interfaceHash](this.memo, this.get.bind(this));\n    }\n    return {};\n  }\n  static __WTD_MODULE__ = true;\n}\n\n// tests/container-resolution/mock/2-register-directly-from-new.ts\nclass A {\n  constructor() {\n    console.log("A");\n  }\n}\n\nclass B {\n  a;\n  constructor(a) {\n    this.a = a;\n    console.log("B");\n  }\n}\nvar b = new Container({\n  "155ad188": async (singletons, get) => {\n    {\n      return new B(await get("c559563c"));\n    }\n  },\n  c559563c: async (singletons, get) => {\n    {\n      return new A;\n    }\n  },\n  init_singletons: async (singletons, get) => {\n    {\n    }\n  }\n}).register().register().get("155ad188");\n'
    );
  });
});
