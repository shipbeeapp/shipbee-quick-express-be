import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import HttpException from '../exceptions/http-exception.js';


const validateDto = (dtoClass: any, skipMissingProperties = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);

    // Validate and strip out non-existing fields without raising an error
    const errors: ValidationError[] = await validate(dtoInstance, { skipMissingProperties, whitelist: true });

    // Only log errors for unexpected properties if needed, but don't return a response
    if (errors.length > 0) {
      console.log("errors:" ,JSON.stringify(errors, null, 2)); // Log the validation errors if you want to debug
      const e = errors.map(error => Object.values(error.constraints || {})).flat();
      const errorMessages = e.length ? e : errors.map(error => error.property + ' ' + error.children.map(child => Object.values(child.constraints))).flat();
    
        console.log("errorMessages: ", errorMessages);
        return next(new HttpException(400, errorMessages.join(', ')));

    }
    // Strip non-existing fields by reassigning only the valid fields
    req.body = dtoInstance;
    next();
  };
};

export default validateDto;