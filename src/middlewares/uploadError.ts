import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const uploadErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({
                status: "fail",
                message: "Image size must be less than 2MB"
            });

            return;
        }

        res.status(400).json({
            status: "fail",
            message: err.message
        });

        return;
    }

    if (err) {
        console.error("❌ Upload Error:", err);

        res.status(502).json({
            status: "error",
            message: "Image upload failed. Please try again."
        });

        return;
    }

    next();
};