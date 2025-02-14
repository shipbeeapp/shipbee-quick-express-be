import { Request, Response, NextFunction } from 'express';

const errorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
    // Handle database errors first
    if (error.code === '23505') {
        res.status(409).json({
            status: 409,
            message: `${error?.detail}`,
        });
    } 
    else if (error.code === '23502') {
        res.status(400).json({
            status: 400,
            message: "A required field is missing",
            errors: `Please enter a value for ${error?.column}`,
        });
    } 
    else if (error.code === '22P02') {
        res.status(400).json({
            status: 400,
            message: "Invalid input syntax",
            errors: error?.driverError?.message,
        });
    } 
    // Handle other generic errors
    else {
        res.status(error.status || 500).json({
            status: error.status || 500,
            message: error.message || 'Internal Server Error',
            errors: error.errors || [],
        });
    }
};

export default errorMiddleware;