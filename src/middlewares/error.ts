import { Request, Response, NextFunction } from "express";

const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // 🔥 Development (تفاصيل كاملة)
    if (process.env["NODE_ENV"] === "development") {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }


    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }


    return res.status(500).json({
        status: "error",
        message: "Something went wrong",
    });
};

export default globalErrorHandler;