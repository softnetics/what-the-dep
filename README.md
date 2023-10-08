# whatthedep

Usage:

```typescript
import { container } from "../lib/di";
class Test0 {
  constructor(){}
}

class Test1 {
  constructor(private test0:Test0){}
}

container.registerSingleton<Test0>();
container.register<Test1>();

const test1 = await container.get<Test1>();
```
