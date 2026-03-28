import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import Session from "../modules/User/session.schema";
import User from "../modules/User/user.schema";

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

    const session = await Session.findById(decoded.sessionId)
        .populate<{ userId: { status: string, banExpiresAt: Date } }>({
            path: "userId",
            select: "status banExpiresAt"
        });

    if (!session) return next(new ApiError(401, "Session expired. Please login again."));


    let status = session?.userId?.status;
    const banExpiresAt = session?.userId?.banExpiresAt;


    if (status === "banned" && banExpiresAt && banExpiresAt < new Date()) {
        const user = await User.findByIdAndUpdate({ _id: decoded.id }, {
            status: "active",
            banExpiresAt: null
        })

        status = "active";
    }

    if (status == "banned") return next(new ApiError(403, "your account has been banned"));

    req.user = decoded;
    next();
})

