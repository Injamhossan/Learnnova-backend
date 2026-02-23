import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError, ZodIssue } from 'zod';

export const validate = (schema: ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return next(error);
    }
  };
