# what-the-dep

compile time async dependency injection plugin

## Installation

```
bun install @softnetics/what-the-dep
```

Then create a preload file in your project

```typescript
// preload.ts
import { whatTheDep } from "@softnetics/what-the-dep";
import { plugin } from "bun";

plugin(whatTheDep());
```

and add a preload into your `bunfig.toml`

```toml
preload = ["./preload.ts"]
```

## Features

- [x] Compile time dependency injection
- [x] Async dependency initialization
- [x] Circular dependency detection
- [ ] Circular dependency resolution
- [ ] Import dependency from other modules

## Usage

```typescript
import { Container } from "@softnetics/what-the-dep";

const container = new Container();

class A {
  constructor(public b: B) {}
}

class B {
  constructor() {}
}

container.register<A>().register<B>();

const a = await container.get<A>();
```

Initialize class with a factory

```typescript
import { Container } from "@softnetics/what-the-dep";

const container = new Container();

class A {
  constructor(public b: B) {}
}

class B {
  constructor() {}
}

container.register<B>().register<A>(async (get) => {
  const b = await get<B>();
  return new A(b);
});

const a = await container.get<A>();
```

Reference to class using an interface

```typescript
import { Container } from "@softnetics/what-the-dep";

const container = new Container();

interface IA {
  b: B;
}

class A implements IA {
  constructor(public b: B) {}
}

class B {
  constructor() {}
}

container.register<B>().register<IA, A>(async (get) => {
  const b = await get<B>();
  return new A(b);
});

const a = await container.get<IA>();
```
