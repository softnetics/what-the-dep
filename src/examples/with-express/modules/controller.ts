import { Users } from "@prisma/client";
import { Service } from "./service";
import { Request, Response } from "express";

export interface Controller {
  getUser(req: Request, res: Response): Promise<void>;
}

export class ControllerImpl implements Controller {
  constructor(private service: Service) {}
  async getUser(req: Request, res: Response) {
    res.json(await this.service.getUser());
    return;
  }
}
