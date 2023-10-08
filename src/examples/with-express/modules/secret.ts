export interface Secret {
  getSecret: () => string;
}

export class SecretImpl implements Secret {
  public getSecret(): string {
    return "file:./dev.db";
  }
}
