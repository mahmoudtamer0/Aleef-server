import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";
import { Request } from "express";
import { FileFilterCallback } from "multer";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: "aleef/users",
            format: undefined,
            public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
        }
    }
});

export const upload = multer({
    storage: storage,

    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, WEBP are allowed"));
        }
        cb(null, true);
    }
});



