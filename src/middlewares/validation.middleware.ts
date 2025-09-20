import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import HttpException from '../exceptions/http-exception.js';

// Core reusable validator
export async function validateObject<T extends object>(
  dtoClass: new () => T,
  obj: unknown,
  skipMissingProperties = false
): Promise<T> {
  const dtoInstance = plainToInstance(dtoClass, obj);
  const errors: ValidationError[] = await validate(dtoInstance, { skipMissingProperties, whitelist: true });

  if (errors.length > 0) {
    const e = errors.map(error => Object.values(error.constraints || {})).flat();
    throw new HttpException(400, e.join(', '));
  }

  return dtoInstance;
}

// Express middleware wrapper
const validateDto = (dtoClass: any, skipMissingProperties = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body && Object.keys(req.body).length > 0) {
        console.log("Validating request body:", req.body);
        req.body = await validateObject(dtoClass, req.body, skipMissingProperties);
      }
      if (req.query && Object.keys(req.query).length > 0) {
        console.log("Validating request query:", req.query);
        req.query = await validateObject(dtoClass, req.query, skipMissingProperties);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default validateDto;