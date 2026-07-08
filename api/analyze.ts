import { analyzeHandler } from "../server";

export default async function handler(req: any, res: any) {
  return analyzeHandler(req, res);
}
