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
