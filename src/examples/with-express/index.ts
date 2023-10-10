import { container } from "../../lib/di";
import { Repo, RepoImpl } from "./modules/repo";
import { PrismaClient } from "@prisma/client";
import { Secret, SecretImpl } from "./modules/secret";
import { Controller, ControllerImpl } from "./modules/controller";
import { Service, ServiceImpl } from "./modules/service";
import express from "express";

container.registerSingleton<Secret, SecretImpl>();
container.register<PrismaClient, PrismaClient>(async (c) => {
  const secret = await c.get<Secret>();
  return new PrismaClient({
    datasourceUrl: secret.getSecret(),
  });
});

container.registerSingleton<Repo, RepoImpl>();

container.registerSingleton<Controller, ControllerImpl>();

container.registerSingleton<Service, ServiceImpl>();

const controller = await container.get<Controller>();

const app = express();

app.get("/", (req, res) => controller.getUser(req, res));

app.listen(3000, () => {
  console.log("listening on port 3000");
});
