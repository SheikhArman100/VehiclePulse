import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodEffects } from "zod";

type SchemaType = AnyZodObject | ZodEffects<AnyZodObject>;

export const validateRequest =
  (schema: SchemaType) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      return next();
    } catch (error) {
      next(error);
    }
  };
