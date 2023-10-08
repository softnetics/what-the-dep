import { PrismaClient, Users } from "@prisma/client";

export interface Repo {
  getUsers(): Promise<Users[]>;
}

export class RepoImpl implements Repo {
  constructor(private prismaClient: PrismaClient) {
    console.log("prismaClient", this.prismaClient);
  }

  getUsers() {
    return this.prismaClient.users.findMany();
  }
}
