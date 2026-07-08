import { optimizeHandler } from "../server";

export default async function handler(req: any, res: any) {
  return optimizeHandler(req, res);
}
