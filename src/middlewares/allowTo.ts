import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import { Role } from "../types/express";
import { User } from "../types/user";

export const allowTo = (...roles: Role[]) => {

    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as User;
        if (!user) {
            return next(new ApiError(401, "Unauthorized"));
        }

        if (!roles.includes(user.role)) {
            return next(new ApiError(403, "you are not allowed for this action, please contact the admin"));
        }

        next()
    }
}
