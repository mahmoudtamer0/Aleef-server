import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";

const validate = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return next(new ApiError(400, error.details[0].message));
        }
        next();
    };
};

export default validate;