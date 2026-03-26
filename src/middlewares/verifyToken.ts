import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import Session from "../modules/User/session.schema";

export const verifyToken = catchAsync(async (req, res, next) => {

    const headers = req.headers["authorization"]

    if (!headers || !headers.startsWith("Bearer ")) {
        return next(new ApiError(401, "No token provided"));
    }

    const token = headers.split(" ")[1]

    let decoded: any;
    const jwtSecretKey = process.env["JWT_SECRET"]

    try {
        if (!token) return next(new ApiError(401, "Session expired. Please login again."));
        if (!jwtSecretKey) return next(new ApiError(401, "Session expired. Please login again."));

        decoded = jwt.verify(token, jwtSecretKey);
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            return next(new ApiError(401, "Session expired. Please login again."));
        }
        return next(new ApiError(401, "Session expired. Please login again."));
    }

    const session = await Session.findOne({ _id: decoded.sessionId })

    if (!session) return next(new ApiError(401, "Session expired. Please login again."));

    (req as any).user = decoded;
    next();
})

