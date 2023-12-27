type Factory<T, C> = (c: T) => C | Promise<C>;

export class Container<Member = never> {
  private memo: Record<string, Member> = {};
  private singletonsInitialized = false;
  constructor(
    // compile time generated context
    private context: Record<
      string | "init_singletons",
      (memo: Record<string, unknown>, get: (c: string) => unknown) => Member
    > = {}
  ) {}

  import<ImportedContainer>(): ImportedContainer extends Container<
    infer ImportedMember
  >
    ? Container<Member | ImportedMember>
    : never {
    return this as any;
  }

  register<Interface, Class = Interface>(
    factory: Factory<typeof this.get, Class> = () => ({} as Class)
  ): Container<Member | Interface> {
    return this;
  }
  registerSingleton<Interface, Class = Interface>(
    factory: Factory<typeof this.get, Class> = () => ({} as Class)
  ): Container<Member | Interface> {
    return this;
  }
  async get<InterfaceOrClass extends Member>(
    interfaceHash: string = ""
  ): Promise<InterfaceOrClass> {
    if (!this.singletonsInitialized) {
      this.singletonsInitialized = true;
      if (!this.context["init_singletons"]) {
        throw new Error(
          "what-the-dep is not running correctly, please check your bunfig.toml and make sure it is preload what-the-dep plugin"
        );
      }
      this.context["init_singletons"](this.memo, this.get.bind(this));
    }
    if (this.context[interfaceHash]) {
      // runtime call
      return this.context[interfaceHash](
        this.memo,
        this.get.bind(this)
      ) as InterfaceOrClass;
    }
    return {} as InterfaceOrClass;
  }

  static __WTD_MODULE__ = true;
}
