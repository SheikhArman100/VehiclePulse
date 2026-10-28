import type { Request, Response, NextFunction, RequestHandler } from "express";

export function catchAsync(fn: RequestHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
