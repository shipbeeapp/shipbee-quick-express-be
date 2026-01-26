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
    console.log("Validation failed. Errors: ", JSON.stringify(errors, null, 2));
    console.log()
    const e = extractErrorMessages(errors);
    console.log("Extracted error messages:", e);
    // console.log("Validation errors:", e.map(err => err.children.map((c: any) => c.constraints)).flat());
    throw new HttpException(400, e.join(', '));
  }

  return dtoInstance;
}

// Express middleware wrapper
const validateDto = (dtoClass: any, skipMissingProperties = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.fromAddress && typeof req.body.fromAddress === "string") {
        try {
          req.body.fromAddress = JSON.parse(req.body.fromAddress);
        } catch (err) {
           res.status(400).json({ 
            success: false, 
            message: "Invalid JSON format for 'stops'" 
          });
        }
      }
        if (req.body.stops && typeof req.body.stops === "string") {
          try {
            const parsedStops = JSON.parse(req.body.stops);
            req.body.stops = Array.isArray(parsedStops) ? parsedStops : [parsedStops]; // ✅ wrap single object in array
          } catch (err) {
             res.status(400).json({ 
              success: false, 
              message: "Invalid JSON format for 'stops'" 
            });
          }
        }
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

function extractErrorMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    // If field has constraints (real validation errors)
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    // If nested validation errors (children)
    if (error.children && error.children.length > 0) {
      messages.push(...extractErrorMessages(error.children));
    }
  }

  return messages;
}

export default validateDto;