import { Users } from "@prisma/client";
import { Repo } from "./repo";

export interface Service {
  getUser(): Promise<Users[]>;
}

export class ServiceImpl implements Service {
  constructor(private repo: Repo) {}

  getUser() {
    return this.repo.getUsers();
  }
}
